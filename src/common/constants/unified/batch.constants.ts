/**
 * 批处理相关统一常量
 * 统一管理系统中的批量操作配置
 * 
 * 设计原则：
 * - 性能优化：合理的批量大小避免内存压力
 * - 差异化配置：不同业务场景使用适合的批量大小
 * - 防止过载：设置合理的并发限制
 * - 可扩展性：支持动态调整批量大小
 */

import { deepFreeze } from "@common/utils/object-immutability.util";

export const BATCH_CONSTANTS = deepFreeze({
  // 默认批量配置
  DEFAULT_SETTINGS: {
    MAX_BATCH_SIZE: 1000,              // 最大批量大小
    DEFAULT_BATCH_SIZE: 100,           // 默认批量大小
    MIN_BATCH_SIZE: 1,                 // 最小批量大小
    OPTIMAL_BATCH_SIZE: 50,            // 最优批量大小（平衡性能与资源）
    
    // 并发控制
    MAX_CONCURRENT_BATCHES: 5,         // 最大并发批次数
    MAX_CONCURRENT_OPERATIONS: 10,     // 最大并发操作数
    
    // 分页配置
    DEFAULT_PAGE_SIZE: 10,             // 默认分页大小
    MAX_PAGE_SIZE: 100,               // 最大分页大小
    MIN_PAGE_SIZE: 1,                  // 最小分页大小
  },
  
  // 业务场景特定批量配置
  BUSINESS_SCENARIOS: {
    // 数据获取场景
    DATA_FETCHER: {
      DEFAULT_BATCH_SIZE: 20,           // 保留当前业务配置
      MAX_BATCH_SIZE: 50,
      MAX_CONCURRENT_REQUESTS: 10,
      EXPLANATION: "数据获取场景使用较小批量，避免API限流",
    },
    
    // 接收器场景
    RECEIVER: {
      DEFAULT_BATCH_SIZE: 100,          // 接收器标准批量
      MAX_BATCH_SIZE: 500,
      MAX_CONCURRENT_OPERATIONS: 10,
    },
    
    // 存储操作场景
    STORAGE: {
      BULK_INSERT_SIZE: 500,            // 批量插入大小
      BULK_UPDATE_SIZE: 200,            // 批量更新大小
      BULK_DELETE_SIZE: 100,            // 批量删除大小
      MAX_TRANSACTION_SIZE: 1000,       // 最大事务大小
      EXPLANATION: "存储操作需要平衡性能和事务安全",
    },
    
    // 符号映射场景
    SYMBOL_MAPPER: {
      DEFAULT_BATCH_SIZE: 100,          // 符号批量映射
      MAX_BATCH_SIZE: 1000,
      CACHE_BATCH_SIZE: 200,            // 缓存批量操作大小
    },
    
    // 数据映射场景
    DATA_MAPPER: {
      DEFAULT_BATCH_SIZE: 100,
      MAX_BATCH_SIZE: 500,
      FIELD_MAPPING_BATCH_SIZE: 50,     // 字段映射批量大小
    },
    
    // 通知发送场景
    NOTIFICATION: {
      DEFAULT_BATCH_SIZE: 50,           // 通知批量发送
      MAX_BATCH_SIZE: 100,
      MAX_CONCURRENT_SENDS: 5,          // 最大并发发送数
      EXPLANATION: "通知发送需要控制频率，避免被标记为垃圾邮件",
    },
    
    // 查询场景
    QUERY: {
      DEFAULT_BATCH_SIZE: 100,          // 查询默认批量
      MAX_BATCH_SIZE: 1000,
      THREE_LEVEL_BATCH: {              // 三级并行批处理
        LEVEL_1_SIZE: 10,               // 第一级批量大小
        LEVEL_2_SIZE: 100,              // 第二级批量大小
        LEVEL_3_SIZE: 1000,             // 第三级批量大小
      },
    },
    
    // 缓存操作场景
    CACHE: {
      DEFAULT_BATCH_SIZE: 100,
      MAX_BATCH_SIZE: 1000,
      PIPELINE_BATCH_SIZE: 50,          // Redis pipeline批量大小
      SCAN_COUNT: 100,                  // Redis SCAN命令每次返回数量
    },
    
    // 数据导入导出场景
    DATA_IMPORT_EXPORT: {
      IMPORT_BATCH_SIZE: 1000,          // 导入批量大小
      EXPORT_BATCH_SIZE: 5000,          // 导出批量大小
      STREAM_CHUNK_SIZE: 10000,         // 流式处理块大小
      MAX_FILE_BATCH_SIZE: 10000,       // 文件处理最大批量
    },
    
    // 监控指标场景
    METRICS: {
      DEFAULT_BATCH_SIZE: 100,          // 指标收集批量
      AGGREGATION_BATCH_SIZE: 500,      // 聚合计算批量
      MAX_METRICS_PER_REQUEST: 1000,    // 单次请求最大指标数
    },
  },
  
  // 批量处理策略
  BATCH_STRATEGIES: {
    // 固定大小策略
    FIXED_SIZE: {
      TYPE: 'FIXED',
      DESCRIPTION: '使用固定的批量大小',
    },
    
    // 动态调整策略
    DYNAMIC: {
      TYPE: 'DYNAMIC',
      DESCRIPTION: '根据性能指标动态调整批量大小',
      MIN_ADJUSTMENT: 0.5,              // 最小调整比例
      MAX_ADJUSTMENT: 2.0,              // 最大调整比例
      ADJUSTMENT_INTERVAL_MS: 60000,    // 调整间隔：1分钟
    },
    
    // 自适应策略
    ADAPTIVE: {
      TYPE: 'ADAPTIVE',
      DESCRIPTION: '根据系统负载自适应调整',
      LOAD_THRESHOLDS: {
        LOW: 0.3,                       // 低负载阈值
        MEDIUM: 0.6,                    // 中负载阈值
        HIGH: 0.8,                      // 高负载阈值
      },
    },
    
    // 时间窗口策略
    TIME_WINDOW: {
      TYPE: 'TIME_WINDOW',
      DESCRIPTION: '在固定时间窗口内处理尽可能多的项目',
      WINDOW_SIZE_MS: 1000,             // 时间窗口大小：1秒
      MIN_ITEMS: 1,                     // 最小处理项目数
    },
  },
  
  // 批量操作限制
  BATCH_LIMITS: {
    // 内存限制
    MAX_MEMORY_PER_BATCH_MB: 100,      // 每批次最大内存使用
    MAX_TOTAL_MEMORY_MB: 500,          // 总内存使用限制
    
    // 时间限制
    MAX_BATCH_PROCESSING_TIME_MS: 30000, // 单批次最大处理时间
    BATCH_TIMEOUT_MS: 60000,           // 批处理超时时间
    
    // 错误限制
    MAX_ERRORS_PER_BATCH: 10,          // 每批次最大错误数
    ERROR_RATE_THRESHOLD: 0.1,         // 错误率阈值（10%）
  },
});

