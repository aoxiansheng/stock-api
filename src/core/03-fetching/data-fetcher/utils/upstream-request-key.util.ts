function stableSortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableSortObject(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const currentValue = (value as Record<string, unknown>)[key];
        if (currentValue === undefined) {
          return acc;
        }
        acc[key] = stableSortObject(currentValue);
        return acc;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableSortObject(value));
}

export function buildUpstreamQueueKey(provider: string, capability: string): string {
  return `${String(provider || "").trim().toLowerCase()}:${String(capability || "").trim().toLowerCase()}`;
}

export function buildUpstreamMergeKey(
  provider: string,
  capability: string,
  signature: Record<string, unknown>,
): string {
  return stableStringify({
    provider: String(provider || "").trim().toLowerCase(),
    capability: String(capability || "").trim().toLowerCase(),
    signature,
  });
}
