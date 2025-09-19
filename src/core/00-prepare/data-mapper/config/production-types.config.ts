/**
 * 生产环境数据映射类型配置
 *
 * @fileoverview
 * 本文件定义了数据映射模块中各类型在生产环境的支持状态和配置信息，
 * 用于运行时验证和降级策略。
 *
 * @author Data Mapper Team
 * @since 1.0.0
 * @lastModified 2025-09-19
 */

import { RuleListType } from '../constants/data-mapper.constants';

/**
 * 生产类型支持级别枚举
 */
export enum ProductionSupportLevel {
  /** 生产就绪 - 完全支持，性能稳定 */
  PRODUCTION = 'production',
  /** 实验性 - 功能可用但可能不稳定 */
  EXPERIMENTAL = 'experimental',
  /** 已弃用 - 仍可用但计划移除 */
  DEPRECATED = 'deprecated'
}

/**
 * 风险级别枚举
 */
export enum RiskLevel {
  /** 低风险 - 稳定可靠 */
  LOW = 'low',
  /** 中等风险 - 可能存在性能或稳定性问题 */
  MEDIUM = 'medium',
  /** 高风险 - 不建议在生产环境使用 */
  HIGH = 'high'
}

/**
 * 生产类型配置接口
 */
export interface ProductionTypeConfig {
  /** 类型名称 */
  type: RuleListType;
  /** 支持级别 */
  supportLevel: ProductionSupportLevel;
  /** 支持的端点列表 */
  endpoints: string[];
  /** 风险级别 */
  riskLevel: RiskLevel;
  /** 描述信息 */
  description: string;
  /** 降级类型（可选） */
  fallbackType?: RuleListType;
  /** 性能特征 */
  performanceProfile: {
    /** 平均响应时间 (ms) */
    avgResponseTime: number;
    /** 缓存命中率 (0-1) */
    cacheHitRate: number;
    /** 内存使用量 (MB) */
    memoryUsage: number;
  };
  /** 启用状态 */
  enabled: boolean;
  /** 最大并发处理数 */
  maxConcurrency: number;
}

/**
 * 生产类型注册表
 *
 * @description 定义所有数据映射类型在生产环境中的完整配置信息
 *
 * @example
 * ```typescript
 * import { PRODUCTION_TYPE_REGISTRY } from './config/production-types.config';
 *
 * // 获取类型配置
 * const config = PRODUCTION_TYPE_REGISTRY.quote_fields;
 * console.log(config.supportLevel); // 'production'
 *
 * // 检查是否生产就绪
 * const isReady = config.supportLevel === ProductionSupportLevel.PRODUCTION;
 * ```
 */
export const PRODUCTION_TYPE_REGISTRY: Record<RuleListType, ProductionTypeConfig> = {
  quote_fields: {
    type: 'quote_fields',
    supportLevel: ProductionSupportLevel.PRODUCTION,
    endpoints: ['get-stock-realtime', 'get-stock-history'],
    riskLevel: RiskLevel.LOW,
    description: '股票实时和历史行情数据',
    performanceProfile: {
      avgResponseTime: 50,
      cacheHitRate: 0.95,
      memoryUsage: 10
    },
    enabled: true,
    maxConcurrency: 100
  },

  basic_info_fields: {
    type: 'basic_info_fields',
    supportLevel: ProductionSupportLevel.PRODUCTION,
    endpoints: ['get-stock-basic-info'],
    riskLevel: RiskLevel.LOW,
    description: '股票基础信息数据',
    performanceProfile: {
      avgResponseTime: 30,
      cacheHitRate: 0.98,
      memoryUsage: 5
    },
    enabled: true,
    maxConcurrency: 50
  },

  index_fields: {
    type: 'index_fields',
    supportLevel: ProductionSupportLevel.PRODUCTION, // 已确认生产就绪
    endpoints: ['get-index-quote'],
    riskLevel: RiskLevel.LOW,
    description: '指数行情数据',
    fallbackType: 'quote_fields', // 降级到quote_fields
    performanceProfile: {
      avgResponseTime: 80,
      cacheHitRate: 0.85,
      memoryUsage: 15
    },
    enabled: true,
    maxConcurrency: 30
  }
} as const;

