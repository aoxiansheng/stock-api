/**
 * 基础常量定义
 * 建立常量继承体系的基础层，为其他常量模块提供基础的消息、状态码、时间和限制常量
 *
 * 设计原则：
 * - 继承性：作为所有业务常量的基础层，减少重复定义
 * - 不可变性：使用deepFreeze确保常量不被修改
 * - 类型安全：提供完整的TypeScript类型定义
 * - 语义分组：按功能分类组织常量，便于继承使用
 * - 标准化：统一命名规范和消息格式
 */

import { deepFreeze } from "../../utils/object-immutability.util";
import { QUICK_MESSAGES } from "./message-templates.constants";
import { PERMISSION_MESSAGES } from "./permission-message.constants";

/**
 * 基础消息常量
 * 包含所有模块通用的基础消息模板
 */
export const BASE_MESSAGES = deepFreeze({
  // 权限相关基础消息
  PERMISSION: {
    ACCESS_DENIED: PERMISSION_MESSAGES.ACCESS_DENIED,
    INSUFFICIENT_PRIVILEGES: "权限不足",
    UNAUTHORIZED_ACCESS: "未授权访问",
    FORBIDDEN_OPERATION: "禁止的操作",
    AUTHENTICATION_REQUIRED: "需要身份验证",
    AUTHORIZATION_FAILED: QUICK_MESSAGES.AUTHORIZATION_FAILED,
    PERMISSION_DENIED: "权限拒绝",
    ACCESS_RESTRICTED: "访问受限",
  } as const,

  // 资源相关基础消息
  RESOURCE: {
    NOT_FOUND: "资源未找到",
    ALREADY_EXISTS: QUICK_MESSAGES.RESOURCE_EXISTS,
    CREATION_FAILED: QUICK_MESSAGES.CREATION_FAILED,
    UPDATE_FAILED: QUICK_MESSAGES.UPDATE_FAILED,
    DELETION_FAILED: QUICK_MESSAGES.DELETION_FAILED,
    ACCESS_FAILED: "资源访问失败",
    LOCKED: "资源被锁定",
    EXPIRED: "资源已过期",
    UNAVAILABLE: "资源不可用",
    CORRUPTED: "资源已损坏",
  } as const,

  // 操作相关基础消息
  OPERATION: {
    SUCCESS: "操作成功",
    FAILED: QUICK_MESSAGES.OPERATION_FAILED,
    PENDING: "操作待处理",
    PROCESSING: "操作处理中",
    COMPLETED: "操作已完成",
    CANCELLED: "操作已取消",
    TIMEOUT: "操作超时",
    ABORTED: "操作已中止",
    RETRY_REQUIRED: "需要重试操作",
    INVALID_OPERATION: "无效操作",
  } as const,

  // 服务相关基础消息
  SERVICE: {
    UNAVAILABLE: "服务不可用",
    MAINTENANCE: "服务维护中",
    OVERLOADED: "服务过载",
    DEGRADED: "服务降级",
    STARTUP: "服务启动中",
    SHUTDOWN: "服务关闭中",
    ERROR: "服务错误",
    RECOVERY: "服务恢复中",
    TIMEOUT: "服务超时",
    CONNECTION_FAILED: "服务连接失败",
  } as const,

  // 网络相关基础消息
  NETWORK: {
    CONNECTION_ERROR: "网络连接错误",
    TIMEOUT_ERROR: "网络超时",
    UNREACHABLE: "网络不可达",
    INTERRUPTED: "网络中断",
    SLOW_CONNECTION: "网络连接缓慢",
    DNS_RESOLUTION_FAILED: "DNS解析失败",
    SSL_ERROR: "SSL错误",
    PROXY_ERROR: "代理错误",
    BANDWIDTH_EXCEEDED: "带宽超限",
    CONNECTION_REFUSED: "连接被拒绝",
  } as const,

  // 数据相关基础消息
  DATA: {
    INVALID_FORMAT: "数据格式无效",
    CORRUPTION_DETECTED: "检测到数据损坏",
    SYNC_FAILED: "数据同步失败",
    BACKUP_FAILED: "数据备份失败",
    RESTORE_FAILED: "数据恢复失败",
    MIGRATION_FAILED: "数据迁移失败",
    CONSISTENCY_ERROR: "数据一致性错误",
    INTEGRITY_VIOLATION: "数据完整性违规",
    SIZE_EXCEEDED: "数据大小超限",
    ENCODING_ERROR: "数据编码错误",
  } as const,

  // 验证相关基础消息
  VALIDATION: {
    FAILED: "验证失败",
    REQUIRED_FIELD: "必填字段",
    INVALID_FORMAT: "格式无效",
    OUT_OF_RANGE: "超出范围",
    TOO_SHORT: "长度过短",
    TOO_LONG: "长度过长",
    PATTERN_MISMATCH: "格式不匹配",
    DUPLICATE_VALUE: "重复值",
    INVALID_TYPE: "类型无效",
    CONSTRAINT_VIOLATION: "约束违规",
  } as const,

  // 时间相关基础消息
  TIME: {
    EXPIRED: "已过期",
    NOT_YET_VALID: "尚未生效",
    TIMEOUT: "超时",
    SCHEDULE_CONFLICT: "时间冲突",
    INVALID_DURATION: "无效时长",
    INVALID_TIMEZONE: "无效时区",
    PARSE_ERROR: "时间解析错误",
    FORMAT_ERROR: "时间格式错误",
    OUT_OF_RANGE: "时间超出范围",
    SYNCHRONIZATION_ERROR: "时间同步错误",
  } as const,

  // 配置相关基础消息
  CONFIG: {
    MISSING: "配置缺失",
    INVALID: "配置无效",
    LOAD_FAILED: "配置加载失败",
    SAVE_FAILED: "配置保存失败",
    PARSE_ERROR: "配置解析错误",
    VALIDATION_FAILED: "配置验证失败",
    CONFLICT: "配置冲突",
    OUTDATED: "配置过期",
    RESET_REQUIRED: "需要重置配置",
    MIGRATION_REQUIRED: "需要配置迁移",
  } as const,
} as const);

