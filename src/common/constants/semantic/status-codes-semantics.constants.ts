/**
 * HTTP状态码语义常量
 * 🎯 Semantic层 - HTTP状态码的业务无关语义分类
 * 📋 基于Foundation层构建，专注于HTTP协议语义
 * 🆕 从Unified层迁移，解决状态码重复定义问题
 */

import { NUMERIC_CONSTANTS } from '../core';

/**
 * HTTP标准状态码语义分类
 * 🎯 解决BASE_STATUS_CODES重复定义问题
 */
export const HTTP_STATUS_SEMANTICS = Object.freeze({
  // 成功状态码 (2xx) - 使用Foundation层基础值
  SUCCESS: {
    OK: NUMERIC_CONSTANTS.N_200,                         // 200
    CREATED: 201,                                         // 201 - 创建成功
    NO_CONTENT: 204,                                      // 204 - 无内容
  },

  // 重定向状态码 (3xx)
  REDIRECT: {
    MOVED_PERMANENTLY: 301,                              // 301 - 永久重定向
    FOUND: 302,                                          // 302 - 临时重定向
    NOT_MODIFIED: 304,                                   // 304 - 未修改
  },

  // 客户端错误状态码 (4xx)
  CLIENT_ERROR: {
    BAD_REQUEST: 400,                                    // 400 - 请求错误
    UNAUTHORIZED: 401,                                   // 401 - 未授权
    FORBIDDEN: 403,                                      // 403 - 禁止访问
    NOT_FOUND: 404,                                      // 404 - 未找到
    METHOD_NOT_ALLOWED: 405,                             // 405 - 方法不允许
    CONFLICT: 409,                                       // 409 - 冲突
    PAYLOAD_TOO_LARGE: 413,                             // 413 - 负载过大
    UNPROCESSABLE_ENTITY: 422,                          // 422 - 无法处理的实体
    TOO_MANY_REQUESTS: 429,                             // 429 - 请求过多
  },

  // 服务器错误状态码 (5xx)
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: NUMERIC_CONSTANTS.N_500, // 500
    NOT_IMPLEMENTED: 501,                                // 501 - 未实现
    BAD_GATEWAY: 502,                                    // 502 - 网关错误
    SERVICE_UNAVAILABLE: 503,                            // 503 - 服务不可用
    GATEWAY_TIMEOUT: 504,                                // 504 - 网关超时
  },

  // 业务状态码 (自定义) - 基于Foundation层
  BUSINESS: {
  },
});

/**
 * 状态码分类工具语义
 * 🎯 基于语义的状态码分类和检查
 */
export const STATUS_CODE_SEMANTICS = Object.freeze({
  // 状态码范围语义
  RANGES: {
    INFORMATIONAL: { MIN: NUMERIC_CONSTANTS.N_100, MAX: 199 },      // 1xx
    SUCCESS: { MIN: NUMERIC_CONSTANTS.N_200, MAX: 299 },                   // 2xx  
    REDIRECT: { MIN: NUMERIC_CONSTANTS.N_300, MAX: 399 },                  // 3xx
    CLIENT_ERROR: { MIN: 400, MAX: 499 },                                  // 4xx
    SERVER_ERROR: { MIN: NUMERIC_CONSTANTS.N_500, MAX: 599 }, // 5xx
    BUSINESS: { MIN: NUMERIC_CONSTANTS.N_1000, MAX: 1999 },         // 1xxx 业务码
  },

  // 状态码语义分组
  GROUPS: {
    SUCCESS_CODES: [
      HTTP_STATUS_SEMANTICS.SUCCESS.OK,
      HTTP_STATUS_SEMANTICS.REDIRECT.NOT_MODIFIED,
      HTTP_STATUS_SEMANTICS.REDIRECT.MOVED_PERMANENTLY,
    ],
    
    SERVER_ERROR_CODES: [
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.INTERNAL_SERVER_ERROR,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.BAD_GATEWAY,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.SERVICE_UNAVAILABLE,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.GATEWAY_TIMEOUT,
    ],
    
    CLIENT_ERROR_CODES: [
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.BAD_REQUEST,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNAUTHORIZED,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.FORBIDDEN,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.NOT_FOUND,
    ],
    
    // 客户端故障状态码 - 由客户端错误引起的状态码
    CLIENT_FAULT: [
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.BAD_REQUEST,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNAUTHORIZED,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.FORBIDDEN,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.NOT_FOUND,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.METHOD_NOT_ALLOWED,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.CONFLICT,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.PAYLOAD_TOO_LARGE,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.UNPROCESSABLE_ENTITY,
    ],
    
    // 可缓存的状态码
    CACHEABLE: [
      HTTP_STATUS_SEMANTICS.SUCCESS.OK,
      HTTP_STATUS_SEMANTICS.REDIRECT.NOT_MODIFIED,
      HTTP_STATUS_SEMANTICS.REDIRECT.MOVED_PERMANENTLY,
      HTTP_STATUS_SEMANTICS.REDIRECT.FOUND,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.NOT_FOUND,
    ],
    
    // 安全可重试的状态码
    RETRY_SAFE: [
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.INTERNAL_SERVER_ERROR,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.BAD_GATEWAY,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.SERVICE_UNAVAILABLE,
      HTTP_STATUS_SEMANTICS.SERVER_ERROR.GATEWAY_TIMEOUT,
      HTTP_STATUS_SEMANTICS.CLIENT_ERROR.TOO_MANY_REQUESTS,
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