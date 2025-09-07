/**
 * HTTP 状态码常量定义
 * 🎯 统一管理HTTP状态码，消除魔法数字
 * @version 1.0.0
 * @since 2025-09-05
 */

import { deepFreeze } from "../../common/utils/object-immutability.util";

/**
 * HTTP 1xx 信息响应状态码
 */
export const HTTP_INFORMATIONAL = deepFreeze({
  /** 100 Continue - 继续请求 */
  CONTINUE: 100,
  /** 101 Switching Protocols - 切换协议 */
  SWITCHING_PROTOCOLS: 101,
  /** 102 Processing - 处理中 */
  PROCESSING: 102,
} as const);

/**
 * HTTP 2xx 成功响应状态码
 */
export const HTTP_SUCCESS = deepFreeze({
  /** 200 OK - 请求成功 */
  OK: 200,
  /** 201 Created - 资源创建成功 */
  CREATED: 201,
  /** 202 Accepted - 请求已接受 */
  ACCEPTED: 202,
  /** 203 Non-Authoritative Information - 非权威信息 */
  NON_AUTHORITATIVE_INFORMATION: 203,
  /** 204 No Content - 无内容 */
  NO_CONTENT: 204,
  /** 205 Reset Content - 重置内容 */
  RESET_CONTENT: 205,
  /** 206 Partial Content - 部分内容 */
  PARTIAL_CONTENT: 206,
} as const);

/**
 * HTTP 3xx 重定向状态码
 */
export const HTTP_REDIRECTION = deepFreeze({
  /** 300 Multiple Choices - 多种选择 */
  MULTIPLE_CHOICES: 300,
  /** 301 Moved Permanently - 永久重定向 */
  MOVED_PERMANENTLY: 301,
  /** 302 Found - 临时重定向 */
  FOUND: 302,
  /** 303 See Other - 查看其他位置 */
  SEE_OTHER: 303,
  /** 304 Not Modified - 未修改 */
  NOT_MODIFIED: 304,
  /** 307 Temporary Redirect - 临时重定向 */
  TEMPORARY_REDIRECT: 307,
  /** 308 Permanent Redirect - 永久重定向 */
  PERMANENT_REDIRECT: 308,
} as const);

/**
 * HTTP 4xx 客户端错误状态码
 */
export const HTTP_CLIENT_ERROR = deepFreeze({
  /** 400 Bad Request - 请求错误 */
  BAD_REQUEST: 400,
  /** 401 Unauthorized - 未授权 */
  UNAUTHORIZED: 401,
  /** 402 Payment Required - 需要付款 */
  PAYMENT_REQUIRED: 402,
  /** 403 Forbidden - 禁止访问 */
  FORBIDDEN: 403,
  /** 404 Not Found - 资源未找到 */
  NOT_FOUND: 404,
  /** 405 Method Not Allowed - 方法不被允许 */
  METHOD_NOT_ALLOWED: 405,
  /** 406 Not Acceptable - 不可接受 */
  NOT_ACCEPTABLE: 406,
  /** 407 Proxy Authentication Required - 需要代理身份验证 */
  PROXY_AUTHENTICATION_REQUIRED: 407,
  /** 408 Request Timeout - 请求超时 */
  REQUEST_TIMEOUT: 408,
  /** 409 Conflict - 冲突 */
  CONFLICT: 409,
  /** 410 Gone - 资源已删除 */
  GONE: 410,
  /** 411 Length Required - 需要内容长度 */
  LENGTH_REQUIRED: 411,
  /** 412 Precondition Failed - 前置条件失败 */
  PRECONDITION_FAILED: 412,
  /** 413 Payload Too Large - 请求实体过大 */
  PAYLOAD_TOO_LARGE: 413,
  /** 414 URI Too Long - URI过长 */
  URI_TOO_LONG: 414,
  /** 415 Unsupported Media Type - 不支持的媒体类型 */
  UNSUPPORTED_MEDIA_TYPE: 415,
  /** 416 Range Not Satisfiable - 范围不满足 */
  RANGE_NOT_SATISFIABLE: 416,
  /** 417 Expectation Failed - 期望失败 */
  EXPECTATION_FAILED: 417,
  /** 421 Misdirected Request - 请求错误定向 */
  MISDIRECTED_REQUEST: 421,
  /** 422 Unprocessable Entity - 无法处理的实体 */
  UNPROCESSABLE_ENTITY: 422,
  /** 423 Locked - 资源被锁定 */
  LOCKED: 423,
  /** 424 Failed Dependency - 依赖失败 */
  FAILED_DEPENDENCY: 424,
  /** 426 Upgrade Required - 需要升级 */
  UPGRADE_REQUIRED: 426,
  /** 428 Precondition Required - 需要前置条件 */
  PRECONDITION_REQUIRED: 428,
  /** 429 Too Many Requests - 请求过多 */
  TOO_MANY_REQUESTS: 429,
  /** 431 Request Header Fields Too Large - 请求头字段过大 */
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  /** 451 Unavailable For Legal Reasons - 因法律原因不可用 */
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
} as const);

