export interface ProviderPriorityCacheEntry {
  signature: string;
  order: readonly string[];
}

export class ProviderPriorityPolicyCache {
  private readonly entries = new Map<string, ProviderPriorityCacheEntry>();

  get(capabilityEnvKey: string, signature: string): string[] | null {
    const entry = this.entries.get(capabilityEnvKey);
    if (!entry || entry.signature !== signature) {
      return null;
    }
    return [...entry.order];
  }

  set(capabilityEnvKey: string, signature: string, order: string[]): void {
    this.entries.set(capabilityEnvKey, {
      signature,
      order: Object.freeze([...order]),
    });
  }

  clear(): void {
    this.entries.clear();
  }
}
