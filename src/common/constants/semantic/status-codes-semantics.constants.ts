/**
 * HTTP状态码语义常量
 * 🎯 Semantic层 - HTTP状态码的业务无关语义分类
 * 📋 基于Foundation层构建，专注于HTTP协议语义
 * 🆕 从Unified层迁移，解决状态码重复定义问题
 */

import { CORE_VALUES } from '../foundation';

/**
 * HTTP标准状态码语义分类
 * 🎯 解决BASE_STATUS_CODES重复定义问题
 */
export const HTTP_STATUS_SEMANTICS = Object.freeze({
  // 成功状态码 (2xx) - 使用Foundation层基础值
  SUCCESS: {
    OK: CORE_VALUES.QUANTITIES.TWO_HUNDRED,              // 200
    CREATED: 201,                                         // 201 - 创建成功
    ACCEPTED: 202,                                        // 202 - 已接受
    NO_CONTENT: 204,                                      // 204 - 无内容
    PARTIAL_CONTENT: 206,                                 // 206 - 部分内容
  },

  // 重定向状态码 (3xx)
  REDIRECT: {
    MOVED_PERMANENTLY: 301,                              // 301 - 永久重定向
    FOUND: 302,                                          // 302 - 临时重定向
    NOT_MODIFIED: 304,                                   // 304 - 未修改
    TEMPORARY_REDIRECT: 307,                             // 307 - 临时重定向
    PERMANENT_REDIRECT: 308,                             // 308 - 永久重定向
  },

  // 客户端错误状态码 (4xx)
  CLIENT_ERROR: {
    BAD_REQUEST: 400,                                    // 400 - 请求错误
    UNAUTHORIZED: 401,                                   // 401 - 未授权
    FORBIDDEN: 403,                                      // 403 - 禁止访问
    NOT_FOUND: 404,                                      // 404 - 未找到
    METHOD_NOT_ALLOWED: 405,                             // 405 - 方法不允许
    NOT_ACCEPTABLE: 406,                                 // 406 - 不接受
    REQUEST_TIMEOUT: 408,                                // 408 - 请求超时
    CONFLICT: 409,                                       // 409 - 冲突
    GONE: 410,                                           // 410 - 已删除
    PAYLOAD_TOO_LARGE: 413,                             // 413 - 负载过大
    UNPROCESSABLE_ENTITY: 422,                          // 422 - 无法处理的实体
    TOO_MANY_REQUESTS: 429,                             // 429 - 请求过多
  },

  // 服务器错误状态码 (5xx)
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: CORE_VALUES.QUANTITIES.FIVE_HUNDRED, // 500
    NOT_IMPLEMENTED: 501,                                // 501 - 未实现
    BAD_GATEWAY: 502,                                    // 502 - 网关错误
    SERVICE_UNAVAILABLE: 503,                            // 503 - 服务不可用
    GATEWAY_TIMEOUT: 504,                                // 504 - 网关超时
    HTTP_VERSION_NOT_SUPPORTED: 505,                     // 505 - HTTP版本不支持
    INSUFFICIENT_STORAGE: 507,                           // 507 - 存储不足
    NETWORK_AUTHENTICATION_REQUIRED: 511,               // 511 - 需要网络认证
  },

  // 业务状态码 (自定义) - 基于Foundation层
  BUSINESS: {
    OPERATION_SUCCESS: CORE_VALUES.QUANTITIES.THOUSAND,          // 1000 - 操作成功
    OPERATION_FAILED: CORE_VALUES.QUANTITIES.THOUSAND + 1,       // 1001 - 操作失败  
    VALIDATION_ERROR: CORE_VALUES.QUANTITIES.THOUSAND + 2,       // 1002 - 验证错误
    BUSINESS_RULE_VIOLATION: CORE_VALUES.QUANTITIES.THOUSAND + 3, // 1003 - 业务规则违规
    RESOURCE_CONFLICT: CORE_VALUES.QUANTITIES.THOUSAND + 4,      // 1004 - 资源冲突
    PERMISSION_DENIED: CORE_VALUES.QUANTITIES.THOUSAND + 5,      // 1005 - 权限拒绝
    QUOTA_EXCEEDED: CORE_VALUES.QUANTITIES.THOUSAND + 6,         // 1006 - 配额超限
    RATE_LIMITED: CORE_VALUES.QUANTITIES.THOUSAND + 7,           // 1007 - 限流
    MAINTENANCE_MODE: CORE_VALUES.QUANTITIES.THOUSAND + 8,       // 1008 - 维护模式
    FEATURE_DISABLED: CORE_VALUES.QUANTITIES.THOUSAND + 9,       // 1009 - 功能禁用
  },
});

/**
 * 状态码分类工具语义
 * 🎯 基于语义的状态码分类和检查
 */