/**
 * 基础状态码常量
 * 包含系统通用的状态码定义
 */
export const BASE_STATUS_CODES = deepFreeze({
  // 成功状态码 (2xx)
  SUCCESS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    PARTIAL_CONTENT: 206,
  } as const,

  // 重定向状态码 (3xx)
  REDIRECT: {
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
  } as const,

  // 客户端错误状态码 (4xx)
  CLIENT_ERROR: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
  } as const,

  // 服务器错误状态码 (5xx)
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    INSUFFICIENT_STORAGE: 507,
    NETWORK_AUTHENTICATION_REQUIRED: 511,
  } as const,

  // 业务状态码 (自定义)
  BUSINESS: {
    OPERATION_SUCCESS: 1000,
    OPERATION_FAILED: 1001,
    VALIDATION_ERROR: 1002,
    BUSINESS_RULE_VIOLATION: 1003,
    RESOURCE_CONFLICT: 1004,
    PERMISSION_DENIED: 1005,
    QUOTA_EXCEEDED: 1006,
    RATE_LIMITED: 1007,
    MAINTENANCE_MODE: 1008,
    FEATURE_DISABLED: 1009,
  } as const,
} as const);

/**
 * 基础超时时间常量 (毫秒)
 */
export const BASE_TIMEOUTS = deepFreeze({
  // 网络请求超时
  NETWORK: {
    QUICK: 1000,           // 快速请求 - 1秒
    NORMAL: 5000,          // 普通请求 - 5秒
    SLOW: 15000,           // 慢速请求 - 15秒
    UPLOAD: 60000,         // 文件上传 - 1分钟
    DOWNLOAD: 120000,      // 文件下载 - 2分钟
    STREAMING: 300000,     // 流式传输 - 5分钟
  } as const,

  // 数据库操作超时
  DATABASE: {
    QUERY: 10000,          // 查询操作 - 10秒
    TRANSACTION: 30000,    // 事务操作 - 30秒
    MIGRATION: 300000,     // 数据迁移 - 5分钟
    BACKUP: 600000,        // 数据备份 - 10分钟
    CONNECTION: 5000,      // 连接建立 - 5秒
    POOL_ACQUIRE: 10000,   // 连接池获取 - 10秒
  } as const,

  // 缓存操作超时
  CACHE: {
    GET: 100,              // 缓存读取 - 100毫秒
    SET: 500,              // 缓存写入 - 500毫秒
    DELETE: 200,           // 缓存删除 - 200毫秒
    FLUSH: 2000,           // 缓存清空 - 2秒
    CONNECT: 3000,         // 缓存连接 - 3秒
    PING: 1000,            // 缓存ping - 1秒
  } as const,

  // 认证授权超时
  AUTH: {
    LOGIN: 10000,          // 登录验证 - 10秒
    LOGOUT: 5000,          // 退出登录 - 5秒
    TOKEN_REFRESH: 8000,   // Token刷新 - 8秒
    PERMISSION_CHECK: 2000, // 权限检查 - 2秒
    SESSION_EXPIRE: 1800000, // 会话过期 - 30分钟
    PASSWORD_RESET: 300000, // 密码重置 - 5分钟
  } as const,

  // 系统操作超时
  SYSTEM: {
    HEALTH_CHECK: 3000,    // 健康检查 - 3秒
    STARTUP: 60000,        // 系统启动 - 1分钟
    SHUTDOWN: 30000,       // 系统关闭 - 30秒
    BACKUP: 900000,        // 系统备份 - 15分钟
    MAINTENANCE: 1800000,  // 系统维护 - 30分钟
    MONITORING: 5000,      // 监控检查 - 5秒
  } as const,
} as const);

