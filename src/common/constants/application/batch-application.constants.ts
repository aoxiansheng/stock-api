/**
 * 批处理应用层常量
 * 🏢 Application层 - 批处理相关的具体业务应用配置
 * 📋 基于Domain/Semantic层构建，专注于具体批处理业务场景
 * 🆕 从Unified层迁移，解决批处理配置重复定义问题
 */

import {
  BATCH_SIZE_SEMANTICS,
  BATCH_TIMEOUT_SEMANTICS,
  CONCURRENCY_SEMANTICS,
  HTTP_TIMEOUTS,
} from '../semantic';
import { CORE_VALUES } from '../foundation';

/**
 * 批处理应用配置
 * 🎯 整合Unified层BATCH_CONSTANTS，解决重复配置问题
 */
export const BATCH_APPLICATION_CONFIG = Object.freeze({
  // 默认批量配置 - 基于Semantic层
  DEFAULT_SETTINGS: {
    BATCH_SIZE: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE, // 50 - 最优批量大小
  },

  // 业务场景特定批量配置 - 基于Foundation层数值
  BUSINESS_SCENARIOS: {
    // 数据获取场景
    DATA_FETCHER: {
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,             // 50 - 最大批量
    },

    // 接收器场景
    RECEIVER: {
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,      // 500 - 接收器最大批量
    },

    // 存储操作场景
    STORAGE: {
    },

    // 符号映射场景
    SYMBOL_MAPPER: {
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,          // 1000 - 最大批量
    },

    // 转换器场景
    TRANSFORMER: {
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,      // 500 - 转换器最大批量
    },

    // 查询场景
    QUERY: {
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,       // 200 - 查询最大批量
    },

    // 流处理场景
    STREAM: {
    },

    // 缓存场景
    CACHE: {
    },

    // 监控场景  
    MONITORING: {
    },

    // 导入导出场景
    IMPORT_EXPORT: {
    },

    // 清理场景
    CLEANUP: {
    },
  },

  // 性能优化配置
  PERFORMANCE: {
    // 内存使用优化
    MEMORY_OPTIMIZATION: {
    },

    // CPU使用优化
    CPU_OPTIMIZATION: {
    },

    // 网络优化
    NETWORK_OPTIMIZATION: {
    },
  },

  // 错误处理配置
  ERROR_HANDLING: {
  },

  // 监控和度量配置
  MONITORING: {
  },
});

/**
 * 批处理应用工具函数
 * 🎯 Application层专用批处理工具
 */
export class BatchApplicationUtil {
  /**
   * 根据场景获取推荐的批处理配置
   */
  static getScenarioConfig(scenario: keyof typeof BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS) {
    return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS[scenario];
  }

  /**
   * 根据数据量动态调整批量大小
   */
  static calculateOptimalBatchSize(
    totalItems: number,
    memoryLimitMB: number,
    targetProcessingTimeMs: number
  ): number {
    // 基于内存限制计算
    const memoryBasedSize = Math.floor(memoryLimitMB * CORE_VALUES.QUANTITIES.TEN);
    
    // 基于处理时间计算
    const timeBasedSize = Math.floor(targetProcessingTimeMs / CORE_VALUES.QUANTITIES.HUNDRED);
    
    // 基于总数据量计算
    const volumeBasedSize = Math.min(totalItems / CORE_VALUES.QUANTITIES.TEN, CORE_VALUES.QUANTITIES.THOUSAND);
    
    // 取最小值作为最优批量大小
    return Math.max(
      CORE_VALUES.QUANTITIES.ONE,
      Math.min(memoryBasedSize, timeBasedSize, volumeBasedSize)
    );
  }

  /**
   * 验证批处理配置
   */
  static validateBatchConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.DEFAULT_BATCH_SIZE || config.DEFAULT_BATCH_SIZE < 1) {
      errors.push('默认批量大小必须大于0');
    }
    
    if (!config.MAX_BATCH_SIZE || config.MAX_BATCH_SIZE < config.DEFAULT_BATCH_SIZE) {
      errors.push('最大批量大小不能小于默认批量大小');
    }
    
    if (!config.TIMEOUT_MS || config.TIMEOUT_MS < CORE_VALUES.QUANTITIES.HUNDRED) {
      errors.push('超时时间必须至少100毫秒');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取场景推荐配置
   */
  static getRecommendationForDataVolume(itemCount: number) {
    if (itemCount <= CORE_VALUES.QUANTITIES.HUNDRED) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.DATA_FETCHER;
    } else if (itemCount <= CORE_VALUES.QUANTITIES.THOUSAND) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.RECEIVER;
    } else if (itemCount <= CORE_VALUES.QUANTITIES.TEN_THOUSAND) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.STORAGE;
    } else {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.IMPORT_EXPORT;
    }
  }

  /**
   * 计算预估处理时间
   */
  static estimateProcessingTime(
    totalItems: number,
    batchSize: number,
    itemProcessingTimeMs: number
  ): number {
    const batches = Math.ceil(totalItems / batchSize);
    return batches * itemProcessingTimeMs;
  }
}

/**
 * 类型定义
 */
export type BatchApplicationConfig = typeof BATCH_APPLICATION_CONFIG;