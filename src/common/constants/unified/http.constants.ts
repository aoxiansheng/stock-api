/**
 * HTTP相关统一常量
 * 包含状态码、错误消息等HTTP层面的标准定义
 *
 * 设计原则：
 * - 标准化：遵循HTTP规范的状态码定义
 * - 国际化就绪：错误消息采用中文，便于后续国际化扩展
 * - 语义明确：错误消息描述准确，便于用户理解
 * - 统一性：确保整个应用的错误消息风格一致
 */

import { deepFreeze } from "../../utils/object-immutability.util";
import { OPERATION_CONSTANTS } from "./operations.constants";
import { AUTH_ERROR_MESSAGES, BUSINESS_ERROR_MESSAGES } from "../error-messages.constants";
import { QUICK_MESSAGES } from "./message-templates.constants";
import { BASE_MESSAGES, BASE_STATUS_CODES } from "./base.constants";
import { PERMISSION_MESSAGES } from "./permission-message.constants";

export const HTTP_CONSTANTS = deepFreeze({
  // HTTP状态码 - 引用基础常量，避免重复定义
  STATUS_CODES: {
    // 2xx 成功状态码
    OK: BASE_STATUS_CODES.SUCCESS.OK,
    CREATED: BASE_STATUS_CODES.SUCCESS.CREATED,
    ACCEPTED: BASE_STATUS_CODES.SUCCESS.ACCEPTED,
    NO_CONTENT: BASE_STATUS_CODES.SUCCESS.NO_CONTENT,

    // 4xx 客户端错误状态码
    BAD_REQUEST: BASE_STATUS_CODES.CLIENT_ERROR.BAD_REQUEST,
    UNAUTHORIZED: BASE_STATUS_CODES.CLIENT_ERROR.UNAUTHORIZED,
    FORBIDDEN: BASE_STATUS_CODES.CLIENT_ERROR.FORBIDDEN,
    NOT_FOUND: BASE_STATUS_CODES.CLIENT_ERROR.NOT_FOUND,
    METHOD_NOT_ALLOWED: BASE_STATUS_CODES.CLIENT_ERROR.METHOD_NOT_ALLOWED,
    CONFLICT: BASE_STATUS_CODES.CLIENT_ERROR.CONFLICT,
    UNPROCESSABLE_ENTITY: BASE_STATUS_CODES.CLIENT_ERROR.UNPROCESSABLE_ENTITY,
    TOO_MANY_REQUESTS: BASE_STATUS_CODES.CLIENT_ERROR.TOO_MANY_REQUESTS,

    // 5xx 服务器错误状态码
    INTERNAL_SERVER_ERROR: BASE_STATUS_CODES.SERVER_ERROR.INTERNAL_SERVER_ERROR,
    NOT_IMPLEMENTED: BASE_STATUS_CODES.SERVER_ERROR.NOT_IMPLEMENTED,
    BAD_GATEWAY: BASE_STATUS_CODES.SERVER_ERROR.BAD_GATEWAY,
    SERVICE_UNAVAILABLE: BASE_STATUS_CODES.SERVER_ERROR.SERVICE_UNAVAILABLE,
    GATEWAY_TIMEOUT: BASE_STATUS_CODES.SERVER_ERROR.GATEWAY_TIMEOUT,
  },

  // 统一错误消息（中文）
  ERROR_MESSAGES: {
    // 通用HTTP错误
    BAD_REQUEST: "请求参数错误",
    UNAUTHORIZED: BASE_MESSAGES.PERMISSION.UNAUTHORIZED_ACCESS, // 直接引用基础定义，简化层次
    FORBIDDEN: "访问被禁止",
    NOT_FOUND: QUICK_MESSAGES.RESOURCE_NOT_FOUND, // 使用模板，避免重复
    METHOD_NOT_ALLOWED: "请求方法不被允许",
    CONFLICT: "请求冲突",
    UNPROCESSABLE_ENTITY: "请求参数验证失败",
    TOO_MANY_REQUESTS: "请求频率超出限制",
    INTERNAL_SERVER_ERROR: "服务器内部错误",
    SERVICE_UNAVAILABLE: "服务暂时不可用",
    GATEWAY_TIMEOUT: "网关超时",

    // 认证相关错误
    INVALID_CREDENTIALS: "用户名或密码错误",
    USER_NOT_FOUND: QUICK_MESSAGES.USER_NOT_FOUND, // 使用模板，避免重复
    TOKEN_EXPIRED: "token已过期",
    TOKEN_INVALID: "token无效",
    API_KEY_NOT_FOUND: QUICK_MESSAGES.API_KEY_NOT_FOUND, // 使用模板，避免重复
    API_KEY_INVALID: "API Key无效",
    API_KEY_EXPIRED: "API Key已过期",
    INSUFFICIENT_PERMISSIONS: BASE_MESSAGES.PERMISSION.INSUFFICIENT_PRIVILEGES,
    ACCESS_DENIED: PERMISSION_MESSAGES.ACCESS_DENIED,

    // 业务操作错误
    OPERATION_FAILED: BUSINESS_ERROR_MESSAGES.OPERATION_FAILED,
    DATA_NOT_FOUND: QUICK_MESSAGES.DATA_NOT_FOUND, // 使用模板，避免重复
    VALIDATION_FAILED: "验证失败",
    PROCESSING_FAILED: "处理失败",

    // 资源相关错误
    RESOURCE_NOT_FOUND: QUICK_MESSAGES.RESOURCE_NOT_FOUND, // 使用模板，避免重复
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
  },

  // 成功消息
  SUCCESS_MESSAGES: {
    OPERATION_SUCCESS: "操作成功",
    // CRUD操作消息引用统一定义，避免重复
    CREATE_SUCCESS: OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_SUCCESS,
    UPDATE_SUCCESS: OPERATION_CONSTANTS.CRUD_MESSAGES.UPDATE_SUCCESS,
    DELETE_SUCCESS: OPERATION_CONSTANTS.CRUD_MESSAGES.DELETE_SUCCESS,
    QUERY_SUCCESS: "查询成功",
    VALIDATION_SUCCESS: "验证成功",
    PROCESS_SUCCESS: "处理成功",
    SYNC_SUCCESS: "同步成功",
  },
});

// 导出类型定义
export type HttpStatusCode =
  (typeof HTTP_CONSTANTS.STATUS_CODES)[keyof typeof HTTP_CONSTANTS.STATUS_CODES];
export type ErrorMessage =
  (typeof HTTP_CONSTANTS.ERROR_MESSAGES)[keyof typeof HTTP_CONSTANTS.ERROR_MESSAGES];
export type SuccessMessage =
  (typeof HTTP_CONSTANTS.SUCCESS_MESSAGES)[keyof typeof HTTP_CONSTANTS.SUCCESS_MESSAGES];

/**
 * 检查是否为成功状态码 (2xx)
 */
export function isSuccessStatusCode(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * 检查是否为客户端错误状态码 (4xx)
 */
export function isClientErrorStatusCode(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * 检查是否为服务器错误状态码 (5xx)
 */
export function isServerErrorStatusCode(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * 根据状态码获取对应的错误类型
 */
export function getErrorTypeByStatusCode(
  statusCode: number,
): "client" | "server" | "unknown" {
  if (isClientErrorStatusCode(statusCode)) return "client";
  if (isServerErrorStatusCode(statusCode)) return "server";
  return "unknown";
}