/**
 * 基础限制常量
 */
export const BASE_LIMITS = deepFreeze({
  // 字符串长度限制
  STRING_LENGTH: {
    MIN_NAME: 1,
    MAX_NAME: 100,
    MIN_DESCRIPTION: 0,
    MAX_DESCRIPTION: 1000,
    MIN_COMMENT: 0,
    MAX_COMMENT: 500,
    MAX_TITLE: 200,
    MAX_URL: 2048,
    MAX_EMAIL: 254,
    MAX_PHONE: 20,
    MIN_PASSWORD: 8,
    MAX_PASSWORD: 128,
  } as const,

  // 数字范围限制
  NUMERIC: {
    MIN_PAGE: 1,
    MAX_PAGE: 10000,
    MIN_PAGE_SIZE: 1,
    MAX_PAGE_SIZE: 1000,
    DEFAULT_PAGE_SIZE: 20,
    MIN_RETRY_ATTEMPTS: 0,
    MAX_RETRY_ATTEMPTS: 10,
    MIN_TIMEOUT: 100,
    MAX_TIMEOUT: 3600000,
    MIN_RATE_LIMIT: 1,
    MAX_RATE_LIMIT: 10000,
  } as const,

  // 文件大小限制 (字节)
  FILE_SIZE: {
    MAX_AVATAR: 2097152,        // 2MB
    MAX_IMAGE: 10485760,        // 10MB  
    MAX_DOCUMENT: 52428800,     // 50MB
    MAX_UPLOAD: 104857600,      // 100MB
    MAX_BATCH_TOTAL: 524288000, // 500MB
  } as const,

  // 数组/集合大小限制
  COLLECTION: {
    MIN_BATCH_SIZE: 1,
    MAX_BATCH_SIZE: 1000,
    MAX_TAGS: 50,
    MAX_CATEGORIES: 20,
    MAX_FILTERS: 10,
    MAX_SORT_FIELDS: 5,
    MAX_SEARCH_RESULTS: 10000,
    MAX_EXPORT_RECORDS: 100000,
  } as const,

  // 并发限制
  CONCURRENCY: {
    MAX_CONNECTIONS: 1000,
    MAX_REQUESTS_PER_MINUTE: 1000,
    MAX_REQUESTS_PER_HOUR: 10000,
    MAX_REQUESTS_PER_DAY: 100000,
    MAX_CONCURRENT_OPERATIONS: 100,
    MAX_PARALLEL_DOWNLOADS: 5,
    MAX_PARALLEL_UPLOADS: 3,
  } as const,

  // 缓存限制
  CACHE: {
    MAX_KEY_LENGTH: 250,
    MAX_VALUE_SIZE: 1048576,    // 1MB
    MAX_ENTRIES: 100000,
    DEFAULT_TTL: 3600,          // 1小时 (秒)
    MAX_TTL: 86400,             // 24小时 (秒)
    MIN_TTL: 60,                // 1分钟 (秒)
  } as const,
} as const);

// ==================== 类型定义 ====================

/**
 * 基础消息类型定义
 */