export const STATUS_CODE_SEMANTICS = Object.freeze({
  // 状态码范围语义
  RANGES: {
    INFORMATIONAL: { MIN: CORE_VALUES.QUANTITIES.HUNDRED, MAX: 199 },      // 1xx
    SUCCESS: { MIN: CORE_VALUES.QUANTITIES.TWO_HUNDRED, MAX: 299 },        // 2xx  
    REDIRECT: { MIN: CORE_VALUES.QUANTITIES.THREE_HUNDRED, MAX: 399 },     // 3xx
    CLIENT_ERROR: { MIN: 400, MAX: 499 },                                  // 4xx
    SERVER_ERROR: { MIN: CORE_VALUES.QUANTITIES.FIVE_HUNDRED, MAX: 599 }, // 5xx
    BUSINESS: { MIN: CORE_VALUES.QUANTITIES.THOUSAND, MAX: 1999 },         // 1xxx 业务码
  },

  // 状态码语义分组
  GROUPS: {
    CACHEABLE: [
      HTTP_STATUS_SEMANTICS.SUCCESS.OK,
      HTTP_STATUS_SEMANTICS.REDIRECT.NOT_MODIFIED,
      HTTP_STATUS_SEMANTICS.REDIRECT.MOVED_PERMANENTLY,
    ],
    RETRY_SAFE: [
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.INTERNAL_SERVER_ERROR,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.BAD_GATEWAY,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.SERVICE_UNAVAILABLE,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.GATEWAY_TIMEOUT,
    ],
    CLIENT_FAULT: [
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.BAD_REQUEST,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNAUTHORIZED,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.FORBIDDEN,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.NOT_FOUND,
    ],
  },
});

/**
 * 状态码工具函数类
 * 🎯 语义层专用工具函数
 */
export class StatusCodeSemanticsUtil {
  /**
   * 检查是否为成功状态码
   */
  static isSuccess(code: number): boolean {
    const { MIN, MAX } = STATUS_CODE_SEMANTICS.RANGES.SUCCESS;
    return code >= MIN && code <= MAX;
  }

  /**
   * 检查是否为重定向状态码
   */
  static isRedirect(code: number): boolean {
    const { MIN, MAX } = STATUS_CODE_SEMANTICS.RANGES.REDIRECT;
    return code >= MIN && code <= MAX;
  }

  /**
   * 检查是否为客户端错误状态码
   */
  static isClientError(code: number): boolean {
    const { MIN, MAX } = STATUS_CODE_SEMANTICS.RANGES.CLIENT_ERROR;
    return code >= MIN && code <= MAX;
  }

  /**
   * 检查是否为服务器错误状态码
   */
  static isServerError(code: number): boolean {
    const { MIN, MAX } = STATUS_CODE_SEMANTICS.RANGES.SERVER_ERROR;
    return code >= MIN && code <= MAX;
  }

  /**
   * 检查是否为业务状态码
   */
  static isBusiness(code: number): boolean {
    const { MIN, MAX } = STATUS_CODE_SEMANTICS.RANGES.BUSINESS;
    return code >= MIN && code <= MAX;
  }

  /**
   * 检查是否可缓存
   */
  static isCacheable(code: number): boolean {
    return STATUS_CODE_SEMANTICS.GROUPS.CACHEABLE.includes(code);
  }

  /**
   * 检查是否可重试
   */
  static isRetrySafe(code: number): boolean {
    return STATUS_CODE_SEMANTICS.GROUPS.RETRY_SAFE.includes(code);
  }

  /**
   * 检查是否为客户端责任
   */
  static isClientFault(code: number): boolean {
    return STATUS_CODE_SEMANTICS.GROUPS.CLIENT_FAULT.includes(code);
  }

  /**
   * 获取状态码类型
   */
  static getType(code: number): 'success' | 'redirect' | 'client_error' | 'server_error' | 'business' | 'unknown' {
    if (this.isSuccess(code)) return 'success';
    if (this.isRedirect(code)) return 'redirect';
    if (this.isClientError(code)) return 'client_error';
    if (this.isServerError(code)) return 'server_error';
    if (this.isBusiness(code)) return 'business';
    return 'unknown';
  }

  /**
   * 获取推荐的重试策略
   */
  static getRetryStrategy(code: number): 'none' | 'immediate' | 'exponential_backoff' | 'linear_backoff' {
    if (this.isClientFault(code)) return 'none';
    if (this.isRetrySafe(code)) return 'exponential_backoff';
    if (code === HTTP_STATUS_SEMANTICS.CLIENT_ERROR.TOO_MANY_REQUESTS) return 'linear_backoff';
    return 'immediate';
  }
}

/**
 * 类型定义
 */
export type HttpStatusSemantics = typeof HTTP_STATUS_SEMANTICS;
export type StatusCodeSemantics = typeof STATUS_CODE_SEMANTICS;