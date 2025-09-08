/**
 * HTTP语义常量
 * 🎯 Semantic层 - HTTP相关的业务无关语义分类
 * 🌐 基于Foundation层构建，专注于HTTP协议语义
 */

import { CORE_VALUES, CORE_TIMEOUTS, CORE_LIMITS } from '../foundation';

/**
 * HTTP状态码语义分类
 * 基于标准HTTP状态码，提供语义化分组
 */
export const HTTP_STATUS_CODES = Object.freeze({
  // 2xx 成功状态码
  SUCCESS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    PARTIAL_CONTENT: 206,
  },

  // 3xx 重定向状态码
  REDIRECT: {
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
  },

  // 4xx 客户端错误状态码
  CLIENT_ERROR: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    CONFLICT: 409,
    GONE: 410,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
  },

  // 5xx 服务器错误状态码
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
  },
});

/**
 * HTTP超时语义配置
 * 🎯 统一HTTP相关超时配置，解决命名不一致问题
 */
export const HTTP_TIMEOUTS = Object.freeze({
  // 连接相关超时
  CONNECTION: {
    ESTABLISH_MS: CORE_TIMEOUTS.CONNECTION.ESTABLISH_MS,        // 10秒 - 建立连接
    KEEP_ALIVE_MS: CORE_TIMEOUTS.CONNECTION.KEEP_ALIVE_MS,      // 60秒 - 连接保活
    IDLE_MS: CORE_TIMEOUTS.CONNECTION.IDLE_MS,                  // 30秒 - 空闲连接
  },

  // 请求相关超时
  REQUEST: {
    FAST_MS: CORE_TIMEOUTS.REQUEST.FAST_MS,                     // 5秒 - 快速请求
    NORMAL_MS: CORE_TIMEOUTS.REQUEST.NORMAL_MS,                 // 30秒 - 普通请求
    SLOW_MS: CORE_TIMEOUTS.REQUEST.SLOW_MS,                     // 60秒 - 慢请求
    UPLOAD_MS: CORE_VALUES.TIME_MS.FIVE_MINUTES,                // 5分钟 - 文件上传
  },

  // 网关相关超时
  GATEWAY: {
    PROXY_MS: CORE_TIMEOUTS.GATEWAY.PROXY_MS,                   // 60秒 - 代理超时
    LOAD_BALANCER_MS: CORE_TIMEOUTS.GATEWAY.LOAD_BALANCER_MS,   // 30秒 - 负载均衡
    API_GATEWAY_MS: CORE_TIMEOUTS.GATEWAY.API_GATEWAY_MS,       // 60秒 - API网关
  },
});

/**
 * HTTP批量处理语义配置
 * 🎯 解决MAX_BATCH_SIZE重复定义问题
 */
export const HTTP_BATCH_SEMANTICS = Object.freeze({
  // API请求批量处理
  REQUEST_BATCHING: {
    OPTIMAL_SIZE: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,  // 50 - 最优批量大小
    MAX_SIZE: CORE_LIMITS.BATCH_LIMITS.MAX_BATCH_SIZE,          // 1000 - 最大批量大小
    MIN_SIZE: CORE_LIMITS.BATCH_LIMITS.MIN_BATCH_SIZE,          // 1 - 最小批量大小
  },

  // 并发请求控制
  CONCURRENT_REQUESTS: {
    DEFAULT: CORE_LIMITS.CONCURRENCY.DEFAULT_WORKERS,           // 6 - 默认并发数
    MAX: CORE_LIMITS.CONCURRENCY.MAX_WORKERS,                   // 50 - 最大并发数
    MIN: CORE_LIMITS.CONCURRENCY.MIN_WORKERS,                   // 1 - 最小并发数
  },

  // 分页处理
  PAGINATION: {
    DEFAULT_PAGE_SIZE: CORE_LIMITS.PAGINATION.DEFAULT_PAGE_SIZE, // 6 - 默认分页大小
    MAX_PAGE_SIZE: CORE_LIMITS.PAGINATION.MAX_PAGE_SIZE,        // 100 - 最大分页大小
    OPTIMAL_PAGE_SIZE: CORE_LIMITS.PAGINATION.OPTIMAL_PAGE_SIZE, // 50 - 最优分页大小
  },
});

/**
 * HTTP头部语义配置
 */
export const HTTP_HEADERS = Object.freeze({
  // 内容相关头部
  CONTENT: {
    TYPE: 'Content-Type',
    LENGTH: 'Content-Length',
    ENCODING: 'Content-Encoding',
    DISPOSITION: 'Content-Disposition',
  },

  // 认证相关头部
  AUTH: {
    AUTHORIZATION: 'Authorization',
    WWW_AUTHENTICATE: 'WWW-Authenticate',
    API_KEY: 'X-API-Key',
    ACCESS_TOKEN: 'X-Access-Token',
  },

  // 缓存相关头部
  CACHE: {
    CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    IF_NONE_MATCH: 'If-None-Match',
    LAST_MODIFIED: 'Last-Modified',
    IF_MODIFIED_SINCE: 'If-Modified-Since',
  },

  // 安全相关头部
  SECURITY: {
    STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
    CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
    X_FRAME_OPTIONS: 'X-Frame-Options',
    X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  },

  // 自定义头部
  CUSTOM: {
    REQUEST_ID: 'X-Request-ID',
    CORRELATION_ID: 'X-Correlation-ID',
    CLIENT_VERSION: 'X-Client-Version',
    RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
    RATE_LIMIT_RESET: 'X-RateLimit-Reset',
  },
});

/**
 * HTTP方法语义分类
 */