export type BasePermissionMessage = typeof BASE_MESSAGES.PERMISSION[keyof typeof BASE_MESSAGES.PERMISSION];
export type BaseResourceMessage = typeof BASE_MESSAGES.RESOURCE[keyof typeof BASE_MESSAGES.RESOURCE];
export type BaseOperationMessage = typeof BASE_MESSAGES.OPERATION[keyof typeof BASE_MESSAGES.OPERATION];
export type BaseServiceMessage = typeof BASE_MESSAGES.SERVICE[keyof typeof BASE_MESSAGES.SERVICE];
export type BaseNetworkMessage = typeof BASE_MESSAGES.NETWORK[keyof typeof BASE_MESSAGES.NETWORK];
export type BaseDataMessage = typeof BASE_MESSAGES.DATA[keyof typeof BASE_MESSAGES.DATA];
export type BaseValidationMessage = typeof BASE_MESSAGES.VALIDATION[keyof typeof BASE_MESSAGES.VALIDATION];
export type BaseTimeMessage = typeof BASE_MESSAGES.TIME[keyof typeof BASE_MESSAGES.TIME];
export type BaseConfigMessage = typeof BASE_MESSAGES.CONFIG[keyof typeof BASE_MESSAGES.CONFIG];

/**
 * 基础状态码类型定义
 */
export type BaseSuccessStatusCode = typeof BASE_STATUS_CODES.SUCCESS[keyof typeof BASE_STATUS_CODES.SUCCESS];
export type BaseRedirectStatusCode = typeof BASE_STATUS_CODES.REDIRECT[keyof typeof BASE_STATUS_CODES.REDIRECT];
export type BaseClientErrorStatusCode = typeof BASE_STATUS_CODES.CLIENT_ERROR[keyof typeof BASE_STATUS_CODES.CLIENT_ERROR];
export type BaseServerErrorStatusCode = typeof BASE_STATUS_CODES.SERVER_ERROR[keyof typeof BASE_STATUS_CODES.SERVER_ERROR];
export type BaseBusinessStatusCode = typeof BASE_STATUS_CODES.BUSINESS[keyof typeof BASE_STATUS_CODES.BUSINESS];

/**
 * 基础超时类型定义
 */
export type BaseNetworkTimeout = typeof BASE_TIMEOUTS.NETWORK[keyof typeof BASE_TIMEOUTS.NETWORK];
export type BaseDatabaseTimeout = typeof BASE_TIMEOUTS.DATABASE[keyof typeof BASE_TIMEOUTS.DATABASE];
export type BaseCacheTimeout = typeof BASE_TIMEOUTS.CACHE[keyof typeof BASE_TIMEOUTS.CACHE];
export type BaseAuthTimeout = typeof BASE_TIMEOUTS.AUTH[keyof typeof BASE_TIMEOUTS.AUTH];
export type BaseSystemTimeout = typeof BASE_TIMEOUTS.SYSTEM[keyof typeof BASE_TIMEOUTS.SYSTEM];

/**
 * 基础限制类型定义
 */
export type BaseStringLengthLimit = typeof BASE_LIMITS.STRING_LENGTH[keyof typeof BASE_LIMITS.STRING_LENGTH];
export type BaseNumericLimit = typeof BASE_LIMITS.NUMERIC[keyof typeof BASE_LIMITS.NUMERIC];
export type BaseFileSizeLimit = typeof BASE_LIMITS.FILE_SIZE[keyof typeof BASE_LIMITS.FILE_SIZE];
export type BaseCollectionLimit = typeof BASE_LIMITS.COLLECTION[keyof typeof BASE_LIMITS.COLLECTION];
export type BaseConcurrencyLimit = typeof BASE_LIMITS.CONCURRENCY[keyof typeof BASE_LIMITS.CONCURRENCY];
export type BaseCacheLimit = typeof BASE_LIMITS.CACHE[keyof typeof BASE_LIMITS.CACHE];

/**
 * 联合类型定义
 */
export type BaseMessage = 
  | BasePermissionMessage 
  | BaseResourceMessage 
  | BaseOperationMessage 
  | BaseServiceMessage 
  | BaseNetworkMessage 
  | BaseDataMessage 
  | BaseValidationMessage 
  | BaseTimeMessage 
  | BaseConfigMessage;

export type BaseStatusCode = 
  | BaseSuccessStatusCode 
  | BaseRedirectStatusCode 
  | BaseClientErrorStatusCode 
  | BaseServerErrorStatusCode 
  | BaseBusinessStatusCode;

export type BaseTimeout = 
  | BaseNetworkTimeout 
  | BaseDatabaseTimeout 
  | BaseCacheTimeout 
  | BaseAuthTimeout 
  | BaseSystemTimeout;

