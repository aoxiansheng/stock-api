export interface IntEnvRange {
  min: number;
  max: number;
}

export const readIntEnv = (
  key: string,
  defaultValue: number,
  { min, max }: IntEnvRange,
): number => {
  const raw = process.env[key];
  if (raw === undefined) {
    return defaultValue;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return defaultValue;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return defaultValue;
  }

  if (parsed < min || parsed > max) {
    return defaultValue;
  }

  return parsed;
};
