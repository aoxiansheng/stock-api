import { Injectable, OnModuleInit, Optional } from "@nestjs/common";
import { createLogger } from "@appcore/config/logger.config";

import { ICapability } from "../interfaces/capability.interface";
import { ICapabilityRegistration } from "../interfaces/provider.interface";
import {
  IStreamCapability,
  IStreamCapabilityRegistration,
} from "../interfaces/stream-capability.interface";
// import { CapabilityRegistryService } from "./capability-registry.service"; // 已移除旧服务

import { CapabilityCollector } from "../decorators/capability-collector";
import { SmartPathResolver } from "../utils/smart-path-resolver";
import { ConventionScanner } from "../utils/convention-scanner";
import { SmartErrorHandler } from "../utils/smart-error-handler";
import {
  ProviderInfo,
  CapabilityCollectionItem,
  ProviderCollectionItem,
} from "../decorators/types/metadata.types";
import { ConnectionStatus } from "../constants/connection.constants";

export interface RegistryStats {
  totalCapabilities: number;
  totalProviders: number;
  decoratorCapabilities: number;
  fileSystemCapabilities: number;
  streamCapabilities: number;
  restCapabilities: number;
  capabilitiesByProvider: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * 增强版能力注册服务
 * 整合装饰器系统、智能扫描和错误处理
 */
@Injectable()
export class EnhancedCapabilityRegistryService implements OnModuleInit {
  private readonly logger = createLogger("EnhancedCapabilityRegistryService");

  // 兼容现有接口的存储结构
  private readonly capabilities = new Map<
    string,
    Map<string, ICapabilityRegistration>
  >();
  private readonly streamCapabilities = new Map<
    string,
    Map<string, IStreamCapabilityRegistration>
  >();
  private readonly providers = new Map<string, any>();

  // 新的增强存储
  private readonly decoratorCapabilities = new Map<
    string,
    CapabilityCollectionItem
  >();
  private readonly decoratorProviders = new Map<
    string,
    ProviderCollectionItem
  >();
  private readonly fileSystemProviders = new Map<string, ProviderInfo>();

  // 状态追踪
  private initialized = false;
  private lastScanTime: Date | null = null;
  private registryStats: RegistryStats | null = null;
  private static initializationPromise: Promise<void> | null = null;

  constructor() // @Optional() private readonly capabilityRegistry?: CapabilityRegistryService
  {}

  async onModuleInit() {
    // 防止重复初始化 - 使用单例模式
    if (EnhancedCapabilityRegistryService.initializationPromise) {
      this.logger.debug("等待现有初始化完成...");
      await EnhancedCapabilityRegistryService.initializationPromise;
      return;
    }

    if (this.initialized) {
      this.logger.debug("增强注册表已初始化，跳过重复初始化");
      return;
    }

    EnhancedCapabilityRegistryService.initializationPromise =
      this.initializeRegistry();
    try {
      await EnhancedCapabilityRegistryService.initializationPromise;
    } finally {
      EnhancedCapabilityRegistryService.initializationPromise = null;
    }
  }

  /**
   * 初始化注册表 - 多策略混合方式
   */
  async initializeRegistry(): Promise<void> {
    this.logger.log("开始初始化增强能力注册表...");

    try {
      // 策略1: 收集装饰器注册的能力和提供商
      await this.collectDecoratorCapabilities();

      // 策略2: 扫描文件系统发现能力
      await this.scanFileSystemCapabilities();

      // 策略3: 合并和验证
      await this.mergeAndValidate();

      // 策略4: 向后兼容 - 填充现有数据结构
      this.populateLegacyStructures();

      // 生成统计信息
      this.generateStats();

      this.initialized = true;
      this.lastScanTime = new Date();

      this.logger.log("增强能力注册表初始化完成", {
        totalCapabilities: this.registryStats?.totalCapabilities,
        totalProviders: this.registryStats?.totalProviders,
        decoratorCapabilities: this.registryStats?.decoratorCapabilities,
        fileSystemCapabilities: this.registryStats?.fileSystemCapabilities,
      });
    } catch (error) {
      this.logger.error("增强能力注册表初始化失败", error);
      throw error;
    }
  }

