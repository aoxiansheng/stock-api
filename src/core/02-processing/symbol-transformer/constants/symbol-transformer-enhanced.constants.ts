/**
 * Symbol Transformer Enhanced Constants
 * 基于BaseConstants的增强版符号转换器常量定义
 * 
 * @description
 * - 继承BaseConstants提供的标准化管理功能
 * - 保持与原有constants的完全兼容性
 * - 增加模块元数据和分组管理
 * - 支持运行时验证和调试功能
 */

import { BaseConstants, type ConstantModuleMetadata, type ConstantGroup } from '@common/constants/unified/base.constants';
import { RETRY_CONSTANTS } from '@common/constants/unified/retry.constants';
import { PERFORMANCE_CONSTANTS } from '@common/constants/unified/performance.constants';
import { ErrorType as RetryErrorType } from '../utils/retry.utils';

/**
 * 符号转换器增强常量类
 * 继承BaseConstants，提供完整的常量管理功能
 */
export class SymbolTransformerConstants extends BaseConstants {
  /**
   * 模块元数据定义
   */
  protected readonly metadata: ConstantModuleMetadata = {
    moduleName: 'symbol-transformer',
    version: '2.1.0',
    createdAt: '2024-01-15T00:00:00Z',
    lastUpdated: new Date().toISOString(),
    description: '符号转换器模块常量配置，支持多市场股票代码转换',
    dependencies: ['retry.constants', 'performance.constants', 'circuit-breaker.constants'],
  };

  /**
   * 常量分组定义
   */
  protected readonly groups: readonly ConstantGroup[] = [
    {
      name: 'SYMBOL_PATTERNS',
      description: '股票代码格式正则表达式',
      keys: ['CN', 'US', 'HK'],
    },
    {
      name: 'MARKET_TYPES',
      description: '市场类型定义',
      keys: ['CN', 'US', 'HK', 'MIXED', 'UNKNOWN'],
    },
    {
      name: 'CONFIG',
      description: '系统配置参数',
      keys: ['MAX_SYMBOL_LENGTH', 'MAX_BATCH_SIZE', 'REQUEST_TIMEOUT', 'ENDPOINT'],
    },
    {
      name: 'TRANSFORM_DIRECTIONS',
      description: '转换方向定义',
      keys: ['TO_STANDARD', 'FROM_STANDARD'],
    },
    {
      name: 'ERROR_TYPES',
      description: '错误类型枚举',
      keys: ['VALIDATION_ERROR', 'TIMEOUT_ERROR', 'NETWORK_ERROR', 'SYSTEM_ERROR'],
    },
    {
      name: 'MONITORING_CONFIG',
      description: '监控配置参数',
      keys: ['PERFORMANCE_THRESHOLD_MS', 'ERROR_RATE_THRESHOLD'],
    },
    {
      name: 'RETRY_CONFIG',
      description: '重试配置（引用统一配置）',
      keys: ['MAX_RETRY_ATTEMPTS', 'RETRY_DELAY_MS', 'BACKOFF_MULTIPLIER'],
    },
  ];

  // ====================== 预编译的股票代码格式正则表达式 ======================
  public readonly SYMBOL_PATTERNS = {
    CN: /^\d{6}$/, // A股：6位数字 (例如: 000001, 600000)
    US: /^[A-Z]+$/, // 美股：纯字母 (例如: AAPL, GOOGL)
    HK: /\.HK$/i, // 港股：.HK后缀 (例如: 700.HK, 0700.HK)
  } as const;

  // ====================== 市场类型常量 ======================
  public readonly MARKET_TYPES = {
    CN: "CN", // 中国A股市场
    US: "US", // 美国股票市场
    HK: "HK", // 香港股票市场
    MIXED: "mixed", // 混合市场（多个市场的股票）
    UNKNOWN: "unknown", // 未知市场
  } as const;

  // ====================== 系统配置常量 ======================
  public readonly CONFIG = {
    MAX_SYMBOL_LENGTH: 50, // 防DoS攻击 - 单个股票代码最大长度
    MAX_BATCH_SIZE: 1000, // 批处理限制 - 最大批量处理数量
    REQUEST_TIMEOUT: PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS, // 使用统一的HTTP请求超时配置
    ENDPOINT: "/internal/symbol-transformation", // 内部转换端点
  } as const;

  // ====================== 转换方向常量 ======================
  public readonly TRANSFORM_DIRECTIONS = {
    TO_STANDARD: "to_standard" as const, // 转换为标准格式
    FROM_STANDARD: "from_standard" as const, // 从标准格式转换
  } as const;

  // ====================== 错误类型常量 - 统一使用枚举定义，保持向后兼容 ======================
  public readonly ERROR_TYPES = {
    VALIDATION_ERROR: RetryErrorType.VALIDATION, // 验证错误
    TIMEOUT_ERROR: RetryErrorType.TIMEOUT, // 超时错误
    NETWORK_ERROR: RetryErrorType.NETWORK, // 网络错误
    SYSTEM_ERROR: RetryErrorType.SYSTEM, // 系统错误
  } as const;

  // ====================== 监控配置 ======================
  public readonly MONITORING_CONFIG = {
    // 移除 METRICS_ENDPOINT：事件驱动模式下不再需要直接端点
    PERFORMANCE_THRESHOLD_MS: 200, // 性能阈值（毫秒），用于业务判断
    ERROR_RATE_THRESHOLD: 0.01, // 错误率阈值（1%），用于业务判断
  } as const;

