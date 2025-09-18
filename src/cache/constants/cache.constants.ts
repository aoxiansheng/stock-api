/**
 * 缓存服务常量 - 统一导出
 */

// 导入Semantic层的缓存常量（推荐做法）
import { CACHE_KEY_PREFIX_SEMANTICS } from "../../common/constants/semantic/cache-semantics.constants";

// 导入模块化常量定义
import type { SerializerType } from "./config/data-formats.constants";
import {
  CACHE_DATA_FORMATS,
  SERIALIZER_TYPE_VALUES,
} from "./config/data-formats.constants";

// 导出类型以供外部使用
export type { SerializerType };
// 配置相关常量导入
import { CACHE_KEYS as MODULAR_CACHE_KEYS } from "./config/cache-keys.constants";
import { CACHE_STATUS } from "./status/cache-status.constants";
// 消息常量导入
import { CACHE_MESSAGES } from "./messages/cache-messages.constants";

// 重新导出模块化常量

// 重新导出操作常量
export {
  CACHE_CORE_OPERATIONS,
  CACHE_EXTENDED_OPERATIONS,
  CACHE_INTERNAL_OPERATIONS,
  CACHE_OPERATIONS,
  type CacheOperation,
} from "./operations/cache-operations.constants";

// 重新导出状态相关常量和类型
export { CACHE_STATUS };
// 导出统一的健康状态定义
export type {
  CacheHealthStatus,
  BasicHealthStatus,
  CacheExtendedHealthStatus,
} from "./status/unified-health-status.constants";
export {
  BASIC_HEALTH_STATUSES as BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUSES as EXTENDED_HEALTH_STATUS_VALUES,
  mapToBasicStatus as mapInternalToExternalStatus,
} from "./status/unified-health-status.constants";


// 重新导出数据格式常量和类型
export { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES };

// 配置常量
export const CACHE_CONSTANTS = Object.freeze({
  // 语义化键前缀（固定业务标准，不可配置）
  KEY_PREFIXES: CACHE_KEY_PREFIX_SEMANTICS,

  // 配置项访问指南
  CONFIG_ACCESS: {
    unified: "Use @Inject('cacheUnified') ConfigType<typeof cacheUnifiedConfig>",
    legacy: "Use CacheService.getTtlByTimeliness() for compatibility",
    migration: "Legacy compatibility files have been removed - use unified config",
  },
});

// 向后兼容导出 - 重新导出缓存键值
export { MODULAR_CACHE_KEYS as CACHE_KEYS };

// 重新导出消息常量
export { CACHE_MESSAGES };

// 统一DTO接口导出
export type {
  CacheStatistics,
  KeyPattern,
  SizeFields,
  TTLFields,
  CacheConfigSizeInfo,
  CompressionSizeInfo,
  BatchSizeInfo,
  RequiredTTL,
  OptionalTTL,
  CacheItemInfo,
  CacheItemDetails,
  CacheOperationMeta,
} from "../dto/shared/cache-shared.interfaces";
