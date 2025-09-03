/**
 * 缓存常量统一导出
 * 🎯 符合开发规范指南 - 提供向后兼容的统一导出接口
 * 
 * 导出策略：
 * 1. 保持原有导出名称不变，确保向后兼容
 * 2. 按功能分类组织新的模块化导出
 * 3. 提供过渡期的 @deprecated 标注
 */

// ============================================================================
// 向后兼容导出 - 保持原有接口不变
// ============================================================================

// 重新导出原有的所有定义，确保现有代码不受影响
export * from './cache.constants';

// ============================================================================
// 新的模块化导出 - 按功能分类组织（避免命名冲突）
// ============================================================================

// 配置相关常量
export { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES } from './config/data-formats.constants';

// 配置相关类型
export type { SerializerType } from './config/data-formats.constants';
export { CACHE_TTL_CONFIG } from './config/ttl-config.constants';
export { CACHE_KEY_GENERATORS } from './config/cache-keys.constants';

// 操作相关常量  
export { CACHE_CORE_OPERATIONS } from './operations/core-operations.constants';
export { CACHE_EXTENDED_OPERATIONS } from './operations/extended-operations.constants';
export { CACHE_INTERNAL_OPERATIONS } from './operations/internal-operations.constants';

// 状态相关常量
export { CACHE_STATUS } from './status/cache-status.constants';
export { BASIC_HEALTH_STATUS_VALUES, EXTENDED_HEALTH_STATUS_VALUES, mapInternalToExternalStatus } from './status/health-status.constants';

// 状态相关类型
export type { BasicHealthStatus, ExtendedHealthStatus } from './status/health-status.constants';

// 消息相关常量 
export { CACHE_MESSAGES, CACHE_MESSAGE_TEMPLATES } from './messages/cache-messages.constants';

// 指标相关常量
export { CACHE_METRICS_HELP } from './metrics/cache-metrics.constants';

// ============================================================================
// 命名空间导出 - 提供结构化访问方式
// ============================================================================

import type { SerializerType } from './config/data-formats.constants';
import { CACHE_DATA_FORMATS, SERIALIZER_TYPE_VALUES } from './config/data-formats.constants';
import { CACHE_TTL_CONFIG, CACHE_TTL } from './config/ttl-config.constants';
import { CACHE_KEYS, CACHE_KEY_GENERATORS } from './config/cache-keys.constants';
import { CACHE_CORE_OPERATIONS } from './operations/core-operations.constants';
import { CACHE_EXTENDED_OPERATIONS } from './operations/extended-operations.constants';
import { CACHE_INTERNAL_OPERATIONS } from './operations/internal-operations.constants';
import { CACHE_STATUS, CACHE_STATUS_VALUES } from './status/cache-status.constants';
import type { BasicHealthStatus, ExtendedHealthStatus } from './status/health-status.constants';
import { BASIC_HEALTH_STATUS_VALUES, EXTENDED_HEALTH_STATUS_VALUES, mapInternalToExternalStatus } from './status/health-status.constants';
import { CACHE_MESSAGES, CACHE_MESSAGE_TEMPLATES } from './messages/cache-messages.constants';
import { CACHE_METRICS, CACHE_METRICS_HELP } from './metrics/cache-metrics.constants';

/**
 * 结构化的缓存常量命名空间
 * 提供清晰的分类访问方式
 */
export const CacheConstants = Object.freeze({
  // 配置
  Config: {
    DataFormats: CACHE_DATA_FORMATS,
    TTL: CACHE_TTL_CONFIG,
    Keys: CACHE_KEYS,
    KeyGenerators: CACHE_KEY_GENERATORS,
  },
  
  // 操作
  Operations: {
    Core: CACHE_CORE_OPERATIONS,
    Extended: CACHE_EXTENDED_OPERATIONS,
    Internal: CACHE_INTERNAL_OPERATIONS,
  },
  
  // 状态
  Status: {
    Cache: CACHE_STATUS,
    Health: {
      Basic: BASIC_HEALTH_STATUS_VALUES,
      Extended: EXTENDED_HEALTH_STATUS_VALUES,
      Mapper: mapInternalToExternalStatus,
    }
  },
  
  // 消息
  Messages: {
    Templates: CACHE_MESSAGES,
    Generators: CACHE_MESSAGE_TEMPLATES,
  },
  
  // 指标
  Metrics: {
    Names: CACHE_METRICS,
    Help: CACHE_METRICS_HELP,
  }
} as const);

// ============================================================================
// 类型导出 - 确保类型定义可用
// ============================================================================

// 注：类型已通过上面的具体导出包含，无需重复导出
// SerializerType, BasicHealthStatus, ExtendedHealthStatus 已在上面导出
// CacheStatus 类型定义在 ./status/cache-status.constants.ts 中

// ============================================================================
// 过渡期辅助工具
// ============================================================================

/**
 * 模块化迁移指南
 * 
 * @deprecated 推荐使用模块化导入方式：
 * 
 * ```typescript
 * // 旧方式（仍然支持）
 * import { CACHE_STATUS, CACHE_TTL } from '@/cache/constants';
 * 
 * // 新方式（推荐）
 * import { CACHE_STATUS } from '@/cache/constants/status/cache-status.constants';
 * import { CACHE_TTL_CONFIG } from '@/cache/constants/config/ttl-config.constants';
 * 
 * // 命名空间方式
 * import { CacheConstants } from '@/cache/constants';
 * const status = CacheConstants.Status.Cache.HEALTHY;
 * ```
 */
export const MIGRATION_GUIDE = Object.freeze({
  "从cache.constants.ts迁移到模块化结构": {
    "CACHE_STATUS": "status/cache-status.constants.ts",
    "CACHE_TTL": "config/ttl-config.constants.ts", 
    "CACHE_DATA_FORMATS": "config/data-formats.constants.ts",
    "操作相关常量": "operations/*.constants.ts",
    "消息相关常量": "messages/cache-messages.constants.ts",
    "指标相关常量": "metrics/cache-metrics.constants.ts",
  }
} as const);