import {
  CONTENT_VERSION,
  PACKAGE_VERSION,
  RULES_VERSION,
  SCHEMA_VERSION,
  SYSTEM_ID,
} from "./config";

interface SettingDefinition {
  key: string;
  scope: "world" | "user" | "client";
  config: boolean;
  type:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | ObjectConstructor;
  default: unknown;
  choices?: Record<string, string>;
}

const WORLD_SETTINGS: SettingDefinition[] = [
  {
    key: "automation.level",
    scope: "world",
    config: true,
    type: String,
    default: "assisted",
    choices: {
      advisory: "Conseil",
      assisted: "Assisté",
      boundedAutomatic: "Automatique borné",
    },
  },
  {
    key: "operations.confirmSensitive",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "operations.allowPlayerRequests",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "assistants.persistDrafts",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "assistants.retentionDays",
    scope: "world",
    config: false,
    type: Number,
    default: 30,
  },
  {
    key: "generators.implicitLocks",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "macros.allowScriptMacros",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },
  {
    key: "imports.allowPlayerBundles",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },
  {
    key: "notifications.persistWarnings",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "adapters.policy",
    scope: "world",
    config: false,
    type: String,
    default: "disabled",
  },
  {
    key: "diagnostics.enabled",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },
  {
    key: "diagnostics.logLevel",
    scope: "world",
    config: false,
    type: String,
    default: "warning",
  },
];

const USER_SETTINGS: SettingDefinition[] = [
  {
    key: "xirea.adviceLevel",
    scope: "user",
    config: true,
    type: String,
    default: "contextual",
    choices: {
      silent: "Silencieux",
      contextual: "Contextuel",
      detailed: "Détaillé",
    },
  },
  {
    key: "ui.defaultDashboard",
    scope: "user",
    config: false,
    type: String,
    default: "personal",
  },
  {
    key: "notifications.verbosity",
    scope: "user",
    config: false,
    type: String,
    default: "normal",
  },
  {
    key: "operations.confirmRoutine",
    scope: "user",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "browsers.viewMode",
    scope: "user",
    config: false,
    type: String,
    default: "list",
  },
  {
    key: "browsers.rememberFilters",
    scope: "user",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "search.includeCompendiums",
    scope: "user",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "chat.expandRollDetails",
    scope: "user",
    config: false,
    type: Boolean,
    default: false,
  },
];

const CLIENT_SETTINGS: SettingDefinition[] = [
  {
    key: "ui.density",
    scope: "client",
    config: true,
    type: String,
    default: "comfortable",
    choices: { comfortable: "Confortable", compact: "Compacte" },
  },
  {
    key: "ui.textScale",
    scope: "client",
    config: true,
    type: Number,
    default: 1,
  },
  {
    key: "ui.highContrast",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  },
  {
    key: "ui.reduceMotion",
    scope: "client",
    config: true,
    type: Boolean,
    default:
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false,
  },
  {
    key: "ui.soundCues",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "ui.restoreWindows",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
  },
  {
    key: "performance.listVirtualization",
    scope: "client",
    config: false,
    type: String,
    default: "auto",
  },
  {
    key: "media.autoplayAudio",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  },
];

const HIDDEN_SETTINGS: SettingDefinition[] = [
  {
    key: "versions.schema",
    scope: "world",
    config: false,
    type: String,
    default: SCHEMA_VERSION,
  },
  {
    key: "versions.rules",
    scope: "world",
    config: false,
    type: String,
    default: RULES_VERSION,
  },
  {
    key: "versions.content",
    scope: "world",
    config: false,
    type: String,
    default: CONTENT_VERSION,
  },
  {
    key: "migrations.state",
    scope: "world",
    config: false,
    type: Object,
    default: {
      packageVersion: PACKAGE_VERSION,
      state: "idle",
      lastMigrationId: null,
      errors: [],
    },
  },
];

export const SETTING_DEFINITIONS = [
  ...WORLD_SETTINGS,
  ...USER_SETTINGS,
  ...CLIENT_SETTINGS,
  ...HIDDEN_SETTINGS,
];

export function registerSettings(): void {
  for (const definition of SETTING_DEFINITIONS) {
    game.settings.register(SYSTEM_ID, definition.key, {
      name: `RE:LIS — ${definition.key}`,
      hint: `Paramètre initial gelé par 10-B11 : ${definition.key}`,
      scope: definition.scope,
      config: definition.config,
      type: definition.type,
      default: definition.default,
      ...(definition.choices ? { choices: definition.choices } : {}),
    });
  }
}
