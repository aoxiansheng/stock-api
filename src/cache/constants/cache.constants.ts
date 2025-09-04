/**
 * 缓存服务常量 - 向后兼容接口
 * 🎯 统一定义缓存相关的常量，确保系统一致性
 * ⚠️  本文件保持向后兼容，推荐使用模块化导入
 * 
 * 新的模块化结构：
 * - config/ : 配置相关常量（数据格式、TTL、键值）
 * - operations/ : 操作相关常量（核心、扩展、内部）
 * - status/ : 状态相关常量（缓存状态、健康状态）
 * - messages/ : 消息相关常量（错误、警告、成功）
 * - metrics/ : 指标相关常量（Prometheus指标）
 */

import { CACHE_CONSTANTS } from "../../common/constants/unified/unified-cache-config.constants";

// 导入模块化常量定义
import type { SerializerType } from './config/data-formats.constants';
import { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES } from './config/data-formats.constants';

// 导出类型以供外部使用
export type { SerializerType };
import { CACHE_TTL_CONFIG, CACHE_TTL } from './config/ttl-config.constants';
import { CACHE_KEYS as MODULAR_CACHE_KEYS, CACHE_KEY_GENERATORS } from './config/cache-keys.constants';
import { CACHE_CORE_OPERATIONS } from './operations/core-operations.constants';
import { CACHE_EXTENDED_OPERATIONS } from './operations/extended-operations.constants';
import { CACHE_INTERNAL_OPERATIONS } from './operations/internal-operations.constants';
import { CACHE_STATUS } from './status/cache-status.constants';
import type { BasicHealthStatus, ExtendedHealthStatus } from './status/health-status.constants';
import { BASIC_HEALTH_STATUS_VALUES, EXTENDED_HEALTH_STATUS_VALUES, mapInternalToExternalStatus } from './status/health-status.constants';
import { CACHE_MESSAGES } from './messages/cache-messages.constants';
import { CACHE_METRICS as MODULAR_CACHE_METRICS } from './metrics/cache-metrics.constants';

// ============================================================================
// 向后兼容导出 - 重新导出模块化常量
// ============================================================================

/**
 * 缓存错误消息常量
 * @deprecated 推荐使用 import { CACHE_MESSAGES } from './messages/cache-messages.constants'
 */
export const CACHE_ERROR_MESSAGES = CACHE_MESSAGES.ERRORS;

/**
 * 缓存警告消息常量  
 * @deprecated 推荐使用 import { CACHE_MESSAGES } from './messages/cache-messages.constants'
 */
export const CACHE_WARNING_MESSAGES = CACHE_MESSAGES.WARNINGS;

/**
 * 缓存成功消息常量
 * @deprecated 推荐使用 import { CACHE_MESSAGES } from './messages/cache-messages.constants'  
 */
export const CACHE_SUCCESS_MESSAGES = CACHE_MESSAGES.SUCCESS;

/**
 * 缓存键常量 - 合并模块化和业务键值
 * 注：更多通用键前缀请使用 CACHE_CONSTANTS.KEY_PREFIXES
 * @deprecated 推荐使用 import { CACHE_KEYS } from './config/cache-keys.constants'
 */
export const CACHE_KEYS = Object.freeze({
  // 从模块化常量导入
  ...MODULAR_CACHE_KEYS,
  // 保留原有业务键值以确保向后兼容
  STOCK_QUOTE: "stock:quote:",
  STOCK_BASIC_INFO: "stock:basic:",
  INDEX_QUOTE: "index:quote:",
  MARKET_STATUS: "market:status:",
  SYMBOL_MAPPING: "symbol:mapping:",
  DATA_MAPPING: "data:mapping:",
  LOCK_PREFIX: CACHE_CONSTANTS.KEY_PREFIXES.LOCK,
  HEALTH_CHECK_PREFIX: CACHE_CONSTANTS.KEY_PREFIXES.HEALTH,
} as const);

// 重新导出TTL配置
export { CACHE_TTL_CONFIG, CACHE_TTL };

// 重新导出操作常量
export { CACHE_CORE_OPERATIONS, CACHE_EXTENDED_OPERATIONS, CACHE_INTERNAL_OPERATIONS };

/**
 * 缓存操作常量（统一入口）
 * @deprecated 使用分层的 CACHE_CORE_OPERATIONS, CACHE_EXTENDED_OPERATIONS, CACHE_INTERNAL_OPERATIONS 替代
 * 
 * 🎯 废弃原因：
 * 1. 语义混乱：将高频核心操作与低频扩展操作混合定义
 * 2. 暴露过多：内部实现操作不应对外暴露
 * 3. 可维护性：单一大对象难以按用途管理
 * 
 * 🔄 迁移指南：
 * ```typescript
 * // ❌ 旧方式（已废弃）
 * import { CACHE_OPERATIONS } from './cache.constants'
 * const operation = CACHE_OPERATIONS.SET;
 * 
 * // ✅ 新方式（推荐）
 * import { CACHE_CORE_OPERATIONS } from './cache.constants'
 * const operation = CACHE_CORE_OPERATIONS.SET;
 * ```
 * 
 * ⚠️  兼容性说明：
 * - 此对象将在 v2.0 版本中移除
 * - 所有操作已迁移到分层常量中
 * - 数据结构完全兼容，无需修改业务逻辑
 * 
 * @since v1.2.0 废弃
 * @removed v2.0.0 计划移除
 */
export const CACHE_OPERATIONS = Object.freeze({
  // 核心操作
  ...CACHE_CORE_OPERATIONS,
  // 扩展操作
  ...CACHE_EXTENDED_OPERATIONS,
  // 内部操作
  ...CACHE_INTERNAL_OPERATIONS,
} as const);

// 重新导出状态相关常量和类型
export { CACHE_STATUS };
export { BasicHealthStatus, ExtendedHealthStatus, BASIC_HEALTH_STATUS_VALUES, EXTENDED_HEALTH_STATUS_VALUES, mapInternalToExternalStatus };

/**
 * 缓存性能指标常量
 * @deprecated 推荐使用 import { CACHE_METRICS } from './metrics/cache-metrics.constants'
 */
export const CACHE_METRICS = Object.freeze({
  HITS: "cache_hits",
  MISSES: "cache_misses",
  HIT_RATE: "cache_hit_rate",
  MISS_RATE: "cache_miss_rate",
  MEMORY_USAGE: "cache_memory_usage",
  KEY_COUNT: "cache_key_count",
  AVERAGE_TTL: "cache_avg_ttl",
  OPERATION_DURATION: "cache_operation_duration",
  COMPRESSION_RATIO: "cache_compression_ratio",
  LOCK_WAIT_TIME: "cache_lock_wait_time",
  BATCH_SIZE: "cache_batch_size",
  ERROR_COUNT: "cache_error_count",
  SLOW_OPERATIONS: "cache_slow_operations",
} as const);

// 重新导出数据格式常量和类型
export { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES };

// 移除以下重复的常量，改为导出通用配置
export { CACHE_CONSTANTS };
