export function normalizeTrimmedString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function normalizeLowercaseString(value: unknown): string {
  return normalizeTrimmedString(value).toLowerCase();
}

export function normalizeUppercaseString(value: unknown): string {
  return normalizeTrimmedString(value).toUpperCase();
}

export function normalizeOptionalLowercaseString(
  value: unknown,
): string | undefined {
  const normalizedValue = normalizeLowercaseString(value);
  return normalizedValue || undefined;
}