  /**
   * 策略1: 收集装饰器注册的能力和提供商
   */
  private async collectDecoratorCapabilities(): Promise<void> {
    this.logger.debug("收集装饰器注册的能力...");

    // 获取装饰器收集的数据
    const decoratorCapabilities = CapabilityCollector.getAllCapabilities();
    const decoratorProviders = CapabilityCollector.getAllProviders();

    // 存储装饰器数据
    this.decoratorCapabilities.clear();
    for (const [key, item] of decoratorCapabilities) {
      this.decoratorCapabilities.set(key, item);
    }

    this.decoratorProviders.clear();
    for (const [key, item] of decoratorProviders) {
      this.decoratorProviders.set(key, item);
    }

    this.logger.debug("装饰器数据收集完成", {
      capabilities: this.decoratorCapabilities.size,
      providers: this.decoratorProviders.size,
    });
  }

  /**
   * 策略2: 扫描文件系统发现能力
   */
  private async scanFileSystemCapabilities(): Promise<void> {
    this.logger.debug("扫描文件系统能力...");

    try {
      const scanner = ConventionScanner.getInstance();
      const { providers, violations, stats } = await scanner.scanProviders({
        validateConventions: true,
      });

      // 存储文件系统发现的提供商
      this.fileSystemProviders.clear();
      for (const provider of providers) {
        this.fileSystemProviders.set(provider.name, provider);
      }

      // 处理约定违规
      if (violations.length > 0) {
        this.logger.warn(`发现 ${violations.length} 个约定违规`);

        // 尝试自动修复
        const autoFixable = violations.filter((v) => v.autoFixable);
        if (autoFixable.length > 0) {
          this.logger.log(`尝试自动修复 ${autoFixable.length} 个问题...`);
          const fixResult =
            await SmartErrorHandler.autoFixViolations(autoFixable);

          if (fixResult.fixedIssues.length > 0) {
            this.logger.log("自动修复成功", fixResult.fixedIssues);
          }
        }
      }

      this.logger.debug("文件系统扫描完成", {
        providers: providers.length,
        violations: violations.length,
        stats,
      });
    } catch (error) {
      this.logger.warn("文件系统扫描失败，将仅使用装饰器注册的能力", error);
    }
  }

  /**
   * 策略3: 合并和验证
   */
  private async mergeAndValidate(): Promise<void> {
    this.logger.debug("合并和验证能力注册...");

    // 验证装饰器数据的完整性
    const decoratorValidation = CapabilityCollector.validate();
    if (!decoratorValidation.isValid) {
      this.logger.warn("装饰器数据验证失败", decoratorValidation.errors);
    }

    // 检查数据一致性
    this.validateDataConsistency();
  }

  /**
   * 验证数据一致性
   */
  private validateDataConsistency(): void {
    const warnings: string[] = [];

    // 检查装饰器和文件系统数据的一致性
    for (const [providerName] of this.decoratorProviders) {
      const fileSystemProvider = this.fileSystemProviders.get(providerName);

      if (!fileSystemProvider) {
        warnings.push(`装饰器注册的提供商 ${providerName} 在文件系统中未找到`);
      }
    }

    for (const [providerName, fileSystemProvider] of this.fileSystemProviders) {
      const decoratorProvider = this.decoratorProviders.get(providerName);

      if (!decoratorProvider && fileSystemProvider.capabilities.length > 0) {
        warnings.push(`文件系统发现的提供商 ${providerName} 未使用装饰器注册`);
      }
    }

    if (warnings.length > 0) {
      this.logger.warn("数据一致性检查发现问题", warnings);
    }
  }

