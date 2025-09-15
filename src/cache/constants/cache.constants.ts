/**
 * 缓存服务常量 - 现代化统一导出
 * 🎯 统一定义缓存相关的常量，确保系统一致性
 * ✅ 已现代化：移除冗余兼容层，推荐使用直接模块化导入
 * 
 * 现代化模块结构（推荐直接导入）：
 * - config/ : 配置相关常量（数据格式、TTL、键值、限制）
 * - operations/ : 操作相关常量（核心、扩展、内部）
 * - status/ : 状态相关常量（缓存状态、健康状态）
 * - messages/ : 消息相关常量（错误、警告、成功）
 * 
 * ⚡ 新增统一配置：
 * - 限制配置: 通过cache-unified.config.ts统一管理
 * - TTL配置: 通过CacheService.getTtlByTimeliness()方法访问
 * - cache-shared.interfaces: 统一的DTO共享接口
 */

// 导入Semantic层的缓存常量（推荐做法）
import { 
  CACHE_KEY_PREFIX_SEMANTICS
} from "../../common/constants/semantic/cache-semantics.constants";



// 导入模块化常量定义
import type { SerializerType } from './config/data-formats.constants';
import { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES } from './config/data-formats.constants';

// 导出类型以供外部使用
export type { SerializerType };
// 配置相关常量导入
import { CACHE_KEYS as MODULAR_CACHE_KEYS } from './config/cache-keys.constants';
import { CACHE_STATUS } from './status/cache-status.constants';
// 消息常量导入
import { CACHE_MESSAGES } from './messages/cache-messages.constants';

// ============================================================================
// 向后兼容导出 - 重新导出模块化常量
// ============================================================================

// 重新导出新版结构化常量，移除冗余的迁移映射

// 🎯 TTL配置已迁移到统一配置文件
// TTL值现在通过 ConfigService 和 cache-unified.config.ts 获取
// 不再导出硬编码的TTL常量

// 重新导出操作常量
export { 
  CACHE_CORE_OPERATIONS,
  CACHE_EXTENDED_OPERATIONS, 
  CACHE_INTERNAL_OPERATIONS,
  CACHE_OPERATIONS,
  type CacheOperation 
} from './operations/cache-operations.constants';

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

// 🔄 缓存指标常量已移除
// 各子模块维护自己的指标定义：
// - symbol-mapper-cache: 符号映射缓存指标
// - smart-cache: 智能缓存指标
// - common-cache: 通用缓存指标

// 重新导出数据格式常量和类型
export { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES };

// 移除以下重复的常量，改为导出通用配置
// 创建一个兼容的CACHE_CONSTANTS对象
// 注意：配置相关的常量已移至 cache.config.ts，这里仅保留非配置类的结构化常量
export const CACHE_CONSTANTS = Object.freeze({
  KEY_PREFIXES: CACHE_KEY_PREFIX_SEMANTICS,
  // 其他配置已迁移至 ConfigService
});

// 向后兼容导出 - 重新导出缓存键值
export { MODULAR_CACHE_KEYS as CACHE_KEYS };

// 重新导出消息常量
export { CACHE_MESSAGES };

// ============================================================================
// 统一配置提供者导出 - 新增于第二轮优化
// ============================================================================

/**
 * 统一配置提供者类型导出
 * 🎯 替代分散的常量定义，提供统一的配置管理
 * 
 * 使用方式：
 * ```typescript
 * // 注入Provider
 * constructor(
 *   private readonly configService: ConfigService,
 *   private readonly cacheService: CacheService,
 * ) {}
 * 
 * // 使用统一配置
 * const cacheConfig = this.configService.get<CacheUnifiedConfig>('cacheUnified');
 * const batchLimit = cacheConfig.maxBatchSize;
 * const ttl = this.cacheService.getTtlByTimeliness('weak');
 * ```
 */
// 替换：统一配置类型已迁移到 cache-unified.config.ts
export type { CacheUnifiedConfig as CacheLimitsConfig } from '../config/cache-unified.config';
export type { CacheUnifiedConfig as CacheTtlConfig } from '../config/cache-unified.config';

/**
 * 统一DTO接口导出
 * 🎯 替代分散的小接口文件，减少文件碎片化
 * 
 * 包含的接口：
 * - CacheStatistics: 缓存统计信息
 * - KeyPattern: 键模式信息
 * - SizeFields: 大小字段信息
 * - TTLFields: TTL字段信息
 * - 以及组合接口
 */
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
  CacheOperationMeta
} from '../dto/shared/cache-shared.interfaces';