// 导出类型定义
export type BatchScenario = keyof typeof BATCH_CONSTANTS.BUSINESS_SCENARIOS;
export type BatchStrategy = keyof typeof BATCH_CONSTANTS.BATCH_STRATEGIES;

/**
 * 获取特定场景的批量配置
 * @param scenario 业务场景
 */
export function getBatchSettings(scenario: BatchScenario): any {
  return BATCH_CONSTANTS.BUSINESS_SCENARIOS[scenario] || BATCH_CONSTANTS.DEFAULT_SETTINGS;
}

/**
 * 计算最优批量大小
 * @param totalItems 总项目数
 * @param scenario 业务场景
 */
export function calculateOptimalBatchSize(
  totalItems: number,
  scenario: BatchScenario = 'DATA_FETCHER'
): number {
  const settings: any = getBatchSettings(scenario);
  const defaultSize = settings.DEFAULT_BATCH_SIZE || BATCH_CONSTANTS.DEFAULT_SETTINGS.DEFAULT_BATCH_SIZE;
  const maxSize = settings.MAX_BATCH_SIZE || BATCH_CONSTANTS.DEFAULT_SETTINGS.MAX_BATCH_SIZE;
  
  // 如果总数很小，直接返回总数
  if (totalItems <= defaultSize) {
    return totalItems;
  }
  
  // 计算批次数，尽量保持在5-10批之间
  const idealBatches = 5;
  const calculatedSize = Math.ceil(totalItems / idealBatches);
  
  // 限制在最小和最大值之间
  return Math.min(maxSize, Math.max(defaultSize, calculatedSize));
}

/**
 * 分割数组为批次
 * @param items 要分割的数组
 * @param batchSize 批量大小
 */
export function splitIntoBatches<T>(items: T[], batchSize?: number): T[][] {
  const size = batchSize || BATCH_CONSTANTS.DEFAULT_SETTINGS.DEFAULT_BATCH_SIZE;
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  
  return batches;
}

/**
 * 判断批量大小是否合理
 * @param batchSize 批量大小
 * @param scenario 业务场景
 */
export function isValidBatchSize(
  batchSize: number,
  scenario: BatchScenario = 'DATA_FETCHER'
): boolean {
  const settings: any = getBatchSettings(scenario);
  const minSize = BATCH_CONSTANTS.DEFAULT_SETTINGS.MIN_BATCH_SIZE;
  const maxSize = settings.MAX_BATCH_SIZE || BATCH_CONSTANTS.DEFAULT_SETTINGS.MAX_BATCH_SIZE;
  
  return batchSize >= minSize && batchSize <= maxSize;
}

/**
 * 获取并发限制
 * @param scenario 业务场景
 */
export function getConcurrencyLimit(scenario: BatchScenario = 'DATA_FETCHER'): number {
  const settings: any = getBatchSettings(scenario);
  return (
    settings.MAX_CONCURRENT_OPERATIONS ||
    settings.MAX_CONCURRENT_REQUESTS ||
    settings.MAX_CONCURRENT_SENDS ||
    BATCH_CONSTANTS.DEFAULT_SETTINGS.MAX_CONCURRENT_OPERATIONS
  );
}