  /**
   * 策略4: 向后兼容 - 填充现有数据结构
   */
  private populateLegacyStructures(): void {
    this.logger.debug("填充兼容数据结构...");

    // 清空现有结构
    this.capabilities.clear();
    this.streamCapabilities.clear();
    this.providers.clear();

    // 从装饰器数据填充
    for (const [, item] of this.decoratorCapabilities) {
      const providerName = item.provider || "unknown";
      const capabilityName = item.metadata.name;

      // 确保提供商存在
      if (!this.capabilities.has(providerName)) {
        this.capabilities.set(providerName, new Map());
      }

      // 创建兼容的注册信息
      const registration: ICapabilityRegistration = {
        providerName,
        capability: this.createLegacyCapability(item),
        priority: item.metadata.priority || 1,
        isEnabled: item.metadata.enabled !== false,
      };

      this.capabilities.get(providerName)!.set(capabilityName, registration);

      // 处理流能力
      if (item.metadata.type === "websocket") {
        if (!this.streamCapabilities.has(providerName)) {
          this.streamCapabilities.set(providerName, new Map());
        }

        const streamRegistration: IStreamCapabilityRegistration = {
          providerName,
          capability: this.createLegacyStreamCapability(item),
          priority: item.metadata.priority || 1,
          isEnabled: item.metadata.enabled !== false,
          connectionStatus: ConnectionStatus.DISCONNECTED,
          errorCount: 0,
        };

        this.streamCapabilities
          .get(providerName)!
          .set(capabilityName, streamRegistration);
      }
    }

    // 从文件系统数据补充（如果装饰器中没有）
    for (const [providerName, provider] of this.fileSystemProviders) {
      if (!this.capabilities.has(providerName)) {
        this.capabilities.set(providerName, new Map());
      }

      // 注册提供商实例
      if (provider.main) {
        this.providers.set(providerName, provider.main);
      }

      // 为文件系统发现的能力创建兼容注册（如果装饰器中没有）
      for (const capabilityName of provider.capabilities) {
        const existingCapability = this.capabilities
          .get(providerName)
          ?.get(capabilityName);
        if (!existingCapability) {
          // 创建基础的兼容能力注册
          const basicCapability: ICapability = {
            name: capabilityName,
            description: `${capabilityName} 能力`,
            supportedMarkets: [],
            supportedSymbolFormats: [],
            execute: async () => {
              throw new Error(`能力 ${capabilityName} 尚未实现`);
            },
          };

          const registration: ICapabilityRegistration = {
            providerName,
            capability: basicCapability,
            priority: 10, // 较低优先级
            isEnabled: true,
          };

          this.capabilities
            .get(providerName)!
            .set(capabilityName, registration);
        }
      }
    }
  }

  /**
   * 创建兼容的能力对象
   */
  private createLegacyCapability(item: CapabilityCollectionItem): ICapability {
    return {
      name: item.metadata.name,
      description: item.metadata.description || "",
      supportedMarkets: item.metadata.markets || [],
      supportedSymbolFormats: item.metadata.symbolFormats || [],
      execute: async () => {
        throw new Error("需要实例化能力类才能执行");
      },
    };
  }

  /**
   * 创建兼容的流能力对象
   */
  private createLegacyStreamCapability(
    item: CapabilityCollectionItem,
  ): IStreamCapability {
    return {
      name: item.metadata.name,
      description: item.metadata.description || "",
      supportedMarkets: item.metadata.markets || [],
      supportedSymbolFormats: item.metadata.symbolFormats || [],
      initialize: async () => {
        throw new Error("需要实例化流能力类才能初始化");
      },
      subscribe: async () => {
        throw new Error("需要实例化流能力类才能订阅");
      },
      unsubscribe: async () => {
        throw new Error("需要实例化流能力类才能取消订阅");
      },
      onMessage: () => {
        throw new Error("需要实例化流能力类才能设置消息处理器");
      },
      cleanup: async () => {},
      isConnected: () => false,
    };
  }

  /**
   * 生成统计信息
   */
  private generateStats(): void {
    const stats: RegistryStats = {
      totalCapabilities: 0,
      totalProviders: 0,
      decoratorCapabilities: this.decoratorCapabilities.size,
      fileSystemCapabilities: 0,
      streamCapabilities: 0,
      restCapabilities: 0,
      capabilitiesByProvider: {},
      errors: [],
      warnings: [],
    };

    // 统计能力
    for (const [providerName, capabilities] of this.capabilities) {
      const capabilityCount = capabilities.size;
      stats.capabilitiesByProvider[providerName] = capabilityCount;
      stats.totalCapabilities += capabilityCount;
    }

    // 统计提供商
    stats.totalProviders = this.capabilities.size;

    // 统计流能力
    for (const [, capabilities] of this.streamCapabilities) {
      stats.streamCapabilities += capabilities.size;
    }

    // 统计REST能力
    stats.restCapabilities = stats.totalCapabilities - stats.streamCapabilities;

    // 统计文件系统能力
    for (const [, provider] of this.fileSystemProviders) {
      stats.fileSystemCapabilities += provider.capabilities.length;
    }

    this.registryStats = stats;
  }

