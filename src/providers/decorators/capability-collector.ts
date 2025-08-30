import { createLogger } from '@app/config/logger.config';
import { 
  CapabilityMetadata, 
  ProviderMetadata, 
  CapabilityCollectionItem,
  ProviderCollectionItem,
  Constructor
} from './types/metadata.types';

/**
 * 能力收集器 - 使用装饰器收集所有注册的能力和提供商
 */
export class CapabilityCollector {
  private static readonly logger = createLogger('CapabilityCollector');
  private static capabilities = new Map<string, CapabilityCollectionItem>();
  private static providers = new Map<string, ProviderCollectionItem>();
  private static initialized = false;

  /**
   * 注册能力
   */
  static registerCapability(metadata: CapabilityMetadata, target: Constructor) {
    // 自动推断提供商名称
    if (!metadata.provider) {
      metadata.provider = this.extractProviderName(target.name);
    }

    const key = `${metadata.provider || 'unknown'}:${metadata.name}`;
    
    if (this.capabilities.has(key)) {
      this.logger.warn(`能力已存在，将被覆盖: ${key}`);
    }

    this.capabilities.set(key, {
      metadata,
      target,
      provider: metadata.provider
    });

    this.logger.debug(`能力注册成功: ${key}`);
  }

  /**
   * 注册提供商
   */
  static registerProvider(metadata: ProviderMetadata, target: Constructor) {
    if (this.providers.has(metadata.name)) {
      this.logger.warn(`提供商已存在，将被覆盖: ${metadata.name}`);
    }

    this.providers.set(metadata.name, {
      metadata,
      target
    });

    this.logger.debug(`提供商注册成功: ${metadata.name}`);
  }

  /**
   * 获取所有注册的能力
   */
  static getAllCapabilities(): Map<string, CapabilityCollectionItem> {
    return new Map(this.capabilities);
  }

  /**
   * 获取所有注册的提供商
   */
  static getAllProviders(): Map<string, ProviderCollectionItem> {
    return new Map(this.providers);
  }

  /**
   * 根据提供商名称获取能力
   */
  static getCapabilitiesByProvider(providerName: string): CapabilityCollectionItem[] {
    const capabilities: CapabilityCollectionItem[] = [];
    
    for (const [key, item] of this.capabilities) {
      if (item.provider === providerName || key.startsWith(`${providerName}:`)) {
        capabilities.push(item);
      }
    }
    
    return capabilities;
  }

  /**
   * 获取特定能力
   */
  static getCapability(providerName: string, capabilityName: string): CapabilityCollectionItem | undefined {
    const key = `${providerName}:${capabilityName}`;
    return this.capabilities.get(key);
  }

  /**
   * 获取特定提供商
   */
  static getProvider(providerName: string): ProviderCollectionItem | undefined {
    return this.providers.get(providerName);
  }

  /**
   * 清空所有注册信息（主要用于测试）
   */
  static clear() {
    this.capabilities.clear();
    this.providers.clear();
    this.initialized = false;
  }

  /**
   * 获取统计信息
   */
  static getStats() {
    const providerStats = new Map<string, number>();
    
    for (const [, item] of this.capabilities) {
      const provider = item.provider || 'unknown';
      providerStats.set(provider, (providerStats.get(provider) || 0) + 1);
    }

    return {
      totalCapabilities: this.capabilities.size,
      totalProviders: this.providers.size,
      capabilitiesByProvider: Object.fromEntries(providerStats),
      capabilities: Array.from(this.capabilities.keys()),
      providers: Array.from(this.providers.keys())
    };
  }

  /**
   * 从类名推断提供商名称
   */
  private static extractProviderName(className: string): string | undefined {
    // 去除常见后缀
    const cleanName = className
      .replace(/Capability$/, '')
      .replace(/Provider$/, '')
      .replace(/Service$/, '');

    // 转换为kebab-case
    const kebabCase = cleanName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    // 尝试提取提供商名称的模式
    const patterns = [
      /^([a-z-]+)-/,  // longport-get-stock-quote -> longport
      /^([a-z]+)/     // longportgetstockquote -> longport
    ];

    for (const pattern of patterns) {
      const match = kebabCase.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // 如果无法推断，返回清理后的名称
    return kebabCase || undefined;
  }

  /**
   * 验证收集的数据完整性
   */
  static validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查能力是否有对应的提供商
    for (const [key, capability] of this.capabilities) {
      if (capability.provider && !this.providers.has(capability.provider)) {
        errors.push(`能力 ${key} 的提供商 ${capability.provider} 未注册`);
      }
    }

    // 检查重复名称
    const capabilityNames = new Set<string>();
    for (const [, capability] of this.capabilities) {
      if (capabilityNames.has(capability.metadata.name)) {
        errors.push(`发现重复的能力名称: ${capability.metadata.name}`);
      }
      capabilityNames.add(capability.metadata.name);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}