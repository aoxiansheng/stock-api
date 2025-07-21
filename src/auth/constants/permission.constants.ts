/**
 * 权限服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

// 📝 操作名称常量
export const PERMISSION_OPERATIONS = Object.freeze({
  CHECK_PERMISSIONS: 'checkPermissions',
  INVALIDATE_CACHE: 'invalidateCacheFor',
  CREATE_CONTEXT: 'createPermissionContext',
  GET_EFFECTIVE_PERMISSIONS: 'getEffectivePermissions',
  COMBINE_PERMISSIONS: 'combinePermissions',
  PERFORM_PERMISSION_CHECK: 'performPermissionCheck',
  GENERATE_CACHE_KEY: 'generateCacheKey',
  GENERATE_CHECK_DETAILS: 'generateCheckDetails',
  LOG_PERMISSION_CHECK: 'logPermissionCheck',
  VALIDATE_SUBJECT: 'validateSubject',
  VALIDATE_PERMISSIONS: 'validatePermissions',
  VALIDATE_ROLES: 'validateRoles',
});

// 📢 消息常量
export const PERMISSION_MESSAGES = Object.freeze({
  // 成功消息
  CHECK_PASSED: '权限检查通过',
  CACHE_HIT: '权限检查命中缓存',
  CACHE_INVALIDATED: '权限缓存已失效',
  CONTEXT_CREATED: '权限上下文创建成功',
  EFFECTIVE_PERMISSIONS_RETRIEVED: '有效权限获取成功',
  PERMISSIONS_COMBINED: '权限列表合并成功',
  CACHE_KEY_GENERATED: '缓存键生成成功',
  
  // 错误消息
  CHECK_FAILED: '权限检查失败',
  CACHE_INVALIDATION_FAILED: '权限缓存失效失败',
  CONTEXT_CREATION_FAILED: '权限上下文创建失败',
  PERMISSION_VALIDATION_FAILED: '权限验证失败',
  ROLE_VALIDATION_FAILED: '角色验证失败',
  SUBJECT_VALIDATION_FAILED: '主体验证失败',
  CACHE_ACCESS_FAILED: '缓存访问失败',
  
  // 警告消息
  MISSING_PERMISSIONS_DETECTED: '检测到缺失权限',
  MISSING_ROLES_DETECTED: '检测到缺失角色',
  CACHE_MISS: '权限检查缓存未命中',
  SLOW_PERMISSION_CHECK: '权限检查响应较慢',
  INVALID_SUBJECT: '无效的权限主体',
  EMPTY_PERMISSIONS: '权限列表为空',
  
  // 信息消息
  NO_CACHE_TO_INVALIDATE: '未找到需要失效的权限缓存',
  PERMISSION_CHECK_STARTED: '开始权限检查',
  CACHE_INVALIDATION_STARTED: '开始权限缓存失效',
  CONTEXT_CREATION_STARTED: '开始创建权限上下文',
  EFFECTIVE_PERMISSIONS_LOOKUP: '查询有效权限',
  PERMISSIONS_COMBINATION_STARTED: '开始合并权限列表',
});

// 🎯 详情模板常量
export const PERMISSION_DETAIL_TEMPLATES = Object.freeze({
  CHECK_PASSED: '权限检查通过: {subjectName}',
  CHECK_FAILED: '权限检查失败: {subjectName}',
  MISSING_PERMISSIONS: '缺失权限: [{permissions}]',
  REQUIRED_ROLES: '要求角色之一: [{requiredRoles}], 当前角色: {currentRole}',
  SUBJECT_INFO: '主体信息: {subjectType}#{subjectId}',
  PERMISSION_SUMMARY: '权限摘要: 需要{requiredCount}个权限，拥有{grantedCount}个权限',
  ROLE_SUMMARY: '角色摘要: 需要角色[{requiredRoles}]，当前角色{currentRole}',
  DURATION_INFO: '检查耗时: {duration}ms',
  CACHE_INFO: '缓存状态: {cacheStatus}',
});

// 🔧 权限配置常量
export const PERMISSION_CONFIG = Object.freeze({
  DEFAULT_CACHE_TTL_SECONDS: 300, // 5分钟
  MAX_CACHE_KEY_LENGTH: 250,
  SLOW_CHECK_THRESHOLD_MS: 100,
  MAX_PERMISSIONS_PER_CHECK: 50,
  MAX_ROLES_PER_CHECK: 10,
  CACHE_KEY_SEPARATOR: ':',
  PERMISSION_LIST_SEPARATOR: ',',
  ROLE_LIST_SEPARATOR: ',',
});

// 📊 权限检查状态常量
export const PERMISSION_CHECK_STATUS = Object.freeze({
  ALLOWED: 'allowed',
  DENIED: 'denied',
  PARTIAL: 'partial',
  ERROR: 'error',
  CACHED: 'cached',
  FRESH: 'fresh',
});

// 🏷️ 权限主体类型常量
export const PERMISSION_SUBJECT_TYPES = Object.freeze({
  USER: 'user',
  API_KEY: 'api_key',
  SERVICE: 'service',
  SYSTEM: 'system',
  GUEST: 'guest',
  ADMIN: 'admin',
});

// 📈 权限指标常量
export const PERMISSION_METRICS = Object.freeze({
  CHECK_COUNT: 'permission_check_count',
  CHECK_DURATION: 'permission_check_duration',
  CACHE_HIT_RATE: 'permission_cache_hit_rate',
  CACHE_MISS_RATE: 'permission_cache_miss_rate',
  DENIED_COUNT: 'permission_denied_count',
  ALLOWED_COUNT: 'permission_allowed_count',
  SLOW_CHECK_COUNT: 'permission_slow_check_count',
  CACHE_INVALIDATION_COUNT: 'permission_cache_invalidation_count',
  CONTEXT_CREATION_COUNT: 'permission_context_creation_count',
  EFFECTIVE_PERMISSIONS_COUNT: 'permission_effective_count',
});

// 🎛️ 缓存键前缀常量
export const PERMISSION_CACHE_KEYS = Object.freeze({
  PERMISSION_CHECK: 'permission:check:',
  EFFECTIVE_PERMISSIONS: 'permission:effective:',
  ROLE_PERMISSIONS: 'permission:role:',
  SUBJECT_CACHE: 'permission:subject:',
  CONTEXT_CACHE: 'permission:context:',
  VALIDATION_CACHE: 'permission:validation:',
});

// 🔍 权限验证规则常量
export const PERMISSION_VALIDATION_RULES = Object.freeze({
  MIN_SUBJECT_ID_LENGTH: 1,
  MAX_SUBJECT_ID_LENGTH: 100,
  MIN_PERMISSION_NAME_LENGTH: 1,
  MAX_PERMISSION_NAME_LENGTH: 50,
  MIN_ROLE_NAME_LENGTH: 1,
  MAX_ROLE_NAME_LENGTH: 30,
  VALID_SUBJECT_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  VALID_PERMISSION_PATTERN: /^[a-zA-Z0-9_:.-]+$/,
  VALID_ROLE_PATTERN: /^[a-zA-Z0-9_-]+$/,
});

// ⚙️ 权限检查选项常量
export const PERMISSION_CHECK_OPTIONS = Object.freeze({
  STRICT_MODE: 'strict',
  LENIENT_MODE: 'lenient',
  CACHE_ENABLED: 'cache_enabled',
  CACHE_DISABLED: 'cache_disabled',
  LOG_ENABLED: 'log_enabled',
  LOG_DISABLED: 'log_disabled',
  DETAILED_RESULT: 'detailed_result',
  SIMPLE_RESULT: 'simple_result',
});

// 🎯 权限级别常量
export const PERMISSION_LEVELS = Object.freeze({
  NONE: 0,
  READ: 1,
  WRITE: 2,
  DELETE: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
});

// 📋 权限组常量
export const PERMISSION_GROUPS = Object.freeze({
  STOCK_DATA: 'stock_data',
  USER_MANAGEMENT: 'user_management',
  API_MANAGEMENT: 'api_management',
  SYSTEM_ADMIN: 'system_admin',
  MONITORING: 'monitoring',
  SECURITY: 'security',
  REPORTING: 'reporting',
  CONFIGURATION: 'configuration',
});

// 🔄 权限继承规则常量
export const PERMISSION_INHERITANCE = Object.freeze({
  ROLE_BASED: 'role_based',
  PERMISSION_BASED: 'permission_based',
  HYBRID: 'hybrid',
  NONE: 'none',
});

// ⏱️ 权限时间配置常量
export const PERMISSION_TIMING = Object.freeze({
  CHECK_TIMEOUT_MS: 5000,
  CACHE_REFRESH_INTERVAL_MS: 60000,
  INVALIDATION_BATCH_SIZE: 100,
  CLEANUP_INTERVAL_MS: 3600000, // 1小时
  METRICS_COLLECTION_INTERVAL_MS: 300000, // 5分钟
});

// 🚨 权限错误代码常量
export const PERMISSION_ERROR_CODES = Object.freeze({
  PERMISSION_DENIED: 'PERM_001',
  ROLE_REQUIRED: 'PERM_002',
  INVALID_SUBJECT: 'PERM_003',
  CACHE_ERROR: 'PERM_004',
  VALIDATION_ERROR: 'PERM_005',
  TIMEOUT_ERROR: 'PERM_006',
  CONFIGURATION_ERROR: 'PERM_007',
  INHERITANCE_ERROR: 'PERM_008',
  CONTEXT_ERROR: 'PERM_009',
  SYSTEM_ERROR: 'PERM_010',
});

// 🎨 权限日志级别常量
export const PERMISSION_LOG_LEVELS = Object.freeze({
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
});

// 📊 权限统计类型常量
export const PERMISSION_STATS_TYPES = Object.freeze({
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  REAL_TIME: 'real_time',
});

// 🔧 权限工具函数常量
export const PERMISSION_UTILS = Object.freeze({
  TEMPLATE_PLACEHOLDER_PATTERN: /\{(\w+)\}/g,
  CACHE_KEY_SANITIZE_PATTERN: /[^a-zA-Z0-9_:-]/g,
  PERMISSION_NAME_NORMALIZE_PATTERN: /[^a-zA-Z0-9_:.-]/g,
  ROLE_NAME_NORMALIZE_PATTERN: /[^a-zA-Z0-9_-]/g,
});

/**
 * 权限模板工具函数
 */
