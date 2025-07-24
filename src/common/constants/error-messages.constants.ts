/**
 * 统一错误消息常量
 * 🎯 符合开发规范指南 - 统一消息管理，避免重复定义
 *
 * 这个文件统一管理所有系统错误消息，避免在多个地方重复定义相同的错误消息
 */
import { deepFreeze } from "@common/utils/object-immutability.util";

// 📢 认证和授权错误消息
export const AUTH_ERROR_MESSAGES = deepFreeze({
  // 通用认证错误
  UNAUTHORIZED_ACCESS: "未授权访问",
  FORBIDDEN_ACCESS: "访问被禁止",
  AUTHENTICATION_FAILED: "认证失败",
  AUTHORIZATION_FAILED: "授权失败",

  // 用户认证错误
  INVALID_CREDENTIALS: "用户名或密码错误",
  USER_NOT_FOUND: "用户不存在",
  USER_INACTIVE: "用户账户已停用",
  USER_LOCKED: "用户账户已锁定",
  USER_EXISTS: "用户名或邮箱已存在",

  // JWT Token 错误
  JWT_AUTH_FAILED: "JWT认证失败",
  TOKEN_INVALID: "token无效",
  TOKEN_EXPIRED: "token已过期",
  TOKEN_NOT_ACTIVE: "token尚未生效",
  TOKEN_MALFORMED: "token格式错误",
  REFRESH_TOKEN_INVALID: "刷新令牌无效",

  // API Key 错误
  API_CREDENTIALS_MISSING: "缺少API凭证",
  API_CREDENTIALS_INVALID: "API凭证无效",
  API_CREDENTIALS_EXPIRED: "API凭证已过期",
  API_CREDENTIALS_REVOKED: "API凭证已被撤销",
  API_KEY_NOT_FOUND: "API Key不存在",
  API_KEY_ALREADY_REVOKED: "API Key已被撤销",
  API_KEY_NOT_FOUND_OR_NO_PERMISSION: "API Key不存在或无权限操作",
  API_KEY_VALIDATION_FAILED: "API Key验证失败",
  API_KEY_PERMISSIONS_INSUFFICIENT: "API Key权限不足",
  API_KEY_GENERATION_FAILED: "API Key生成失败",

  // 权限错误
  INSUFFICIENT_PERMISSIONS: "权限不足",
  PERMISSION_DENIED: "权限被拒绝",
  ROLE_INSUFFICIENT: "角色权限不足",

  // 密码相关错误
  PASSWORD_VERIFICATION_FAILED: "密码验证失败",
  WEAK_PASSWORD: "密码强度不足",
  PASSWORD_REUSE: "不能使用之前使用过的密码",
  PASSWORD_EXPIRED: "密码已过期",

  // 邮箱验证错误
  EMAIL_NOT_VERIFIED: "邮箱未验证",
  EMAIL_VERIFICATION_FAILED: "邮箱验证失败",

  // 多因素认证错误
  TWO_FACTOR_REQUIRED: "需要双因素认证",
  TWO_FACTOR_INVALID: "双因素认证码无效",
  TWO_FACTOR_EXPIRED: "双因素认证码已过期",
});

// 📢 数据库错误消息 (MongoDB)
export const DB_ERROR_MESSAGES = deepFreeze({
  DUPLICATE_KEY: "数据已存在，无法重复创建",
  VALIDATION_FAILED: "数据格式不符合要求",
  BAD_QUERY: "数据库查询条件错误",
  INSUFFICIENT_PERMISSIONS: "数据库权限不足",
  OPERATION_FAILED: "数据库操作失败",
});

// 📢 验证相关错误消息
export const VALIDATION_MESSAGES = deepFreeze({
  VALIDATION_FAILED: "数据验证失败",
  VALIDATION_PREFIX: "验证失败:",
  IS_NOT_EMPTY: "不能为空",
  UNSUPPORTED_DATA_TYPE: "不支持的数据类型",
  DATA_TYPE_PREFIX: "数据类型",
  MUST_BE: "必须是",
  UNKNOWN_FIELD: "unknown",
  DEFAULT_FIELD_ERROR: "字段错误",
});

// 📢 验证消息翻译
export const VALIDATION_TRANSLATIONS = deepFreeze({
  "must be a string": "必须是字符串",
  "must be a number": "必须是数字",
  "must be a boolean": "必须是布尔值",
  "must be an array": "必须是数组",
  "must be a date": "必须是日期",
  "should not be empty": "不能为空",
  "must be defined": "必须定义",
  "must be an email": "必须是有效的邮箱地址",
  "must be longer than": "长度不能少于",
  "must be shorter than": "长度不能超过",
  "must be a valid": "必须是有效的",
  "name should not be empty": "不能为空",
});

