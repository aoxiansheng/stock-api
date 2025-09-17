/**
 * HTTP语义常量
 * 🎯 Semantic层 - HTTP相关的业务无关语义分类
 * 🌐 基于Foundation层构建，专注于HTTP协议语义
 */

import { NUMERIC_CONSTANTS } from "../core";
import { CORE_VALUES, CORE_TIMEOUTS } from "../foundation";
import {
  MESSAGE_SEMANTICS,
  MESSAGE_TEMPLATE_SEMANTICS,
} from "./message-semantics.constants";

/**
 * HTTP状态码语义分类
 * 基于标准HTTP状态码，提供语义化分组
 */
export const HTTP_STATUS_CODES = Object.freeze({
  // 2xx 成功状态码
  SUCCESS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
  },

  // 3xx 重定向状态码
  REDIRECT: {
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,
  },

  // 4xx 客户端错误状态码
  CLIENT_ERROR: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
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
  },
});

/**
 * HTTP超时语义配置
 * 🎯 统一HTTP相关超时配置，解决命名不一致问题
 */
export const HTTP_TIMEOUTS = Object.freeze({
  // 连接相关超时
  CONNECTION: {
    ESTABLISH_MS: CORE_TIMEOUTS.CONNECTION.ESTABLISH_MS, // 10秒 - 建立连接
    KEEP_ALIVE_MS: CORE_TIMEOUTS.CONNECTION.KEEP_ALIVE_MS, // 60秒 - 连接保活
  },

  // 请求相关超时
  REQUEST: {
    FAST_MS: CORE_TIMEOUTS.REQUEST.FAST_MS, // 5秒 - 快速请求
    NORMAL_MS: CORE_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒 - 普通请求
    SLOW_MS: CORE_TIMEOUTS.REQUEST.SLOW_MS, // 60秒 - 慢请求
  },

  // 网关相关超时
  GATEWAY: {},
});

/**
 * HTTP批量处理语义配置
 * 🎯 解决MAX_BATCH_SIZE重复定义问题
 */
export const HTTP_BATCH_SEMANTICS = Object.freeze({
  // API请求批量处理
  REQUEST_BATCHING: {
    MAX_SIZE: NUMERIC_CONSTANTS.N_1000, // 1000 - 最大批量大小
  },

  // 并发请求控制
  CONCURRENT_REQUESTS: {
    DEFAULT: NUMERIC_CONSTANTS.N_6, // 6 - 默认并发数
    MAX: NUMERIC_CONSTANTS.N_50, // 50 - 最大并发数
    MIN: NUMERIC_CONSTANTS.N_1, // 1 - 最小并发数
  },

  // 分页处理
  PAGINATION: {
    DEFAULT_PAGE_SIZE: NUMERIC_CONSTANTS.N_6, // 6 - 默认分页大小
  },
});

/**
 * HTTP头部语义配置
 */
export const HTTP_HEADERS = Object.freeze({
  // 内容相关头部
  CONTENT: {
    TYPE: "Content-Type",
    LENGTH: "Content-Length",
  },

  // 认证相关头部
  AUTH: {
    API_KEY: "X-API-Key",
  },

  // 缓存相关头部
  CACHE: {},

  // 安全相关头部
  SECURITY: {},

  // 自定义头部
  CUSTOM: {},
});

/**
 * HTTP方法语义分类
 */
export const HTTP_METHODS = Object.freeze({
  // 安全方法（不会修改服务器状态）
  SAFE: {
    GET: "GET",
    HEAD: "HEAD",
    OPTIONS: "OPTIONS",
  },

  // 幂等方法（多次执行结果相同）
  IDEMPOTENT: {
    GET: "GET",
    DELETE: "DELETE",
  },

  // 非幂等方法（可能产生副作用）
  NON_IDEMPOTENT: {
    POST: "POST",
  },

  // 所有标准方法
  ALL: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",
    OPTIONS: "OPTIONS",
  },
});

/**
 * HTTP方法数组形式
 * 🎯 为了方便在代码中使用，提供数组形式的方法组
 */