/**
 * 获取生产类型配置
 *
 * @param type 规则类型
 * @returns 生产类型配置对象
 *
 * @example
 * ```typescript
 * const config = getProductionTypeConfig('index_fields');
 * console.log(config.supportLevel); // 'production'
 * ```
 */
export function getProductionTypeConfig(type: RuleListType): ProductionTypeConfig {
  return PRODUCTION_TYPE_REGISTRY[type];
}

/**
 * 检查类型是否生产就绪
 *
 * @param type 规则类型
 * @returns 是否生产就绪
 *
 * @example
 * ```typescript
 * const isReady = isProductionReady('index_fields');
 * console.log(isReady); // true
 * ```
 */
export function isProductionReady(type: RuleListType): boolean {
  const config = getProductionTypeConfig(type);
  return config.supportLevel === ProductionSupportLevel.PRODUCTION && config.enabled;
}

/**
 * 获取支持的端点列表
 *
 * @param type 规则类型
 * @returns 支持的端点列表
 *
 * @example
 * ```typescript
 * const endpoints = getSupportedEndpoints('quote_fields');
 * console.log(endpoints); // ['get-stock-realtime', 'get-stock-history']
 * ```
 */
export function getSupportedEndpoints(type: RuleListType): string[] {
  const config = getProductionTypeConfig(type);
  return config.endpoints;
}

/**
 * 获取降级类型
 *
 * @param type 规则类型
 * @returns 降级类型，如果没有则返回null
 *
 * @example
 * ```typescript
 * const fallback = getFallbackType('index_fields');
 * console.log(fallback); // 'quote_fields'
 * ```
 */
export function getFallbackType(type: RuleListType): RuleListType | null {
  const config = getProductionTypeConfig(type);
  return config.fallbackType || null;
}

/**
 * 获取所有生产就绪的类型
 *
 * @returns 生产就绪的类型列表
 *
 * @example
 * ```typescript
 * const productionTypes = getProductionReadyTypes();
 * console.log(productionTypes); // ['quote_fields', 'basic_info_fields', 'index_fields']
 * ```
 */
export function getProductionReadyTypes(): RuleListType[] {
  return Object.keys(PRODUCTION_TYPE_REGISTRY).filter(
    type => isProductionReady(type as RuleListType)
  ) as RuleListType[];
}

/**
 * 验证类型配置完整性
 *
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * const validation = validateProductionTypeRegistry();
 * if (!validation.isValid) {
 *   console.error('配置验证失败:', validation.errors);
 * }
 * ```
 */
export function validateProductionTypeRegistry(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(PRODUCTION_TYPE_REGISTRY).forEach(([key, config]) => {
    // 检查类型名称一致性
    if (key !== config.type) {
      errors.push(`类型键名 '${key}' 与配置中的类型 '${config.type}' 不匹配`);
    }

    // 检查端点列表不为空
    if (!config.endpoints || config.endpoints.length === 0) {
      errors.push(`类型 '${key}' 的端点列表为空`);
    }

    // 检查性能配置合理性
    if (config.performanceProfile.avgResponseTime <= 0) {
      errors.push(`类型 '${key}' 的平均响应时间必须大于0`);
    }

    if (config.performanceProfile.cacheHitRate < 0 || config.performanceProfile.cacheHitRate > 1) {
      errors.push(`类型 '${key}' 的缓存命中率必须在0-1之间`);
    }

    // 检查降级类型的循环引用
    if (config.fallbackType && config.fallbackType === config.type) {
      errors.push(`类型 '${key}' 存在循环降级引用`);
    }

    // 性能警告
    if (config.performanceProfile.avgResponseTime > 200) {
      warnings.push(`类型 '${key}' 的平均响应时间较高 (${config.performanceProfile.avgResponseTime}ms)`);
    }

    if (config.performanceProfile.cacheHitRate < 0.8) {
      warnings.push(`类型 '${key}' 的缓存命中率较低 (${config.performanceProfile.cacheHitRate})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}