/**
 * 数据映射类型运行时验证工具
 *
 * @fileoverview
 * 本文件提供运行时类型验证功能，确保数据映射类型的安全性和一致性。
 * 包含类型验证、降级策略和错误处理等功能。
 *
 * @author Data Mapper Team
 * @since 1.0.0
 * @lastModified 2025-09-19
 */

import { BadRequestException, Logger } from '@nestjs/common';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { DATA_MAPPER_ERROR_CODES } from '../constants/data-mapper-error-codes.constants';
import { RuleListType, RULE_LIST_TYPE_VALUES } from '../constants/data-mapper.constants';
import {
  getProductionTypeConfig,
  isProductionReady,
  getSupportedEndpoints,
  getFallbackType,
  ProductionSupportLevel,
  RiskLevel
} from '../config/production-types.config';

/**
 * 类型验证结果接口
 */
export interface TypeValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  /** 验证的类型 */
  type: RuleListType;
  /** 是否是降级类型 */
  isFallback: boolean;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings: string[];
  /** 建议信息 */
  suggestions: string[];
}

/**
 * 类型健康检查结果接口
 */
export interface TypeHealthCheckResult {
  /** 类型名称 */
  type: RuleListType;
  /** 是否健康 */
  isHealthy: boolean;
  /** 支持级别 */
  supportLevel: ProductionSupportLevel;
  /** 风险级别 */
  riskLevel: RiskLevel;
  /** 性能指标 */
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  /** 问题列表 */
  issues: string[];
  /** 建议操作 */
  recommendations: string[];
}

/**
 * 日志记录器
 */
const logger = new Logger('DataMapperTypeValidation');

/**
 * 验证规则类型
 *
 * @param type 待验证的类型字符串
 * @param options 验证选项
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * import { validateRuleType } from './utils/type-validation.utils';
 *
 * try {
 *   const result = validateRuleType('index_fields');
 *   if (result.isValid) {
 *     console.log('类型验证成功:', result.type);
 *   }
 * } catch (error) {
 *   console.error('类型验证失败:', error.message);
 * }
 * ```
 *
 * @throws {BadRequestException} 当类型不支持或验证失败时抛出
 */
