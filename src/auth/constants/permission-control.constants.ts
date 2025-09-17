/**
 * 权限控制固定标准常量 - 业务规则和枚举标准
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 *
 * ✅ 保留内容：权限级别、主体类型、状态枚举、验证正则、业务分组等固定标准
 * 🔧 已迁移内容：TTL配置、超时设置、数量限制、时间间隔等可配置参数
 *
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 */

import { deepFreeze } from "../../common/utils/object-immutability.util";

// ⚠️  已迁移：权限检查配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERMISSION_CHECK 获取
// 📋 迁移到：authConfig.cache (缓存TTL) 和 authConfig.limits (超时、数量限制、阈值)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERMISSION_CHECK 替代
 * 权限检查配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 CACHE_TTL_SECONDS, CHECK_TIMEOUT_MS, MAX_PERMISSIONS_PER_CHECK,
 * MAX_ROLES_PER_CHECK, SLOW_CHECK_THRESHOLD_MS, MAX_CACHE_KEY_LENGTH
 * 现在都支持环境变量配置
 */

// 🔄 重新导出统一常量，保持向后兼容性
export {
  PERMISSION_LEVELS,
  PERMISSION_SUBJECTS,
  PERMISSION_CHECK_STATUS,
  PERMISSION_VALIDATION,
  PERMISSION_GROUPS,
  PERMISSION_CHECK_OPTIONS,
  PERMISSION_INHERITANCE,
  PERMISSION_CONFIG,
} from "./auth-semantic.constants";

// ⚠️  已迁移：验证长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
// 📋 迁移到：authConfig.limits (主体ID长度、权限名长度、角色名长度限制)
/**
 * @deprecated 长度限制已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
 * 原 MIN_SUBJECT_ID_LENGTH, MAX_SUBJECT_ID_LENGTH, MIN_PERMISSION_NAME_LENGTH,
 * MAX_PERMISSION_NAME_LENGTH, MIN_ROLE_NAME_LENGTH, MAX_ROLE_NAME_LENGTH
 * 现在都支持环境变量配置
 */

// ⚠️  已迁移：权限时间配置 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.PERMISSION_TIMING 获取
// 📋 迁移到：authConfig.limits (超时设置、时间间隔、批次大小)
/**
 * @deprecated 使用 AuthConfigCompatibilityWrapper.PERMISSION_TIMING 替代
 * 权限时间配置已迁移到统一配置系统，支持环境变量动态调整
 * 原 CHECK_TIMEOUT_MS, CACHE_REFRESH_INTERVAL_MS, INVALIDATION_BATCH_SIZE,
 * CLEANUP_INTERVAL_MS, METRICS_COLLECTION_INTERVAL_MS 现在都支持环境变量配置
 */