  // === 公共API（保持向后兼容）===

  /**
   * 获取所有能力 - 兼容现有接口
   */
  getAllCapabilities(): Map<string, Map<string, ICapabilityRegistration>> {
    return this.capabilities;
  }

  /**
   * 获取最佳提供商
   */
  getBestProvider(capabilityName: string, market?: string): string | null {
    const candidates: { provider: string; priority: number }[] = [];

    for (const [providerName, capabilities] of this.capabilities) {
      const registration = capabilities.get(capabilityName);
      if (registration?.isEnabled) {
        const capability = registration.capability;
        if (!market || capability.supportedMarkets.includes(market)) {
          candidates.push({
            provider: providerName,
            priority: registration.priority,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // 按优先级排序，优先级数字越小越优先
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].provider;
  }

  /**
   * 注册Provider实例
   */
  registerProvider(provider: any): void {
    if (!provider || !provider.name) {
      this.logger.warn("尝试注册无效的Provider实例");
      return;
    }

    this.providers.set(provider.name, provider);
    this.logger.log(`Provider实例注册成功: ${provider.name}`);
  }

  /**
   * 获取Provider实例
   */
  getProvider(providerName: string): any {
    return this.providers.get(providerName);
  }

  /**
   * 获取能力总数
   */
  getTotalCapabilitiesCount(): number {
    return this.registryStats?.totalCapabilities || 0;
  }

  /**
   * 获取能力 - 兼容现有接口
   */
  getCapability(
    providerName: string,
    capabilityName: string,
  ): ICapability | null {
    const registration = this.capabilities
      .get(providerName)
      ?.get(capabilityName);
    return registration?.isEnabled ? registration.capability : null;
  }

  /**
   * 获取所有流能力 - 兼容现有接口
   */
  getAllStreamCapabilities(): Map<
    string,
    Map<string, IStreamCapabilityRegistration>
  > {
    return this.streamCapabilities;
  }

  // === 新增的增强API ===

  /**
   * 获取注册表统计信息
   */
  getStats(): RegistryStats | null {
    return this.registryStats;
  }

  /**
   * 获取装饰器能力
   */
  getDecoratorCapabilities(): Map<string, CapabilityCollectionItem> {
    return new Map(this.decoratorCapabilities);
  }

  /**
   * 获取装饰器提供商
   */
  getDecoratorProviders(): Map<string, ProviderCollectionItem> {
    return new Map(this.decoratorProviders);
  }

  /**
   * 获取文件系统提供商
   */
  getFileSystemProviders(): Map<string, ProviderInfo> {
    return new Map(this.fileSystemProviders);
  }

  /**
   * 重新扫描并刷新注册表
   */
  async refresh(): Promise<void> {
    this.logger.log("刷新能力注册表...");

    // 清除所有缓存
    CapabilityCollector.clear();
    ConventionScanner.clearCache();

    // 重置初始化状态
    this.initialized = false;
    EnhancedCapabilityRegistryService.initializationPromise = null;

    // 重新初始化
    await this.initializeRegistry();
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): Record<string, any> {
    return {
      initialized: this.initialized,
      lastScanTime: this.lastScanTime,
      stats: this.registryStats,
      pathInfo: SmartPathResolver.getDebugInfo(),
      decoratorValidation: CapabilityCollector.validate(),
      capabilities: Array.from(this.capabilities.keys()),
      providers: Array.from(this.providers.keys()),
    };
  }

  /**
   * 验证特定能力
   */
  validateCapability(
    providerName: string,
    capabilityName: string,
  ): {
    exists: boolean;
    enabled: boolean;
    hasImplementation: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const providerCapabilities = this.capabilities.get(providerName);
    if (!providerCapabilities) {
      errors.push(`提供商 ${providerName} 不存在`);
      return {
        exists: false,
        enabled: false,
        hasImplementation: false,
        errors,
      };
    }

    const registration = providerCapabilities.get(capabilityName);
    if (!registration) {
      errors.push(`能力 ${capabilityName} 在提供商 ${providerName} 中不存在`);
      return {
        exists: false,
        enabled: false,
        hasImplementation: false,
        errors,
      };
    }

    return {
      exists: true,
      enabled: registration.isEnabled,
      hasImplementation: typeof registration.capability.execute === "function",
      errors,
    };
  }
}