export class PermissionTemplateUtil {
  /**
   * 替换模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceTemplate(template: string, params: Record<string, any>): string {
    return template.replace(PERMISSION_UTILS.TEMPLATE_PLACEHOLDER_PATTERN, (match, key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.join(PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR + ' ');
      }
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成权限检查详情
   * @param template 模板键名
   * @param params 参数对象
   * @returns 详情字符串
   */
  static generateDetails(
    template: keyof typeof PERMISSION_DETAIL_TEMPLATES,
    params: Record<string, any>
  ): string {
    const templateString = PERMISSION_DETAIL_TEMPLATES[template];
    return this.replaceTemplate(templateString, params);
  }

  /**
   * 清理缓存键
   * @param key 原始键
   * @returns 清理后的键
   */
  static sanitizeCacheKey(key: string): string {
    return key.replace(PERMISSION_UTILS.CACHE_KEY_SANITIZE_PATTERN, '_');
  }

  /**
   * 标准化权限名称
   * @param permission 权限名称
   * @returns 标准化后的权限名称
   */
  static normalizePermissionName(permission: string): string {
    return permission.replace(PERMISSION_UTILS.PERMISSION_NAME_NORMALIZE_PATTERN, '_');
  }

  /**
   * 标准化角色名称
   * @param role 角色名称
   * @returns 标准化后的角色名称
   */
  static normalizeRoleName(role: string): string {
    return role.replace(PERMISSION_UTILS.ROLE_NAME_NORMALIZE_PATTERN, '_');
  }
}
