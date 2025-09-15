/**
 * 验证限制配置重构说明 - 数值限制已迁移到统一配置系统
 * 🎯 重构说明：所有数值限制已迁移到统一配置系统
 * 
 * ⚠️  整个文件已弃用：所有验证限制数值现在通过环境变量动态配置
 * 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
 * 📋 迁移到：authConfig.limits (所有长度限制、性能限制、复杂度限制)
 * 
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 * 
 * @deprecated 整个文件已弃用，使用 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 替代
 */

// ⚠️  已迁移：通用长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
/**
 * @deprecated COMMON_LENGTH_LIMITS 已迁移到统一配置系统
 * 原 MIN_ID_LENGTH, MAX_ID_LENGTH, MIN_NAME_LENGTH, MAX_NAME_LENGTH,
 * MAX_STRING_LENGTH, MAX_DESCRIPTION_LENGTH 现在支持环境变量配置
 */

// ⚠️  已迁移：用户相关长度限制 - 现在使用统一配置系统  
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
/**
 * @deprecated USER_LENGTH_LIMITS 已迁移到统一配置系统
 * 原 USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, PASSWORD_MIN_LENGTH,
 * PASSWORD_MAX_LENGTH, EMAIL_MAX_LENGTH 现在支持环境变量配置
 */

// ⚠️  已迁移：API Key长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
/**
 * @deprecated API_KEY_LENGTH_LIMITS 已迁移到统一配置系统
 * 原 API_KEY_MIN_LENGTH, API_KEY_MAX_LENGTH, API_KEY_DEFAULT_LENGTH,
 * API_KEY_NAME_MIN_LENGTH, API_KEY_NAME_MAX_LENGTH, APP_KEY_MIN_LENGTH,
 * APP_KEY_MAX_LENGTH 现在支持环境变量配置
 */

// ⚠️  已迁移：权限控制长度限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
/**
 * @deprecated PERMISSION_LENGTH_LIMITS 已迁移到统一配置系统
 * 原 SUBJECT_ID_MIN_LENGTH, SUBJECT_ID_MAX_LENGTH, PERMISSION_NAME_MIN_LENGTH,
 * PERMISSION_NAME_MAX_LENGTH, ROLE_NAME_MIN_LENGTH, ROLE_NAME_MAX_LENGTH,
 * CACHE_KEY_MAX_LENGTH 现在支持环境变量配置
 */

// ⚠️  已迁移：系统性能限制 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取  
/**
 * @deprecated SYSTEM_PERFORMANCE_LIMITS 已迁移到统一配置系统
 * 原 MAX_PAYLOAD_SIZE_BYTES, MAX_PAYLOAD_SIZE_STRING, MAX_OBJECT_DEPTH,
 * MAX_OBJECT_FIELDS, MAX_STRING_LENGTH_COMPLEXITY, MAX_QUERY_PARAMS,
 * MAX_RECURSION_DEPTH, MAX_STRING_LENGTH_SANITIZE, FIND_LONG_STRING_THRESHOLD
 * 现在支持环境变量配置
 */

// ⚠️  已迁移：兼容性导出 - 现在使用统一配置系统
// 🔧 新的访问方式：通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 获取
/**
 * @deprecated VALIDATION_LIMITS 已迁移到统一配置系统
 * 所有验证限制现在通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 访问
 * 支持环境变量动态配置，具有合理的默认值和验证约束
 */

// 临时导出以避免编译错误 - 应该从使用方移除这些导入
export const VALIDATION_LIMITS = {
  // 已迁移到统一配置系统，这里提供空对象避免编译错误
  // 实际值应通过 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS 访问
};