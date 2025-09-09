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

// 导入Semantic层的缓存常量（推荐做法）
import { 
  CACHE_KEY_PREFIX_SEMANTICS,
  CACHE_SIZE_SEMANTICS,
  CACHE_CONNECTION_SEMANTICS,
  CACHE_MONITORING_SEMANTICS,
  CACHE_ADVANCED_STRATEGY_SEMANTICS,
  EnhancedCacheSemanticsUtil
} from "../../common/constants/semantic/cache-semantics.constants";



// 导入模块化常量定义
import type { SerializerType } from './config/data-formats.constants';
import { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES } from './config/data-formats.constants';

// 导出类型以供外部使用
export type { SerializerType };
// 旧的TTL配置导入已移除，使用简化版本
import { CACHE_KEYS as MODULAR_CACHE_KEYS } from './config/cache-keys.constants';
import { CACHE_CORE_OPERATIONS } from './operations/core-operations.constants';
import { CACHE_EXTENDED_OPERATIONS } from './operations/extended-operations.constants';
import { CACHE_INTERNAL_OPERATIONS } from './operations/internal-operations.constants';
import { CACHE_STATUS } from './status/cache-status.constants';
// 旧的健康状态导入已移除，使用统一的健康状态定义
import { CACHE_MESSAGES } from './messages/cache-messages.constants';
import { CACHE_METRICS } from './metrics/cache-metrics.constants';

// ============================================================================
// 向后兼容导出 - 重新导出模块化常量
// ============================================================================

// 重新导出新版结构化常量，移除冗余的迁移映射

// 重新导出TTL配置 - 使用简化版本消除多层引用
export { SIMPLIFIED_TTL_CONFIG as CACHE_TTL_CONFIG, TTL_VALUES as CACHE_TTL } from './config/simplified-ttl-config.constants';

// 重新导出操作常量
export { CACHE_CORE_OPERATIONS, CACHE_EXTENDED_OPERATIONS, CACHE_INTERNAL_OPERATIONS };

// 重新导出状态相关常量和类型
export { CACHE_STATUS };
// 导出统一的健康状态定义
export type { 
  CacheHealthStatus, 
  BasicHealthStatus, 
  CacheExtendedHealthStatus
} from './status/unified-health-status.constants';
export {
  BASIC_HEALTH_STATUSES as BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUSES as EXTENDED_HEALTH_STATUS_VALUES,
  mapToBasicStatus as mapInternalToExternalStatus
} from './status/unified-health-status.constants';

// 🔄 选择单一指标结构，删除重复的扁平化版本
// ✅ 标准版本：保持完整的4层嵌套结构（NAMES、LABELS、VALUES、CONFIG）
// 📋 删除 CACHE_METRICS_FLAT 以减少维护复杂度
export { CACHE_METRICS };

// 重新导出数据格式常量和类型
export { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES };

// 移除以下重复的常量，改为导出通用配置
// 创建一个兼容的CACHE_CONSTANTS对象
export const CACHE_CONSTANTS = Object.freeze({
  TTL_SETTINGS: {
  },
  KEY_PREFIXES: CACHE_KEY_PREFIX_SEMANTICS,
  SIZE_LIMITS: {
    MAX_KEY_LENGTH: 255,
    MAX_VALUE_SIZE_MB: CACHE_SIZE_SEMANTICS.ENTRY_SIZE.MAX_BYTES / (1024 * 1024),
    // 添加缺失的配置
    COMPRESSION_THRESHOLD_KB: 10, // 10KB压缩阈值
    MAX_BATCH_SIZE: CACHE_SIZE_SEMANTICS.BATCH_OPERATIONS.MAX_SIZE, // 最大批量大小
  },
  // 添加监控配置
  MONITORING_CONFIG: {
    SLOW_OPERATION_MS: CACHE_MONITORING_SEMANTICS.MONITORING.SLOW_OPERATION_MS, // 慢操作阈值
  },
  // 添加Redis配置
  REDIS_CONFIG: {
    RETRY_DELAY_MS: CACHE_CONNECTION_SEMANTICS.REDIS.RETRY_DELAY_MS, // 重试延迟
  },
});

// 向后兼容导出 - 重新导出缓存键值
export { MODULAR_CACHE_KEYS as CACHE_KEYS };

// 重新导出消息常量
export { CACHE_MESSAGES };
export const { 
  ERRORS: CACHE_ERROR_MESSAGES, 
  WARNINGS: CACHE_WARNING_MESSAGES, 
  SUCCESS: CACHE_SUCCESS_MESSAGES 
} = CACHE_MESSAGES;

// 向后兼容操作常量导出
export { CACHE_CORE_OPERATIONS as CACHE_OPERATIONS };