export type BaseLimit = 
  | BaseStringLengthLimit 
  | BaseNumericLimit 
  | BaseFileSizeLimit 
  | BaseCollectionLimit 
  | BaseConcurrencyLimit 
  | BaseCacheLimit;

// ==================== 工具函数 ====================

/**
 * 检查状态码类型
 */
export const StatusCodeUtils = deepFreeze({
  /**
   * 检查是否为成功状态码
   */
  isSuccess(code: number): code is BaseSuccessStatusCode {
    return Object.values(BASE_STATUS_CODES.SUCCESS).includes(code as BaseSuccessStatusCode);
  },

  /**
   * 检查是否为重定向状态码
   */
  isRedirect(code: number): code is BaseRedirectStatusCode {
    return Object.values(BASE_STATUS_CODES.REDIRECT).includes(code as BaseRedirectStatusCode);
  },

  /**
   * 检查是否为客户端错误状态码
   */
  isClientError(code: number): code is BaseClientErrorStatusCode {
    return Object.values(BASE_STATUS_CODES.CLIENT_ERROR).includes(code as BaseClientErrorStatusCode);
  },

  /**
   * 检查是否为服务器错误状态码
   */
  isServerError(code: number): code is BaseServerErrorStatusCode {
    return Object.values(BASE_STATUS_CODES.SERVER_ERROR).includes(code as BaseServerErrorStatusCode);
  },

  /**
   * 检查是否为业务状态码
   */
  isBusiness(code: number): code is BaseBusinessStatusCode {
    return Object.values(BASE_STATUS_CODES.BUSINESS).includes(code as BaseBusinessStatusCode);
  },

  /**
   * 获取状态码类型
   */
  getType(code: number): 'success' | 'redirect' | 'client_error' | 'server_error' | 'business' | 'unknown' {
    if (this.isSuccess(code)) return 'success';
    if (this.isRedirect(code)) return 'redirect';
    if (this.isClientError(code)) return 'client_error';
    if (this.isServerError(code)) return 'server_error';
    if (this.isBusiness(code)) return 'business';
    return 'unknown';
  },
} as const);

/**
 * 常量验证工具函数
 */
export const ValidationUtils = deepFreeze({
  /**
   * 验证字符串长度是否在指定范围内
   */
  isValidStringLength(value: string, min: BaseStringLengthLimit, max: BaseStringLengthLimit): boolean {
    return value.length >= min && value.length <= max;
  },

  /**
   * 验证数值是否在指定范围内
   */
  isValidNumericRange(value: number, min: BaseNumericLimit, max: BaseNumericLimit): boolean {
    return value >= min && value <= max;
  },

  /**
   * 验证文件大小是否符合限制
   */
  isValidFileSize(size: number, limit: BaseFileSizeLimit): boolean {
    return size <= limit;
  },

  /**
   * 验证集合大小是否符合限制
   */
  isValidCollectionSize(size: number, limit: BaseCollectionLimit): boolean {
    return size <= limit;
  },
} as const);

/**
 * 常量继承工具函数
 * 帮助其他常量模块继承和扩展基础常量
 */
export const ConstantInheritanceUtils = deepFreeze({
  /**
   * 扩展基础消息常量
   * @param extensions 扩展的消息常量
   * @returns 合并后的消息常量
   */
  extendMessages<T>(extensions: T): typeof BASE_MESSAGES & T {
    return deepFreeze({ ...BASE_MESSAGES, ...extensions });
  },

  /**
   * 扩展基础状态码常量
   * @param extensions 扩展的状态码常量
   * @returns 合并后的状态码常量
   */
  extendStatusCodes<T>(extensions: T): typeof BASE_STATUS_CODES & T {
    return deepFreeze({ ...BASE_STATUS_CODES, ...extensions });
  },

  /**
   * 扩展基础超时常量
   * @param extensions 扩展的超时常量
   * @returns 合并后的超时常量
   */
  extendTimeouts<T>(extensions: T): typeof BASE_TIMEOUTS & T {
    return deepFreeze({ ...BASE_TIMEOUTS, ...extensions });
  },

  /**
   * 扩展基础限制常量
   * @param extensions 扩展的限制常量
   * @returns 合并后的限制常量
   */
  extendLimits<T>(extensions: T): typeof BASE_LIMITS & T {
    return deepFreeze({ ...BASE_LIMITS, ...extensions });
  },
} as const);