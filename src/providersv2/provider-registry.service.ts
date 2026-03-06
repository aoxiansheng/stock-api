import { Injectable, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { createLogger } from "@common/logging/index";
import {
  PROVIDER_PRIORITIES,
  DEFAULT_PROVIDER_PRIORITY,
} from "./provider-priority.constants";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_NAME_ALIASES,
  type ProviderManifestEntry,
} from "./provider-id.constants";
import type { ProviderId } from "./provider-id.constants";
import { ICapability } from "./providers/interfaces/capability.interface";
import { IDataProvider } from "./providers/interfaces/provider.interface";

export interface CapabilityMeta {
  capability: ICapability;
  priority: number;
  isEnabled: boolean;
}

/**
 * ProviderRegistryService（极简版）
 * - 单一职责：显式注册已注入的 Provider，并提供查询/选择能力
 * - 不包含：装饰器采集、文件扫描、统计、自动修复等任何复杂逻辑
 */
@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = createLogger("ProviderRegistryService");

  private readonly providers = new Map<string, IDataProvider>();
  private readonly capabilities = new Map<string, Map<string, CapabilityMeta>>();
  // 向后兼容历史命名，统一解析到标准 provider 名称
  private readonly providerAliases = new Map<string, string>(
    Object.entries(PROVIDER_NAME_ALIASES),
  );
  private initialized = false;

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit(): Promise<void> {
    if (this.initialized) return;
    this.assertModuleRefAvailable();

    const injectedProviders = this.resolveInjectedProvidersFromManifest();

    this.assertAllProvidersHavePriority(injectedProviders);
    this.assertNoPriorityConflicts(injectedProviders);

    for (const provider of injectedProviders) {
      const priority = this.resolveProviderPriority(provider.name);
      this.registerProvider(provider, priority);
    }

    this.initialized = true;
    this.logger.log("ProviderRegistryService 初始化完成", {
      providers: this.providers.size,
      capabilities: Array.from(this.capabilities.values()).reduce(
        (sum, m) => sum + m.size,
        0,
      ),
    });
  }

  private resolveInjectedProvidersFromManifest(): IDataProvider[] {
    const resolvedProviders: IDataProvider[] = [];

    for (const entry of ACTIVE_PROVIDER_MANIFEST) {
      const logContext = this.buildManifestLogContext(entry);
      try {
        const provider = this.moduleRef.get<IDataProvider>(entry.providerToken, {
          strict: false,
        });
        if (provider == null) {
          this.logger.warn("Provider 解析为空，跳过注册", logContext);
          continue;
        }

        resolvedProviders.push(provider);
      } catch (error) {
        const errorContext = {
          ...logContext,
          errorName: this.getErrorName(error),
          errorMessage: this.getErrorMessage(error),
        };
        if (this.isMissingProviderError(error)) {
          this.logger.warn("Provider 未注册或找不到，跳过注册", errorContext);
          continue;
        }

        this.logger.error("Provider 注入出现非预期异常，终止初始化", errorContext);
        throw error;
      }
    }

    return resolvedProviders;
  }

  private assertModuleRefAvailable(): void {
    if (this.moduleRef) {
      return;
    }
    throw new Error(
      "ProviderRegistryService 初始化失败: ModuleRef 未注入，请在测试中显式传入 ModuleRef mock",
    );
  }

  private buildManifestLogContext(entry: ProviderManifestEntry) {
    return {
      id: entry.id,
      key: entry.key,
      providerToken: this.resolveProviderTokenName(entry.providerToken),
    };
  }

  private resolveProviderTokenName(providerToken: ProviderManifestEntry["providerToken"]):
    string {
    if (typeof providerToken === "function" && providerToken.name) {
      return providerToken.name;
    }
    return String(providerToken);
  }

  private isMissingProviderError(error: unknown): boolean {
    if (this.getErrorName(error) === "UnknownElementException") {
      return true;
    }

    const normalizedMessage = this.getErrorMessage(error).toLowerCase();
    return (
      normalizedMessage.includes("could not find") ||
      normalizedMessage.includes("unknown element")
    );
  }

  private getErrorName(error: unknown): string {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      typeof error.name === "string"
    ) {
      return error.name;
    }
    return "UnknownError";
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return String(error);
  }

  private ensureProviderMaps(providerName: string) {
    if (!this.capabilities.has(providerName)) {
      this.capabilities.set(providerName, new Map());
    }
  }

  private registerProvider(
    provider: IDataProvider,
    priority = DEFAULT_PROVIDER_PRIORITY,
  ): void {
    if (!provider || !provider.name) return;
    const providerName = this.normalizeProviderName(provider.name);

    this.providers.set(providerName, provider);
    this.ensureProviderMaps(providerName);

    for (const cap of provider.capabilities || []) {
      this.capabilities.get(providerName)!.set(cap.name, {
        capability: cap,
        priority,
        isEnabled: true,
      });
    }

    this.logger.debug("Provider 已注册", {
      provider: providerName,
      capabilities: provider.capabilities?.length || 0,
      priority,
    });
  }

  private resolveProviderPriority(providerName: string): number {
    const normalizedProviderName = this.normalizeProviderName(providerName);
    if (!(normalizedProviderName in PROVIDER_PRIORITIES)) {
      throw new Error(`Provider 优先级缺失: provider=${normalizedProviderName}`);
    }
    return PROVIDER_PRIORITIES[normalizedProviderName as ProviderId];
  }

  private normalizeProviderName(providerName: string): string {
    const normalizedName = String(providerName || "").trim().toLowerCase();
    return this.providerAliases.get(normalizedName) || normalizedName;
  }

  private assertNoPriorityConflicts(providers: IDataProvider[]): void {
    const priorityOwner = new Map<number, string>();

    for (const provider of providers) {
      const providerName = this.normalizeProviderName(provider.name);
      const priority = this.resolveProviderPriority(providerName);
      const owner = priorityOwner.get(priority);
      if (owner && owner !== providerName) {
        const conflictProviders = [owner, providerName].sort((a, b) =>
          a.localeCompare(b),
        );
        const message = `Provider 优先级冲突: priority=${priority}, providers=[${conflictProviders.join(", ")}]`;
        this.logger.error("Provider 优先级冲突", {
          priority,
          providers: conflictProviders,
        });
        throw new Error(message);
      }
      priorityOwner.set(priority, providerName);
    }
  }

  private assertAllProvidersHavePriority(providers: IDataProvider[]): void {
    const missingProviders = providers
      .map((provider) => this.normalizeProviderName(provider.name))
      .filter((providerName) => !(providerName in PROVIDER_PRIORITIES));

    if (missingProviders.length === 0) {
      return;
    }

    const uniqueSortedProviders = Array.from(new Set(missingProviders)).sort((a, b) =>
      a.localeCompare(b),
    );
    const message = `Provider 优先级缺失: providers=[${uniqueSortedProviders.join(", ")}]`;
    this.logger.error("Provider 优先级缺失", {
      providers: uniqueSortedProviders,
    });
    throw new Error(message);
  }

  // ============= 对外 API（与现有调用最小集保持一致） =============

  getBestProvider(capabilityName: string, market?: string): string | null {
    const candidates: { provider: string; priority: number }[] = [];

    for (const [providerName, caps] of this.capabilities) {
      const meta = caps.get(capabilityName);
      if (!meta || !meta.isEnabled) continue;
      const cap = meta.capability;
      if (!market || cap.supportedMarkets?.includes(market)) {
        candidates.push({ provider: providerName, priority: meta.priority });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.provider.localeCompare(b.provider);
    });
    return candidates[0].provider;
  }

  getCapability(providerName: string, capabilityName: string): ICapability | null {
    const resolvedName = this.normalizeProviderName(providerName);
    const meta = this.capabilities.get(resolvedName)?.get(capabilityName);
    return meta?.isEnabled ? meta.capability : null;
  }

  getProvider(providerName: string): IDataProvider | undefined {
    const resolvedName = this.normalizeProviderName(providerName);
    return this.providers.get(resolvedName);
  }

  getAllCapabilities(): Map<string, Map<string, CapabilityMeta>> {
    return this.capabilities;
  }
}