/**
 * HTTP 5xx 服务器错误状态码
 */
export const HTTP_SERVER_ERROR = deepFreeze({
  /** 500 Internal Server Error - 内部服务器错误 */
  INTERNAL_SERVER_ERROR: 500,
  /** 501 Not Implemented - 未实现 */
  NOT_IMPLEMENTED: 501,
  /** 502 Bad Gateway - 网关错误 */
  BAD_GATEWAY: 502,
  /** 503 Service Unavailable - 服务不可用 */
  SERVICE_UNAVAILABLE: 503,
  /** 504 Gateway Timeout - 网关超时 */
  GATEWAY_TIMEOUT: 504,
  /** 505 HTTP Version Not Supported - HTTP版本不支持 */
  HTTP_VERSION_NOT_SUPPORTED: 505,
  /** 506 Variant Also Negotiates - 变体协商 */
  VARIANT_ALSO_NEGOTIATES: 506,
  /** 507 Insufficient Storage - 存储空间不足 */
  INSUFFICIENT_STORAGE: 507,
  /** 508 Loop Detected - 检测到循环 */
  LOOP_DETECTED: 508,
  /** 510 Not Extended - 不扩展 */
  NOT_EXTENDED: 510,
  /** 511 Network Authentication Required - 需要网络身份验证 */
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const);

/**
 * HTTP 状态码分类映射
 */
export const HTTP_STATUS_CATEGORIES = deepFreeze({
  /** 信息响应 */
  INFORMATIONAL: HTTP_INFORMATIONAL,
  /** 成功响应 */
  SUCCESS: HTTP_SUCCESS,
  /** 重定向 */
  REDIRECTION: HTTP_REDIRECTION,
  /** 客户端错误 */
  CLIENT_ERROR: HTTP_CLIENT_ERROR,
  /** 服务器错误 */
  SERVER_ERROR: HTTP_SERVER_ERROR,
} as const);

/**
 * 常用HTTP状态码快捷访问
 */
export const HTTP_STATUS_CODES = deepFreeze({
  // 成功响应
  OK: HTTP_SUCCESS.OK,
  CREATED: HTTP_SUCCESS.CREATED,
  NO_CONTENT: HTTP_SUCCESS.NO_CONTENT,
  
  // 客户端错误
  BAD_REQUEST: HTTP_CLIENT_ERROR.BAD_REQUEST,
  UNAUTHORIZED: HTTP_CLIENT_ERROR.UNAUTHORIZED,
  FORBIDDEN: HTTP_CLIENT_ERROR.FORBIDDEN,
  NOT_FOUND: HTTP_CLIENT_ERROR.NOT_FOUND,
  METHOD_NOT_ALLOWED: HTTP_CLIENT_ERROR.METHOD_NOT_ALLOWED,
  CONFLICT: HTTP_CLIENT_ERROR.CONFLICT,
  PAYLOAD_TOO_LARGE: HTTP_CLIENT_ERROR.PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE: HTTP_CLIENT_ERROR.UNSUPPORTED_MEDIA_TYPE,
  UNPROCESSABLE_ENTITY: HTTP_CLIENT_ERROR.UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS: HTTP_CLIENT_ERROR.TOO_MANY_REQUESTS,
  
  // 服务器错误
  INTERNAL_SERVER_ERROR: HTTP_SERVER_ERROR.INTERNAL_SERVER_ERROR,
  NOT_IMPLEMENTED: HTTP_SERVER_ERROR.NOT_IMPLEMENTED,
  BAD_GATEWAY: HTTP_SERVER_ERROR.BAD_GATEWAY,
  SERVICE_UNAVAILABLE: HTTP_SERVER_ERROR.SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT: HTTP_SERVER_ERROR.GATEWAY_TIMEOUT,
} as const);

/**
 * HTTP状态码描述信息
 */
export const HTTP_STATUS_MESSAGES = deepFreeze({
  // 2xx 成功
  [HTTP_SUCCESS.OK]: '请求成功',
  [HTTP_SUCCESS.CREATED]: '资源创建成功',
  [HTTP_SUCCESS.NO_CONTENT]: '操作成功，无返回内容',
  
  // 4xx 客户端错误
  [HTTP_CLIENT_ERROR.BAD_REQUEST]: '请求格式错误或参数无效',
  [HTTP_CLIENT_ERROR.UNAUTHORIZED]: '身份验证失败，请先登录',
  [HTTP_CLIENT_ERROR.FORBIDDEN]: '没有权限访问此资源',
  [HTTP_CLIENT_ERROR.NOT_FOUND]: '请求的资源未找到',
  [HTTP_CLIENT_ERROR.METHOD_NOT_ALLOWED]: '不支持的请求方法',
  [HTTP_CLIENT_ERROR.CONFLICT]: '请求与服务器当前状态冲突',
  [HTTP_CLIENT_ERROR.PAYLOAD_TOO_LARGE]: '请求内容过大',
  [HTTP_CLIENT_ERROR.UNSUPPORTED_MEDIA_TYPE]: '不支持的媒体类型',
  [HTTP_CLIENT_ERROR.UNPROCESSABLE_ENTITY]: '请求格式正确但语义错误',
  [HTTP_CLIENT_ERROR.TOO_MANY_REQUESTS]: '请求频率过高，请稍后重试',
  
  // 5xx 服务器错误
  [HTTP_SERVER_ERROR.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [HTTP_SERVER_ERROR.NOT_IMPLEMENTED]: '功能未实现',
  [HTTP_SERVER_ERROR.BAD_GATEWAY]: '网关错误',
  [HTTP_SERVER_ERROR.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [HTTP_SERVER_ERROR.GATEWAY_TIMEOUT]: '网关超时',
} as const);

/**
 * HTTP状态码工具函数
 */
export class HttpStatusCodeUtil {
  /**
   * 判断是否为信息响应状态码 (1xx)
   */
  static isInformational(statusCode: number): boolean {
    return statusCode >= 100 && statusCode < 200;
  }
  
  /**
   * 判断是否为成功响应状态码 (2xx)
   */
  static isSuccess(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 300;
  }
  
  /**
   * 判断是否为重定向状态码 (3xx)
   */
  static isRedirection(statusCode: number): boolean {
    return statusCode >= 300 && statusCode < 400;
  }
  
  /**
   * 判断是否为客户端错误状态码 (4xx)
   */
  static isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500;
  }
  
  /**
   * 判断是否为服务器错误状态码 (5xx)
   */
  static isServerError(statusCode: number): boolean {
    return statusCode >= 500 && statusCode < 600;
  }
  
  /**
   * 获取状态码对应的描述信息
   */
  static getMessage(statusCode: number): string {
    return HTTP_STATUS_MESSAGES[statusCode] || `未知状态码: ${statusCode}`;
  }
  
  /**
   * 判断状态码是否表示错误
   */
  static isError(statusCode: number): boolean {
    return this.isClientError(statusCode) || this.isServerError(statusCode);
  }
}