export function validateRuleType(
  type: string,
  options: {
    /** 是否允许降级 */
    allowFallback?: boolean;
    /** 是否严格模式（不允许实验性类型） */
    strictMode?: boolean;
    /** 目标端点（用于验证兼容性） */
    targetEndpoint?: string;
  } = {}
): TypeValidationResult {
  const {
    allowFallback = true,
    strictMode = false,
    targetEndpoint
  } = options;

  const result: TypeValidationResult = {
    isValid: false,
    type: type as RuleListType,
    isFallback: false,
    warnings: [],
    suggestions: []
  };

  // 基础类型检查
  if (!type || typeof type !== 'string') {
    result.error = 'Type parameter must be a non-empty string';
    logger.error(`Type validation failed: ${result.error}`, { providedType: type });
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'validateRuleType',
      message: result.error,
      context: {
        providedType: type,
        expectedType: 'non-empty string',
        errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_NAME
      },
      retryable: false
    });
  }

  // 检查是否为支持的类型
  if (!RULE_LIST_TYPE_VALUES.includes(type as RuleListType)) {
    result.error = `Unsupported rule type: ${type}`;
    result.suggestions.push(
      `Supported types include: ${RULE_LIST_TYPE_VALUES.join(', ')}`
    );
    logger.error(`Unsupported type: ${type}`);
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'validateRuleType',
      message: result.error,
      context: {
        providedType: type,
        supportedTypes: RULE_LIST_TYPE_VALUES,
        suggestions: result.suggestions,
        errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_NAME
      },
      retryable: false
    });
  }

  const ruleType = type as RuleListType;
  result.type = ruleType;

  // 获取类型配置
  const config = getProductionTypeConfig(ruleType);
  if (!config) {
    result.error = `Unknown rule type: ${type}`;
    logger.error(`Missing type configuration: ${type}`);
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.DATA_MAPPER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'validateRuleType',
      message: result.error,
      context: {
        ruleType: type,
        errorType: DATA_MAPPER_ERROR_CODES.INVALID_RULE_NAME
      },
      retryable: false
    });
  }

  // 检查是否启用
  if (!config.enabled) {
    if (allowFallback && config.fallbackType) {
      logger.warn(`类型 ${type} 已禁用，尝试降级到 ${config.fallbackType}`);
      const fallbackResult = validateRuleType(config.fallbackType, {
        ...options,
        allowFallback: false // 防止循环降级
      });
      fallbackResult.isFallback = true;
      fallbackResult.warnings.push(`已从禁用类型 ${type} 降级到 ${config.fallbackType}`);
      return fallbackResult;
    } else {
      result.error = `Type ${type} is currently disabled`;
      logger.error(result.error);
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'validateRuleType',
        message: result.error,
        context: {
          ruleType: type,
          enabled: config.enabled,
          fallbackType: config.fallbackType,
          errorType: DATA_MAPPER_ERROR_CODES.RULE_APPLICATION_FAILED
        },
        retryable: false
      });
    }
  }

  // 严格模式检查
  if (strictMode && config.supportLevel !== ProductionSupportLevel.PRODUCTION) {
    if (allowFallback && config.fallbackType) {
      logger.warn(`严格模式下类型 ${type} 不符合要求，尝试降级到 ${config.fallbackType}`);
      const fallbackResult = validateRuleType(config.fallbackType, options);
      fallbackResult.isFallback = true;
      fallbackResult.warnings.push(`严格模式下已从 ${type} 降级到 ${config.fallbackType}`);
      return fallbackResult;
    } else {
      result.error = `Non-production level type not allowed in strict mode: ${type}`;
      logger.error(result.error);
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.DATA_MAPPER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'validateRuleType',
        message: result.error,
        context: {
          ruleType: type,
          supportLevel: config.supportLevel,
          strictMode: true,
          fallbackType: config.fallbackType,
          errorType: DATA_MAPPER_ERROR_CODES.RULE_APPLICATION_FAILED
        },
        retryable: false
      });
    }
  }

  // 端点兼容性检查
  if (targetEndpoint) {
    const supportedEndpoints = getSupportedEndpoints(ruleType);
    if (!supportedEndpoints.includes(targetEndpoint)) {
      if (allowFallback && config.fallbackType) {
        logger.warn(`类型 ${type} 不支持端点 ${targetEndpoint}，尝试降级`);
        const fallbackResult = validateRuleType(config.fallbackType, options);
        fallbackResult.isFallback = true;
        fallbackResult.warnings.push(
          `类型 ${type} 不支持端点 ${targetEndpoint}，已降级到 ${config.fallbackType}`
        );
        return fallbackResult;
      } else {
        result.error = `Type ${type} does not support endpoint ${targetEndpoint}`;
        result.suggestions.push(
          `Endpoints supported by this type: ${supportedEndpoints.join(', ')}`
        );
        logger.error(result.error);
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.DATA_MAPPER,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validateRuleType',
          message: result.error,
          context: {
            ruleType: type,
            targetEndpoint,
            supportedEndpoints,
            suggestions: result.suggestions,
            errorType: DATA_MAPPER_ERROR_CODES.INVALID_API_TYPE
          },
          retryable: false
        });
      }
    }
  }

  // 风险评估
  if (config.riskLevel === RiskLevel.HIGH) {
    result.warnings.push(`类型 ${type} 标记为高风险，建议谨慎使用`);
    if (config.fallbackType) {
      result.suggestions.push(`建议使用更安全的类型: ${config.fallbackType}`);
    }
  } else if (config.riskLevel === RiskLevel.MEDIUM) {
    result.warnings.push(`类型 ${type} 标记为中等风险，请注意监控`);
  }

  // 性能警告
  if (config.performanceProfile.avgResponseTime > 100) {
    result.warnings.push(
      `类型 ${type} 的响应时间较慢 (${config.performanceProfile.avgResponseTime}ms)`
    );
  }

  if (config.performanceProfile.cacheHitRate < 0.8) {
    result.warnings.push(
      `类型 ${type} 的缓存命中率较低 (${Math.round(config.performanceProfile.cacheHitRate * 100)}%)`
    );
  }

  result.isValid = true;
  logger.debug(`类型验证成功: ${type}`, { config, warnings: result.warnings });

  return result;
}

/**
 * 执行类型健康检查
 *
 * @param type 规则类型
 * @returns 健康检查结果
 *
 * @example
 * ```typescript
 * import { performTypeHealthCheck } from './utils/type-validation.utils';
 *
 * const healthResult = performTypeHealthCheck('index_fields');
 * if (!healthResult.isHealthy) {
 *   console.warn('类型健康检查失败:', healthResult.issues);
 * }
 * ```
 */
export function performTypeHealthCheck(type: RuleListType): TypeHealthCheckResult {
  const config = getProductionTypeConfig(type);
  const result: TypeHealthCheckResult = {
    type,
    isHealthy: true,
    supportLevel: config.supportLevel,
    riskLevel: config.riskLevel,
    performance: config.performanceProfile,
    issues: [],
    recommendations: []
  };

  // 检查基本可用性
  if (!config.enabled) {
    result.isHealthy = false;
    result.issues.push('类型已禁用');
    if (config.fallbackType) {
      result.recommendations.push(`使用降级类型: ${config.fallbackType}`);
    }
  }

  // 检查生产就绪状态
  if (!isProductionReady(type)) {
    result.isHealthy = false;
    result.issues.push('类型未达到生产就绪状态');
    result.recommendations.push('等待类型升级到生产级别或使用替代类型');
  }

  // 性能健康检查
  if (config.performanceProfile.avgResponseTime > 200) {
    result.issues.push(`响应时间过长: ${config.performanceProfile.avgResponseTime}ms`);
    result.recommendations.push('考虑优化性能或使用更快的类型');
  }

  if (config.performanceProfile.cacheHitRate < 0.7) {
    result.issues.push(`缓存命中率过低: ${Math.round(config.performanceProfile.cacheHitRate * 100)}%`);
    result.recommendations.push('检查缓存配置和策略');
  }

  if (config.performanceProfile.memoryUsage > 50) {
    result.issues.push(`内存使用量较高: ${config.performanceProfile.memoryUsage}MB`);
    result.recommendations.push('监控内存使用情况');
  }

  // 风险评估
  if (config.riskLevel === RiskLevel.HIGH) {
    result.isHealthy = false;
    result.issues.push('类型标记为高风险');
    result.recommendations.push('避免在关键业务中使用此类型');
  }

  // 端点支持检查
  if (config.endpoints.length === 0) {
    result.isHealthy = false;
    result.issues.push('没有支持的端点');
    result.recommendations.push('添加端点支持或禁用此类型');
  }

  logger.debug(`类型健康检查完成: ${type}`, {
    isHealthy: result.isHealthy,
    issueCount: result.issues.length
  });

  return result;
}

