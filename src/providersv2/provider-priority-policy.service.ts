import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { ACTIVE_PROVIDER_MANIFEST } from "./provider-id.constants";
import {
  ProviderPriorityPolicyCache,
  type ProviderPriorityResolution,
} from "./provider-priority-policy.cache";

const DEFAULT_PRIORITY_ENV_KEY = "PROVIDER_PRIORITY_DEFAULT";
const CAPABILITY_PRIORITY_ENV_KEY_PREFIX = "PROVIDER_PRIORITY_";

@Injectable()
export class ProviderPriorityPolicyService {
  private readonly logger = createLogger("ProviderPriorityPolicyService");
  private readonly registeredProviders: readonly string[] = ACTIVE_PROVIDER_MANIFEST.map(
    (entry) => entry.id,
  );
  private readonly registeredProviderSet = new Set<string>(
    this.registeredProviders,
  );
  private readonly orderCache = new ProviderPriorityPolicyCache();

  getOrderForCapability(capabilityName: string): string[] {
    return [...this.resolveOrderForCapability(capabilityName).order];
  }

  resolveOrderForCapability(capabilityName: string): ProviderPriorityResolution {
    const capabilityEnvKey = this.buildCapabilityPriorityEnvKey(capabilityName);
    const cacheSignature = this.buildCacheSignature(capabilityEnvKey);
    const cachedOrder = this.orderCache.get(capabilityEnvKey, cacheSignature);
    if (cachedOrder) {
      return this.cloneResolution(cachedOrder);
    }

    const capabilityOrder = this.parseConfiguredOrder(capabilityEnvKey);
    if (capabilityOrder.length > 0) {
      const resolved = this.buildResolution(
        this.appendMissingRegisteredProviders(capabilityOrder),
        "capability",
      );
      this.orderCache.set(capabilityEnvKey, cacheSignature, resolved);
      return this.cloneResolution(resolved);
    }

    const defaultOrder = this.parseConfiguredOrder(DEFAULT_PRIORITY_ENV_KEY);
    if (defaultOrder.length > 0) {
      const resolved = this.buildResolution(
        this.appendMissingRegisteredProviders(defaultOrder),
        "default",
      );
      this.orderCache.set(capabilityEnvKey, cacheSignature, resolved);
      return this.cloneResolution(resolved);
    }

    const fallbackOrder = this.buildResolution(
      [...this.registeredProviders],
      "registration",
    );
    this.orderCache.set(capabilityEnvKey, cacheSignature, fallbackOrder);
    return this.cloneResolution(fallbackOrder);
  }

  rankCandidates(capabilityName: string, candidates: string[]): string[] {
    const normalizedCandidates = this.normalizeAndDedupe(candidates);
    if (normalizedCandidates.length <= 1) {
      return normalizedCandidates;
    }

    const configuredOrder = this.resolveOrderForCapability(capabilityName).order;
    const orderIndex = new Map(
      configuredOrder.map((provider, index) => [provider, index]),
    );
    const inputIndex = new Map(
      normalizedCandidates.map((provider, index) => [provider, index]),
    );

    return [...normalizedCandidates].sort((a, b) => {
      const aConfiguredIndex = orderIndex.get(a);
      const bConfiguredIndex = orderIndex.get(b);

      const aRank = aConfiguredIndex === undefined ? Number.MAX_SAFE_INTEGER : aConfiguredIndex;
      const bRank = bConfiguredIndex === undefined ? Number.MAX_SAFE_INTEGER : bConfiguredIndex;
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return (inputIndex.get(a) ?? 0) - (inputIndex.get(b) ?? 0);
    });
  }

  private appendMissingRegisteredProviders(baseOrder: string[]): string[] {
    const order = [...baseOrder];
    for (const provider of this.registeredProviders) {
      if (!order.includes(provider)) {
        order.push(provider);
      }
    }
    return order;
  }

  private parseConfiguredOrder(envKey: string): string[] {
    const rawValue = process.env[envKey];
    if (rawValue == null) {
      return [];
    }

    const configuredProviders = this.normalizeAndDedupe(rawValue.split(","));
    const acceptedProviders: string[] = [];

    for (const provider of configuredProviders) {
      if (!this.registeredProviderSet.has(provider)) {
        this.logger.warn("Provider 优先级配置包含未知 provider，已忽略", {
          envKey,
          provider,
        });
        continue;
      }
      acceptedProviders.push(provider);
    }

    if (rawValue.trim() && acceptedProviders.length === 0) {
      this.logger.warn("Provider 优先级配置为空或全部无效，将回退", {
        envKey,
      });
    }

    return acceptedProviders;
  }

  private normalizeAndDedupe(values: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const normalized = this.normalizeProviderName(value);
      if (!normalized) {
        continue;
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      result.push(normalized);
    }

    return result;
  }

  private normalizeProviderName(providerName: string): string {
    return String(providerName || "").trim().toLowerCase();
  }

  private buildCacheSignature(capabilityEnvKey: string): string {
    return [
      process.env[DEFAULT_PRIORITY_ENV_KEY] || "",
      process.env[capabilityEnvKey] || "",
      this.registeredProviders.join(","),
    ].join("|");
  }

  private buildCapabilityPriorityEnvKey(capabilityName: string): string {
    const capabilityKey = String(capabilityName || "")
      .trim()
      .toUpperCase()
      .replace(/-/g, "_")
      .replace(/[^A-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return `${CAPABILITY_PRIORITY_ENV_KEY_PREFIX}${capabilityKey}`;
  }

  private buildResolution(
    order: string[],
    source: ProviderPriorityResolution["source"],
  ): ProviderPriorityResolution {
    return {
      order: [...order],
      source,
    };
  }

  private cloneResolution(
    resolution: ProviderPriorityResolution,
  ): ProviderPriorityResolution {
    return {
      order: [...resolution.order],
      source: resolution.source,
    };
  }
}
