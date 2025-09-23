import { OPERATION_LIMITS } from "@common/constants/domain";
/**
 * 存储服务常量
 * 🎯 统一定义存储相关的常量，确保系统一致性
 */

import { NUMERIC_CONSTANTS } from "@common/constants/core";
import { HTTP_TIMEOUTS } from "@common/constants/semantic";
import { BATCH_SIZE_SEMANTICS } from "@common/constants/semantic";
import { RETRY_BUSINESS_SCENARIOS } from "@common/constants/semantic/retry-semantics.constants";
import { OperationStatus } from "@monitoring/contracts/enums/operation-status.enum";

// 注意：错误消息和警告消息已迁移到 storage-error-codes.constants.ts 中
// 统一使用 STORAGE_ERROR_MESSAGES 和 STORAGE_WARNING_MESSAGES
// 为了向后兼容性，重新导出这些常量
export {
  STORAGE_ERROR_MESSAGES,
  STORAGE_WARNING_MESSAGES,
  STORAGE_ERROR_CODES,
  STORAGE_ERROR_DESCRIPTIONS,
  StorageErrorCategories
} from './storage-error-codes.constants';

/**
 * 存储配置常量
 */
export const STORAGE_CONFIG = Object.freeze({
  DEFAULT_CACHE_TTL: 3600, // 默认缓存TTL（1小时）
  DEFAULT_COMPRESSION_THRESHOLD:
    parseInt(process.env.STORAGE_COMPRESS_THRESHOLD) || 5 * 1024, // 默认压缩阈值（5KB）
  DEFAULT_COMPRESSION_RATIO:
    parseFloat(process.env.STORAGE_COMPRESS_RATIO) || 0.8, // 默认压缩比例（80%）
  MAX_KEY_LENGTH: 250, // 最大键长度
  MAX_DATA_SIZE_MB: 16, // 最大数据大小（16MB）
  MAX_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH, // 最大批量操作大小 - 使用统一配置
  DEFAULT_RETRY_ATTEMPTS: RETRY_BUSINESS_SCENARIOS.STORAGE.maxAttempts, // 默认重试次数 - 使用统一配置
  DEFAULT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 默认超时时间 - 合并了重复的超时配置
  STATS_SAMPLE_SIZE: 100, // 统计样本大小
} as const);

/**
 * 存储性能阈值常量
 */
export const STORAGE_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_STORAGE_MS: NUMERIC_CONSTANTS.N_1000, // 慢存储操作阈值
  SLOW_RETRIEVAL_MS: NUMERIC_CONSTANTS.N_1000, // 慢检索操作阈值
  HIGH_ERROR_RATE: 0.05, // 高错误率阈值（5%）
  LOW_CACHE_HIT_RATE: 0.7, // 低缓存命中率阈值（70%）
  HIGH_MEMORY_USAGE_MB: NUMERIC_CONSTANTS.N_100, // 高内存使用阈值
  LARGE_DATA_SIZE_KB: 100, // 大数据阈值（100KB）
} as const);

/**
 * 存储指标名称常量
 */
export const STORAGE_METRICS = Object.freeze({
  STORAGE_OPERATIONS_TOTAL: "storage_operations_total",
  STORAGE_DURATION: "storage_duration",
  RETRIEVAL_DURATION: "retrieval_duration",
  CACHE_HIT_RATE: "cache_hit_rate",
  CACHE_MISS_RATE: "cache_miss_rate",
  COMPRESSION_RATIO: "compression_ratio",
  DATA_SIZE_BYTES: "data_size_bytes",
  ERROR_RATE: "error_rate",
  OPERATIONS_PER_SECOND: "operations_per_second",
  MEMORY_USAGE_BYTES: "memory_usage_bytes",
  TTL_REMAINING: "ttl_remaining",
  PERSISTENT_STORAGE_SIZE: "persistent_storage_size",
} as const);

/**
 * 存储操作类型常量
 */
export const STORAGE_OPERATIONS = Object.freeze({
  STORE: "store",
  RETRIEVE: "retrieve",
  DELETE: "delete",
  UPDATE: "update",
  COMPRESS: "compress",
  DECOMPRESS: "decompress",
  SERIALIZE: "serialize",
  DESERIALIZE: "deserialize",
  CACHE_UPDATE: "cache_update",
  STATS_GENERATION: "stats_generation",
} as const);

