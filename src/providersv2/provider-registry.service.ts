import { Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { createLogger } from "@common/logging/index";

// 复用既有 Provider 与能力定义（保持最小迁移成本）
import { LongportProvider } from "./providers/longport/longport.provider";
import { LongportSgProvider } from "./providers/longport-sg/longport-sg.provider";
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
  private initialized = false;

  constructor(
    @Optional() private readonly longportProvider?: LongportProvider,
    @Optional() private readonly longportSgProvider?: LongportSgProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.initialized) return;

    // 显式注册：按优先级注入（数值越小优先级越高）
    if (this.longportProvider) {
      this.registerProvider(this.longportProvider, 1);
    }
    if (this.longportSgProvider) {
      this.registerProvider(this.longportSgProvider, 2);
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

  private ensureProviderMaps(providerName: string) {
    if (!this.capabilities.has(providerName)) {
      this.capabilities.set(providerName, new Map());
    }
  }

  private registerProvider(provider: IDataProvider, priority = 1): void {
    if (!provider || !provider.name) return;
    const providerName = provider.name;

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
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].provider;
  }

  getCapability(providerName: string, capabilityName: string): ICapability | null {
    const meta = this.capabilities.get(providerName)?.get(capabilityName);
    return meta?.isEnabled ? meta.capability : null;
  }

  getProvider(providerName: string): IDataProvider | undefined {
    return this.providers.get(providerName);
  }

  getAllCapabilities(): Map<string, Map<string, CapabilityMeta>> {
    return this.capabilities;
  }
}