// 📢 业务逻辑错误消息
export const BUSINESS_ERROR_MESSAGES = deepFreeze({
  // 数据验证错误
  VALIDATION_FAILED: "数据验证失败",
  REQUIRED_FIELD_MISSING: "必填字段缺失",
  INVALID_FORMAT: "格式无效",
  INVALID_VALUE: "值无效",

  // 资源错误
  RESOURCE_NOT_FOUND: "资源不存在",
  RESOURCE_ALREADY_EXISTS: "资源已存在",
  RESOURCE_CONFLICT: "资源冲突",
  RESOURCE_LOCKED: "资源已锁定",

  // 操作错误
  OPERATION_FAILED: "操作失败",
  OPERATION_NOT_ALLOWED: "操作不被允许",
  OPERATION_TIMEOUT: "操作超时",
  CREATE_FAILED: "创建失败",
  UPDATE_FAILED: "更新失败",
  DELETE_FAILED: "删除失败",
  REVOKE_FAILED: "撤销失败",
  REGENERATE_FAILED: "重新生成失败",
  OPERATION_DEFAULT_FAILURE: "业务处理失败",

  // API Key 特定操作错误
  CREATE_API_KEY_FAILED: "创建API Key失败",
  GET_USER_API_KEYS_FAILED: "获取用户API Keys失败",
  REVOKE_API_KEY_FAILED: "撤销API Key失败",
  UPDATE_API_KEY_FAILED: "更新API Key失败",
  DELETE_API_KEY_FAILED: "删除API Key失败",
  REGENERATE_API_KEY_FAILED: "重新生成API Key失败",
  UPDATE_USAGE_FAILED: "更新API Key使用统计失败",
  UPDATE_USAGE_DB_FAILED: "更新API Key使用统计数据库操作失败",

  // 频率限制错误
  RATE_LIMIT_EXCEEDED: "请求频率超出限制",
  TOO_MANY_REQUESTS: "请求过于频繁",

  // 数据相关错误
  DATA_NOT_FOUND: "数据不存在",
  DATA_CORRUPTED: "数据损坏",
  DATA_PROCESSING_FAILED: "数据处理失败",
});

// 📢 系统错误消息
export const SYSTEM_ERROR_MESSAGES = deepFreeze({
  // 服务器错误
  INTERNAL_SERVER_ERROR: "服务器内部错误",
  SERVICE_UNAVAILABLE: "服务暂时不可用",
  GATEWAY_TIMEOUT: "网关超时",

  // 数据库错误
  DATABASE_ERROR: "数据库错误",
  DATABASE_CONNECTION_ERROR: "数据库连接错误",
  DATABASE_TIMEOUT: "数据库操作超时",
  DB_UNAVAILABLE: "数据库服务暂时不可用，请稍后重试",

  // 网络错误
  NETWORK_ERROR: "网络错误",
  CONNECTION_TIMEOUT: "连接超时",
  REQUEST_TIMEOUT: "请求超时，请稍后重试",

  // 第三方服务错误
  EXTERNAL_SERVICE_ERROR: "外部服务错误",
  API_CALL_FAILED: "API调用失败",

  // 配置错误
  CONFIGURATION_ERROR: "配置错误",
  ENVIRONMENT_ERROR: "环境配置错误",
  INVALID_JSON: "JSON格式错误",
});

// 📢 HTTP状态码对应的错误消息
export const HTTP_ERROR_MESSAGES = deepFreeze({
  // 4xx 客户端错误
  BAD_REQUEST: "请求参数错误",
  HTTP_UNAUTHORIZED: "未授权访问", // 重命名，避免与AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS重复
  FORBIDDEN: "访问被禁止",
  NOT_FOUND: "资源不存在",
  METHOD_NOT_ALLOWED: "请求方法不允许",
  CONFLICT: "请求冲突",
  PAYLOAD_TOO_LARGE: "请求体过大",
  HTTP_TOO_MANY_REQUESTS: "请求频率超出限制", // 重命名，避免与BUSINESS_ERROR_MESSAGES.TOO_MANY_REQUESTS重复
  ROUTE_NOT_FOUND: "请求的接口不存在",
  DEFAULT_ERROR: "HTTP异常",

  // 5xx 服务器错误
  HTTP_INTERNAL_SERVER_ERROR: "服务器内部错误", // 重命名，避免与SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR重复
  NOT_IMPLEMENTED: "功能未实现",
  BAD_GATEWAY: "网关错误",
  HTTP_SERVICE_UNAVAILABLE: "服务暂时不可用", // 重命名，避免与SYSTEM_ERROR_MESSAGES.SERVICE_UNAVAILABLE重复
  HTTP_GATEWAY_TIMEOUT: "网关超时", // 重命名，避免与SYSTEM_ERROR_MESSAGES.GATEWAY_TIMEOUT重复
});

// 📢 统一的错误消息集合（向后兼容）
export const ERROR_MESSAGES = deepFreeze({
  ...AUTH_ERROR_MESSAGES,
  ...BUSINESS_ERROR_MESSAGES,
  ...SYSTEM_ERROR_MESSAGES,
  ...HTTP_ERROR_MESSAGES,
  ...DB_ERROR_MESSAGES,
  ...VALIDATION_MESSAGES,
});

// 📢 错误消息类型枚举
export enum ErrorMessageType {
  AUTH = "AUTH",
  BUSINESS = "BUSINESS",
  SYSTEM = "SYSTEM",
  HTTP = "HTTP",
}

// 📢 错误消息获取工具函数
export class ErrorMessageUtil {
  /**
   * 根据类型获取错误消息
   */
  static getByType(type: ErrorMessageType, key: string): string {
    switch (type) {
      case ErrorMessageType.AUTH:
        return (
          AUTH_ERROR_MESSAGES[key] || AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS
        );
      case ErrorMessageType.BUSINESS:
        return (
          BUSINESS_ERROR_MESSAGES[key] ||
          BUSINESS_ERROR_MESSAGES.OPERATION_FAILED
        );
      case ErrorMessageType.SYSTEM:
        return (
          SYSTEM_ERROR_MESSAGES[key] ||
          SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        );
      case ErrorMessageType.HTTP:
        return (
          HTTP_ERROR_MESSAGES[key] || HTTP_ERROR_MESSAGES.HTTP_INTERNAL_SERVER_ERROR
        );
      default:
        return ERROR_MESSAGES[key] || AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
    }
  }

  /**
   * 检查错误消息是否存在
   */
  static exists(key: string): boolean {
    return key in ERROR_MESSAGES;
  }

  /**
   * 获取所有错误消息
   */
  static getAll(): Record<string, string> {
    return ERROR_MESSAGES;
  }
}
