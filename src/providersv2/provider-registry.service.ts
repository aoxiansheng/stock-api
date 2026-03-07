import { Injectable, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { createLogger } from "@common/logging/index";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_NAME_ALIASES,
  type ProviderManifestEntry,
} from "./provider-id.constants";
import { ProviderPriorityPolicyService } from "./provider-priority-policy.service";
import { ICapability } from "./providers/interfaces/capability.interface";
import { IDataProvider } from "./providers/interfaces/provider.interface";

export interface CapabilityMeta {
  capability: ICapability;
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
  // 仅解析 manifest 中显式声明的 alias 到标准 provider 名称
  private readonly providerAliases = new Map<string, string>(
    Object.entries(PROVIDER_NAME_ALIASES),
  );
  private initialized = false;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly providerPriorityPolicyService: ProviderPriorityPolicyService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.initialized) return;
    this.assertModuleRefAvailable();

    const injectedProviders = this.resolveInjectedProvidersFromManifest();

    for (const provider of injectedProviders) {
      this.registerProvider(provider);
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

  private resolveProviderTokenName(
    providerToken: ProviderManifestEntry["providerToken"],
  ): string {
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

  private registerProvider(provider: IDataProvider): void {
    if (!provider || !provider.name) return;
    const providerName = this.normalizeProviderName(provider.name);

    this.providers.set(providerName, provider);
    this.ensureProviderMaps(providerName);

    for (const cap of provider.capabilities || []) {
      this.capabilities.get(providerName)!.set(cap.name, {
        capability: cap,
        isEnabled: true,
      });
    }

    this.logger.debug("Provider 已注册", {
      provider: providerName,
      capabilities: provider.capabilities?.length || 0,
    });
  }

  private normalizeProviderName(providerName: string): string {
    const normalizedName = String(providerName || "").trim().toLowerCase();
    return this.providerAliases.get(normalizedName) || normalizedName;
  }

  private supportsMarket(capability: ICapability, market?: string): boolean {
    if (!market) {
      return true;
    }

    const targetMarket = String(market).trim().toUpperCase();
    return (capability.supportedMarkets || []).some(
      (supportedMarket) =>
        String(supportedMarket || "").trim().toUpperCase() === targetMarket,
    );
  }

  // ============= 对外 API（与现有调用最小集保持一致） =============

  getCandidateProviders(capabilityName: string, market?: string): string[] {
    const candidates: string[] = [];

    for (const [providerName, caps] of this.capabilities) {
      const meta = caps.get(capabilityName);
      if (!meta || !meta.isEnabled) continue;
      if (!this.supportsMarket(meta.capability, market)) continue;
      candidates.push(providerName);
    }

    return candidates;
  }

  rankProvidersForCapability(
    capabilityName: string,
    candidates: string[],
  ): string[] {
    return this.providerPriorityPolicyService.rankCandidates(
      capabilityName,
      candidates.map((provider) => this.normalizeProviderName(provider)),
    );
  }

  getBestProvider(capabilityName: string, market?: string): string | null {
    const candidates = this.getCandidateProviders(capabilityName, market);
    if (candidates.length === 0) {
      return null;
    }

    const ranked = this.rankProvidersForCapability(capabilityName, candidates);
    return ranked[0] ?? null;
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
