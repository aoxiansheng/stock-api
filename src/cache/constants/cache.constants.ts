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
export { CACHE_CONSTANTS };

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