export const HTTP_METHODS = Object.freeze({
  // 安全方法（不会修改服务器状态）
  SAFE: {
    GET: 'GET',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
  },

  // 幂等方法（多次执行结果相同）
  IDEMPOTENT: {
    GET: 'GET',
    HEAD: 'HEAD',
    PUT: 'PUT',
    DELETE: 'DELETE',
    OPTIONS: 'OPTIONS',
  },

  // 非幂等方法（可能产生副作用）
  NON_IDEMPOTENT: {
    POST: 'POST',
    PATCH: 'PATCH',
  },

  // 所有标准方法
  ALL: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
    TRACE: 'TRACE',
  },
});

/**
 * HTTP内容类型语义
 */
export const HTTP_CONTENT_TYPES = Object.freeze({
  // 应用类型
  APPLICATION: {
    JSON: 'application/json',
    XML: 'application/xml',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
    FORM_DATA: 'multipart/form-data',
    OCTET_STREAM: 'application/octet-stream',
  },

  // 文本类型
  TEXT: {
    PLAIN: 'text/plain',
    HTML: 'text/html',
    CSS: 'text/css',
    JAVASCRIPT: 'text/javascript',
  },

  // 图片类型
  IMAGE: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    SVG: 'image/svg+xml',
  },
});

/**
 * HTTP语义工具函数
 */
export class HttpSemanticsUtil {
  /**
   * 判断状态码是否为成功状态
   */
  static isSuccessStatus(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * 判断状态码是否为客户端错误
   */
  static isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500;
  }

  /**
   * 判断状态码是否为服务器错误
   */
  static isServerError(statusCode: number): boolean {
    return statusCode >= 500 && statusCode < 600;
  }

  /**
   * 判断HTTP方法是否安全
   */
  static isSafeMethod(method: string): boolean {
    return Object.values(HTTP_METHODS.SAFE).includes(method as any);
  }

  /**
   * 判断HTTP方法是否幂等
   */
  static isIdempotentMethod(method: string): boolean {
    return Object.values(HTTP_METHODS.IDEMPOTENT).includes(method as any);
  }

  /**
   * 根据请求类型获取推荐超时时间
   */
  static getRecommendedTimeout(requestType: 'fast' | 'normal' | 'slow' | 'upload'): number {
    return HTTP_TIMEOUTS.REQUEST[`${requestType.toUpperCase()}_MS` as keyof typeof HTTP_TIMEOUTS.REQUEST];
  }
}

/**
 * HTTP错误消息语义常量
 * 🎯 从Unified层迁移的HTTP错误消息，提供业务无关的错误语义
 */
export const HTTP_ERROR_MESSAGES = Object.freeze({
  // 通用HTTP错误
  BAD_REQUEST: "请求参数错误",
  UNAUTHORIZED: "未授权访问",
  FORBIDDEN: "访问被禁止", 
  NOT_FOUND: "资源未找到",
  METHOD_NOT_ALLOWED: "请求方法不被允许",
  CONFLICT: "请求冲突",
  UNPROCESSABLE_ENTITY: "请求参数验证失败",
  TOO_MANY_REQUESTS: "请求频率超出限制",
  INTERNAL_SERVER_ERROR: "服务器内部错误",
  SERVICE_UNAVAILABLE: "服务暂时不可用",
  GATEWAY_TIMEOUT: "网关超时",

  // 认证相关错误
  INVALID_CREDENTIALS: "用户名或密码错误",
  TOKEN_EXPIRED: "token已过期",
  TOKEN_INVALID: "token无效", 
  API_KEY_INVALID: "API Key无效",
  API_KEY_EXPIRED: "API Key已过期",
  INSUFFICIENT_PERMISSIONS: "权限不足",
  ACCESS_DENIED: "访问被拒绝",

  // 业务操作错误
  OPERATION_FAILED: "操作失败",
  VALIDATION_FAILED: "验证失败",
  PROCESSING_FAILED: "处理失败",

  // 资源相关错误
  RESOURCE_ALREADY_EXISTS: "资源已存在",
  RESOURCE_LOCKED: "资源被锁定",
  RESOURCE_EXPIRED: "资源已过期",

  // 网络和连接错误
  CONNECTION_FAILED: "连接失败",
  TIMEOUT_ERROR: "请求超时",
  NETWORK_ERROR: "网络错误",

  // 数据相关错误
  DATA_CORRUPTION: "数据损坏",
  DATA_SYNC_FAILED: "数据同步失败",
  CACHE_ERROR: "缓存错误",
});

/**
 * HTTP成功消息语义常量
 * 🎯 从Unified层迁移的HTTP成功消息，提供业务无关的成功语义
 */
export const HTTP_SUCCESS_MESSAGES = Object.freeze({
  OPERATION_SUCCESS: "操作成功",
  QUERY_SUCCESS: "查询成功",
  VALIDATION_SUCCESS: "验证成功", 
  PROCESS_SUCCESS: "处理成功",
  SYNC_SUCCESS: "同步成功",
  
  // CRUD操作成功消息 - 引用其他语义层
  CREATE_SUCCESS: "创建成功",
  UPDATE_SUCCESS: "更新成功", 
  DELETE_SUCCESS: "删除成功",
});

/**
 * 类型定义
 */
export type HttpStatusCodes = typeof HTTP_STATUS_CODES;
export type HttpTimeouts = typeof HTTP_TIMEOUTS;
export type HttpBatchSemantics = typeof HTTP_BATCH_SEMANTICS;
export type HttpErrorMessages = typeof HTTP_ERROR_MESSAGES;
export type HttpSuccessMessages = typeof HTTP_SUCCESS_MESSAGES;