/**
 * 获取类型的最优降级策略
 *
 * @param type 原始类型
 * @param context 上下文信息
 * @returns 降级建议
 *
 * @example
 * ```typescript
 * import { getOptimalFallbackStrategy } from './utils/type-validation.utils';
 *
 * const strategy = getOptimalFallbackStrategy('index_fields', {
 *   targetEndpoint: 'get-stock-quote'
 * });
 * ```
 */
export function getOptimalFallbackStrategy(
  type: RuleListType,
  context: {
    targetEndpoint?: string;
    performanceRequirement?: 'fast' | 'normal' | 'comprehensive';
    riskTolerance?: 'low' | 'medium' | 'high';
  } = {}
): {
  recommendedType: RuleListType;
  reason: string;
  expectedImpact: string;
} {
  const {
    targetEndpoint,
    performanceRequirement = 'normal',
    riskTolerance = 'low'
  } = context;

  // 首先尝试配置中的降级类型
  const fallbackType = getFallbackType(type);
  if (fallbackType) {
    const fallbackConfig = getProductionTypeConfig(fallbackType);

    // 验证降级类型是否满足要求
    let isCompatible = true;
    let reason = `配置的降级类型`;

    if (targetEndpoint && !fallbackConfig.endpoints.includes(targetEndpoint)) {
      isCompatible = false;
    }

    if (riskTolerance === 'low' && fallbackConfig.riskLevel !== RiskLevel.LOW) {
      isCompatible = false;
    }

    if (performanceRequirement === 'fast' && fallbackConfig.performanceProfile.avgResponseTime > 50) {
      isCompatible = false;
    }

    if (isCompatible) {
      return {
        recommendedType: fallbackType,
        reason,
        expectedImpact: '功能基本保持，可能存在轻微性能差异'
      };
    }
  }

  // 如果配置的降级类型不适用，寻找最佳替代
  const allTypes = RULE_LIST_TYPE_VALUES;
  let bestType: RuleListType = 'quote_fields'; // 默认降级
  let bestScore = 0;

  for (const candidateType of allTypes) {
    if (candidateType === type) continue; // 跳过原类型

    const config = getProductionTypeConfig(candidateType);
    let score = 0;

    // 评分标准
    if (config.enabled) score += 10;
    if (config.supportLevel === ProductionSupportLevel.PRODUCTION) score += 20;
    if (config.riskLevel === RiskLevel.LOW) score += 15;

    // 端点兼容性
    if (targetEndpoint && config.endpoints.includes(targetEndpoint)) {
      score += 30;
    } else if (!targetEndpoint) {
      score += 10; // 没有特定端点要求时给基础分
    }

    // 性能评分
    if (performanceRequirement === 'fast' && config.performanceProfile.avgResponseTime <= 50) {
      score += 20;
    } else if (performanceRequirement === 'normal' && config.performanceProfile.avgResponseTime <= 100) {
      score += 15;
    }

    // 缓存性能
    if (config.performanceProfile.cacheHitRate >= 0.9) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = candidateType;
    }
  }

  const bestConfig = getProductionTypeConfig(bestType);
  return {
    recommendedType: bestType,
    reason: '基于兼容性和性能分析的最佳选择',
    expectedImpact: `预期响应时间: ${bestConfig.performanceProfile.avgResponseTime}ms, 缓存命中率: ${Math.round(bestConfig.performanceProfile.cacheHitRate * 100)}%`
  };
}

/**
 * 批量验证类型列表
 *
 * @param types 类型列表
 * @param options 验证选项
 * @returns 批量验证结果
 *
 * @example
 * ```typescript
 * import { validateRuleTypes } from './utils/type-validation.utils';
 *
 * const results = validateRuleTypes(['quote_fields', 'index_fields'], {
 *   strictMode: true
 * });
 * ```
 */
export function validateRuleTypes(
  types: string[],
  options?: Parameters<typeof validateRuleType>[1]
): TypeValidationResult[] {
  return types.map(type => {
    try {
      return validateRuleType(type, options);
    } catch (error) {
      return {
        isValid: false,
        type: type as RuleListType,
        isFallback: false,
        error: error.message,
        warnings: [],
        suggestions: []
      };
    }
  });
}