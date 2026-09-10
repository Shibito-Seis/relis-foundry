export interface InitialReference {
  relisId: string;
  uuid: string;
  documentName: string;
  type: string;
  state: string;
  labelSnapshot: string;
  missingPolicy: string;
}

export function initialReference(): InitialReference {
  return {
    relisId: "",
    uuid: "",
    documentName: "",
    type: "",
    state: "unresolved",
    labelSnapshot: "",
    missingPolicy: "diagnose",
  };
}

export function initialBody(): Record<string, unknown> {
  return {
    id: "primary",
    name: "Corps principal",
    nature: "biological",
    architecture: "",
    size: "medium",
    criticalFunctions: [],
    locations: [
      {
        id: "core",
        sort: 0,
        status: "active",
        value: "Zone centrale",
        visibility: "document",
      },
    ],
    needs: [],
    integratedItemRefs: [],
  };
}

export function initialPresentation(): Record<string, unknown> {
  return {
    id: "identity",
    name: "Portrait identitaire",
    category: "identity",
    portrait: {
      path: "",
      kind: "portrait",
      alt: "",
      caption: "",
      source: "",
      visibility: "document",
    },
    token: {
      path: "",
      kind: "token",
      alt: "",
      caption: "",
      source: "",
      visibility: "document",
    },
    bodyIds: ["primary"],
    availability: "available",
    sourceRef: initialReference(),
    associatedPresentationId: "",
    active: true,
    favorite: true,
    notes: "",
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBody(value: unknown): Record<string, unknown> {
  const fallback = initialBody();
  const body = isRecord(value) ? value : {};
  const locations =
    Array.isArray(body.locations) && body.locations.length > 0
      ? body.locations
      : fallback.locations;

  return {
    ...fallback,
    ...body,
    criticalFunctions: Array.isArray(body.criticalFunctions)
      ? body.criticalFunctions
      : [],
    locations,
    needs: Array.isArray(body.needs) ? body.needs : [],
    integratedItemRefs: Array.isArray(body.integratedItemRefs)
      ? body.integratedItemRefs
      : [],
  };
}

function normalizePresentation(value: unknown): Record<string, unknown> {
  const fallback = initialPresentation();
  const presentation = isRecord(value) ? value : {};
  const fallbackPortrait = fallback.portrait as Record<string, unknown>;
  const fallbackToken = fallback.token as Record<string, unknown>;
  const fallbackSourceRef = fallback.sourceRef as Record<string, unknown>;

  return {
    ...fallback,
    ...presentation,
    portrait: {
      ...fallbackPortrait,
      ...(isRecord(presentation.portrait) ? presentation.portrait : {}),
    },
    token: {
      ...fallbackToken,
      ...(isRecord(presentation.token) ? presentation.token : {}),
    },
    bodyIds: Array.isArray(presentation.bodyIds)
      ? presentation.bodyIds
      : ["primary"],
    sourceRef: {
      ...fallbackSourceRef,
      ...(isRecord(presentation.sourceRef) ? presentation.sourceRef : {}),
    },
    associatedPresentationId:
      typeof presentation.associatedPresentationId === "string"
        ? presentation.associatedPresentationId
        : "",
  };
}

export function normalizePersonSource(
  source: Record<string, any>,
): Record<string, any> {
  source.bodies =
    Array.isArray(source.bodies) && source.bodies.length > 0
      ? source.bodies.map(normalizeBody)
      : [initialBody()];
  source.activeBodyId =
    typeof source.activeBodyId === "string" && source.activeBodyId.length > 0
      ? source.activeBodyId
      : String(source.bodies[0]?.id ?? "primary");
  source.presentations =
    Array.isArray(source.presentations) && source.presentations.length > 0
      ? source.presentations.map(normalizePresentation)
      : [initialPresentation()];
  return source;
}