  // ====================== 重试配置 - 引用统一配置，保持向后兼容 ======================
  public readonly RETRY_CONFIG = RETRY_CONSTANTS.DEFAULT_SETTINGS;

  // ====================== 类型定义 ======================
  public readonly TYPES = {
    MarketType: null as any as (typeof this.MARKET_TYPES)[keyof typeof this.MARKET_TYPES],
    TransformDirection: null as any as (typeof this.TRANSFORM_DIRECTIONS)[keyof typeof this.TRANSFORM_DIRECTIONS],
    ErrorType: null as any as (typeof this.ERROR_TYPES)[keyof typeof this.ERROR_TYPES],
  };

  /**
   * 获取业务场景特定的配置
   * @param scenario 业务场景
   * @returns 场景配置
   */
  public getScenarioConfig(scenario: 'high-frequency' | 'batch-processing' | 'real-time'): {
    MAX_SYMBOL_LENGTH: number;
    MAX_BATCH_SIZE: number;
    REQUEST_TIMEOUT: number;
    ENDPOINT: string;
  } {
    switch (scenario) {
      case 'high-frequency':
        return {
          ...this.CONFIG,
          MAX_BATCH_SIZE: 100, // 高频场景减小批次
          REQUEST_TIMEOUT: 3000, // 更严格的超时
        };
      case 'batch-processing':
        return {
          ...this.CONFIG,
          MAX_BATCH_SIZE: 5000, // 批处理增大批次
          REQUEST_TIMEOUT: 60000, // 更宽松的超时
        };
      case 'real-time':
        return {
          ...this.CONFIG,
          MAX_BATCH_SIZE: 10, // 实时场景小批次
          REQUEST_TIMEOUT: 1000, // 极严格的超时
        };
      default:
        return this.CONFIG;
    }
  }

  /**
   * 验证符号格式
   * @param symbol 符号字符串
   * @param market 市场类型
   * @returns 是否有效
   */
  public validateSymbolFormat(symbol: string, market?: keyof typeof this.MARKET_TYPES): boolean {
    if (!symbol || symbol.length > this.CONFIG.MAX_SYMBOL_LENGTH) {
      return false;
    }

    if (market && this.SYMBOL_PATTERNS[market]) {
      return this.SYMBOL_PATTERNS[market].test(symbol);
    }

    // 如果没有指定市场，检查是否匹配任一市场格式
    return Object.values(this.SYMBOL_PATTERNS).some(pattern => pattern.test(symbol));
  }

  /**
   * 推断符号的市场类型
   * @param symbol 符号字符串
   * @returns 市场类型
   */
  public inferMarketType(symbol: string): keyof typeof this.MARKET_TYPES {
    for (const [market, pattern] of Object.entries(this.SYMBOL_PATTERNS)) {
      if (pattern.test(symbol)) {
        return market as keyof typeof this.MARKET_TYPES;
      }
    }
    return 'UNKNOWN';
  }

  /**
   * 检查错误类型是否可重试
   * @param errorType 错误类型
   * @returns 是否可重试
   */
  public isRetryableError(errorType: string): boolean {
    const retryableTypes = [
      this.ERROR_TYPES.NETWORK_ERROR,
      this.ERROR_TYPES.TIMEOUT_ERROR,
      this.ERROR_TYPES.SYSTEM_ERROR,
    ];
    return retryableTypes.includes(errorType as any);
  }
}

// ====================== 单例实例导出 ======================
/**
 * 符号转换器常量单例实例
 * 提供全局访问点
 */
export const SYMBOL_TRANSFORMER_ENHANCED = new SymbolTransformerConstants();

// ====================== 向后兼容性导出 ======================
/**
 * 向后兼容的常量导出
 * 保持与原有代码的完全兼容性
 */

// 预编译的股票代码格式正则表达式
export const SYMBOL_PATTERNS = SYMBOL_TRANSFORMER_ENHANCED.SYMBOL_PATTERNS;

// 市场类型常量
export const MARKET_TYPES = SYMBOL_TRANSFORMER_ENHANCED.MARKET_TYPES;

// 系统配置常量
export const CONFIG = SYMBOL_TRANSFORMER_ENHANCED.CONFIG;

// 转换方向常量
export const TRANSFORM_DIRECTIONS = SYMBOL_TRANSFORMER_ENHANCED.TRANSFORM_DIRECTIONS;

// 错误类型常量 - 统一使用枚举定义，保持向后兼容
export const ERROR_TYPES = SYMBOL_TRANSFORMER_ENHANCED.ERROR_TYPES;

// 监控配置
export const MONITORING_CONFIG = SYMBOL_TRANSFORMER_ENHANCED.MONITORING_CONFIG;

// 重试配置 - 引用统一配置，保持向后兼容
export const RETRY_CONFIG = SYMBOL_TRANSFORMER_ENHANCED.RETRY_CONFIG;

// 类型定义
export type MarketType = (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];
export type TransformDirection = (typeof TRANSFORM_DIRECTIONS)[keyof typeof TRANSFORM_DIRECTIONS];
export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

// ====================== 工具函数 ======================
/**
 * 获取增强常量实例
 * @returns 增强常量单例
 */
export function getSymbolTransformerConstants(): SymbolTransformerConstants {
  return SYMBOL_TRANSFORMER_ENHANCED;
}

/**
 * 注册到全局常量管理器
 */
import { ConstantManager } from '@common/constants/unified/base.constants';

// 自动注册到全局管理器
const globalManager = ConstantManager.getInstance();
globalManager.registerModule(SYMBOL_TRANSFORMER_ENHANCED);