export type ProviderPriorityOrderSource = "capability" | "default" | "registration";

export interface ProviderPriorityResolution {
  order: readonly string[];
  source: ProviderPriorityOrderSource;
}

export interface ProviderPriorityCacheEntry {
  signature: string;
  resolution: ProviderPriorityResolution;
}

export class ProviderPriorityPolicyCache {
  private readonly entries = new Map<string, ProviderPriorityCacheEntry>();

  get(
    capabilityEnvKey: string,
    signature: string,
  ): ProviderPriorityResolution | null {
    const entry = this.entries.get(capabilityEnvKey);
    if (!entry || entry.signature !== signature) {
      return null;
    }
    return {
      order: [...entry.resolution.order],
      source: entry.resolution.source,
    };
  }

  set(
    capabilityEnvKey: string,
    signature: string,
    resolution: ProviderPriorityResolution,
  ): void {
    this.entries.set(capabilityEnvKey, {
      signature,
      resolution: {
        order: Object.freeze([...resolution.order]),
        source: resolution.source,
      },
    });
  }

  clear(): void {
    this.entries.clear();
  }
}