/**
 * 存储状态常量
 */
export const STORAGE_STATUS = Object.freeze({
  SUCCESS: "success",
  FAILED: "failed",
  PARTIAL_SUCCESS: "partial_success",
  TIMEOUT: "timeout",
  CANCELLED: "cancelled",
  PENDING: OperationStatus.PENDING,
  PROCESSING: "processing",
  NOT_FOUND: "not_found", // 从 STORAGE_SOURCES 迁移而来，语义上属于操作状态
} as const);

/**
 * 存储事件类型常量
 */
export const STORAGE_EVENTS = Object.freeze({
  DATA_STORED: "storage.data_stored",
  DATA_RETRIEVED: "storage.data_retrieved",
  DATA_DELETED: "storage.data_deleted",
  CACHE_HIT: "storage.cache_hit",
  CACHE_MISS: "storage.cache_miss",
  COMPRESSION_APPLIED: "storage.compression_applied",
  ERROR_OCCURRED: "storage.error_occurred",
  PERFORMANCE_WARNING: "storage.performance_warning",
  STATS_GENERATED: "storage.stats_generated",
} as const);

/**
 * 存储默认值常量
 */
export const STORAGE_DEFAULTS = Object.freeze({
  PROVIDER: "unknown",
  MARKET: "unknown",
  DATA_SIZE: 0,
  PROCESSING_TIME: 0,
  COMPRESSED: false,
  TTL: OPERATION_LIMITS.CACHE_TTL_SECONDS.HOURLY_CACHE, // 1小时
  CACHE_HIT_RATE: 0.85, // 85%默认命中率
  OPERATIONS_PER_SECOND: 0,
  ERROR_RATE: 0,
  MEMORY_USAGE: 0,
} as const);

/**
 * 存储键模式常量
 */
export const STORAGE_KEY_PATTERNS = Object.freeze({
  CACHE_KEY_SEPARATOR: ":",
  METADATA_SUFFIX: ":meta",
  STATS_PREFIX: "stats:",
  TEMP_PREFIX: "temp:",
  BACKUP_PREFIX: "backup:",
  INDEX_PREFIX: "index:",
} as const);

/**
 * 存储压缩配置常量
 */
export const STORAGE_COMPRESSION = Object.freeze({
  ALGORITHMS: {
    GZIP: "gzip",
    DEFLATE: "deflate",
    BROTLI: "brotli",
  },
  LEVELS: {
    FASTEST: 1,
    BALANCED: 6,
    BEST: 9,
  },
  DEFAULT_ALGORITHM: "gzip",
  DEFAULT_LEVEL: 6,
} as const);

/**
 * 存储批量操作配置常量
 */
export const STORAGE_BATCH_CONFIG = Object.freeze({
  MAX_CONCURRENT_OPERATIONS: 10, // 最大并发操作数
  BATCH_TIMEOUT_MS: 60000, // 批量操作超时（60秒）
  RETRY_DELAY_MS: 1000, // 重试延迟（1秒）
  MAX_RETRY_DELAY_MS: 10000, // 最大重试延迟（10秒）
  EXPONENTIAL_BACKOFF_FACTOR: 2, // 指数退避因子
} as const);

/**
 * 存储健康检查配置常量
 */
export const STORAGE_HEALTH_CONFIG = Object.freeze({
  CHECK_INTERVAL_MS: NUMERIC_CONSTANTS.N_30000, // 健康检查间隔 - 使用统一配置
  TIMEOUT_MS: 5000, // 健康检查超时（5秒）
  MAX_FAILURES: 3, // 最大失败次数
  RECOVERY_THRESHOLD: 5, // 恢复阈值
  METRICS_WINDOW_SIZE: 100, // 指标窗口大小
} as const);

/**
 * 存储清理配置常量
 */
export const STORAGE_CLEANUP_CONFIG = Object.freeze({
  CLEANUP_INTERVAL_MS: 3600000, // 清理间隔（1小时）
  EXPIRED_DATA_BATCH_SIZE: 1000, // 过期数据批量大小
  MAX_CLEANUP_DURATION_MS: 300000, // 最大清理时间（5分钟）
  RETENTION_DAYS: 30, // 数据保留天数
  ARCHIVE_THRESHOLD_DAYS: 7, // 归档阈值天数
} as const);