export const HTTP_METHOD_ARRAYS = Object.freeze({
  // 所有标准HTTP方法数组
  ALL_STANDARD: Object.values(HTTP_METHODS.ALL),

  // CORS常用方法数组
  CORS_COMMON: [
    HTTP_METHODS.ALL.GET,
    HTTP_METHODS.ALL.POST,
    HTTP_METHODS.ALL.PUT,
    HTTP_METHODS.ALL.DELETE,
    HTTP_METHODS.ALL.OPTIONS,
    HTTP_METHODS.ALL.PATCH,
  ],

  // 无请求体的方法数组
  NO_BODY_METHODS: [
    HTTP_METHODS.SAFE.GET,
    HTTP_METHODS.IDEMPOTENT.DELETE,
    HTTP_METHODS.SAFE.HEAD,
    HTTP_METHODS.SAFE.OPTIONS,
  ],

  // 测试常用方法数组
  TESTING_METHODS: [
    HTTP_METHODS.ALL.GET,
    HTTP_METHODS.ALL.POST,
    HTTP_METHODS.ALL.PUT,
    HTTP_METHODS.ALL.DELETE,
    HTTP_METHODS.ALL.PATCH,
  ],

  // 安全方法数组
  SAFE_METHODS: [
    HTTP_METHODS.SAFE.GET,
    HTTP_METHODS.SAFE.HEAD,
    HTTP_METHODS.SAFE.OPTIONS,
  ],

  // 幂等方法数组
  IDEMPOTENT_METHODS: [
    HTTP_METHODS.IDEMPOTENT.GET,
    HTTP_METHODS.IDEMPOTENT.DELETE,
    HTTP_METHODS.ALL.PUT, // PUT is idempotent but not in IDEMPOTENT group
    HTTP_METHODS.SAFE.HEAD,
    HTTP_METHODS.SAFE.OPTIONS,
  ],
} as const);

/**
 * HTTP内容类型语义
 */
export const HTTP_CONTENT_TYPES = Object.freeze({
  // 应用类型
  APPLICATION: {
    JSON: "application/json",
  },

  // 文本类型
  TEXT: {},

  // 图片类型
  IMAGE: {},
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
  static getRecommendedTimeout(
    requestType: "fast" | "normal" | "slow" | "upload",
  ): number {
    return HTTP_TIMEOUTS.REQUEST[
      `${requestType.toUpperCase()}_MS` as keyof typeof HTTP_TIMEOUTS.REQUEST
    ];
  }
}

/**
 * HTTP错误消息语义常量
 * 🎯 从Unified层迁移的HTTP错误消息，提供业务无关的错误语义
 */
export const HTTP_ERROR_MESSAGES = Object.freeze({
  // 通用HTTP错误
  BAD_REQUEST: "请求参数错误",
  UNAUTHORIZED: MESSAGE_SEMANTICS.PERMISSION.UNAUTHORIZED_ACCESS,
  FORBIDDEN: "访问被禁止",
  NOT_FOUND: MESSAGE_SEMANTICS.RESOURCE.NOT_FOUND,
  METHOD_NOT_ALLOWED: "请求方法不被允许",

  // 认证相关错误

  // 业务操作错误

  // 资源相关错误

  // 网络和连接错误

  // 数据相关错误
  CACHE_ERROR: "缓存错误",
});

/**
 * HTTP成功消息语义常量
 * 🎯 提供HTTP成功响应的标准化消息
 */
export const HTTP_SUCCESS_MESSAGES = Object.freeze({
  // 2xx 成功响应消息
  OK: "请求成功",
  CREATED: "资源创建成功",
  ACCEPTED: "请求已接受",
  NO_CONTENT: "请求成功但无返回内容",

  // 特定业务场景成功消息
  DATA_FETCHED: "数据获取成功",
  DATA_UPDATED: "数据更新成功",
  DATA_DELETED: "数据删除成功",
  OPERATION_COMPLETED: "操作完成",

  // 批量操作成功消息
  BATCH_PROCESSED: "批量处理完成",
  BATCH_CREATED: "批量创建完成",

  // 缓存相关成功消息
  CACHE_UPDATED: "缓存更新成功",
  CACHE_CLEARED: "缓存清除成功",
});

/**
 * 类型定义
 */
export type HttpStatusCodes = typeof HTTP_STATUS_CODES;
export type HttpTimeouts = typeof HTTP_TIMEOUTS;
export type HttpBatchSemantics = typeof HTTP_BATCH_SEMANTICS;
export type HttpErrorMessages = typeof HTTP_ERROR_MESSAGES;
export type HttpSuccessMessages = typeof HTTP_SUCCESS_MESSAGES;
