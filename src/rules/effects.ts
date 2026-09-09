interface LocalizationService {
  localize(key: string): string;
  format(key: string, data: Record<string, unknown>): string;
}

export interface ConditionPresentation {
  label: string;
  description: string;
}

function localizedOrFallback(
  i18n: LocalizationService,
  key: string,
  fallback: string,
): string {
  const localized = i18n.localize(key);
  return localized === key ? fallback : localized;
}

export function presentCondition(
  conditionKey: string,
  i18n: LocalizationService,
): ConditionPresentation {
  const root = `RELIS.Condition.${conditionKey}`;
  return {
    label: localizedOrFallback(i18n, `${root}.Name`, conditionKey),
    description: localizedOrFallback(i18n, `${root}.Description`, conditionKey),
  };
}

export function formatRoundDuration(
  value: unknown,
  i18n: LocalizationService,
): string {
  const rounds = Math.max(0, Math.ceil(Number(value) || 0));
  const key =
    rounds === 1 ? "RELIS.Duration.OneRound" : "RELIS.Duration.ManyRounds";
  return i18n.format(key, { rounds });
}
