/**
 * Auth模块验证装饰器
 * 🎯 提供Auth专用的验证装饰器，复用Common组件的验证逻辑
 * ✅ 替代手动验证方法，符合NestJS最佳实践
 * 🔄 与GlobalExceptionFilter统一异常处理
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { CONSTANTS } from "@common/constants";
// 🎯 引入通用验证器
import {
  IsValidStringLength,
  IsValidEmail,
  IsValidPhoneNumber,
  IsNumberInRange,
} from "@common/validators";

// Auth模块验证常量
const AUTH_VALIDATION_LIMITS = {
  // 用户名限制
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 32,
  
  // 密码限制
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  
  // API Key限制
  API_KEY_LENGTH: 32,
  ACCESS_TOKEN_LENGTH: 64,
  
  // 会话限制
  SESSION_TIMEOUT_MIN: 300, // 5分钟
  SESSION_TIMEOUT_MAX: 86400, // 24小时
  
  // 权限限制
  ROLE_NAME_MAX_LENGTH: 50,
  PERMISSION_NAME_MAX_LENGTH: 100,
};

/**
 * 验证用户名格式
 * 用户名必须是3-32个字符，只能包含字母、数字、下划线和连字符
 */
export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidUsername",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: "用户名必须是3-32个字符，只能包含字母、数字、下划线和连字符",
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (
            value.length < AUTH_VALIDATION_LIMITS.USERNAME_MIN_LENGTH ||
            value.length > AUTH_VALIDATION_LIMITS.USERNAME_MAX_LENGTH
          ) {
            return false;
          }

          // 格式检查：只允许字母、数字、下划线和连字符
          const usernamePattern = /^[a-zA-Z0-9_-]+$/;
          if (!usernamePattern.test(value)) {
            return false;
          }

          // 不能以下划线或连字符开头/结尾
          if (value.startsWith("_") || value.startsWith("-") || 
              value.endsWith("_") || value.endsWith("-")) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

/**
 * 验证密码强度
 * 密码必须包含至少一个大写字母、一个小写字母、一个数字
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isStrongPassword",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: "密码必须是8-128个字符，包含至少一个大写字母、一个小写字母、一个数字",
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (
            value.length < AUTH_VALIDATION_LIMITS.PASSWORD_MIN_LENGTH ||
            value.length > AUTH_VALIDATION_LIMITS.PASSWORD_MAX_LENGTH
          ) {
            return false;
          }

          // 强度检查
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

          // 至少包含三种字符类型
          const typesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
          
          return typesCount >= 3;
        },
      },
    });
  };
}

/**
 * 验证API Key格式
 * API Key必须是32个字符的十六进制字符串
 */
export function IsValidApiKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidApiKey",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: "API Key必须是32位十六进制字符串",
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (value.length !== AUTH_VALIDATION_LIMITS.API_KEY_LENGTH) {
            return false;
          }

          // 格式检查：只允许十六进制字符
          const hexPattern = /^[a-fA-F0-9]+$/;
          return hexPattern.test(value);
        },
      },
    });
  };
}

/**
 * 验证访问令牌格式
 * Access Token必须是64个字符的十六进制字符串
 */
export function IsValidAccessToken(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidAccessToken",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: "访问令牌必须是64位十六进制字符串",
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (value.length !== AUTH_VALIDATION_LIMITS.ACCESS_TOKEN_LENGTH) {
            return false;
          }

          // 格式检查：只允许十六进制字符
          const hexPattern = /^[a-fA-F0-9]+$/;
          return hexPattern.test(value);
        },
      },
    });
  };
}

/**
 * 验证角色名称
 * 角色名称必须是有效的字符串，长度在合理范围内
 */
export function IsValidRoleName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidRoleName",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `角色名称必须是1-${AUTH_VALIDATION_LIMITS.ROLE_NAME_MAX_LENGTH}个字符，只能包含字母、数字、下划线、连字符和空格`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // 长度检查
          if (
            value.length === 0 ||
            value.length > AUTH_VALIDATION_LIMITS.ROLE_NAME_MAX_LENGTH
          ) {
            return false;
          }

          // 格式检查：允许字母、数字、下划线、连字符和空格
          const roleNamePattern = /^[a-zA-Z0-9_\-\s]+$/;
          if (!roleNamePattern.test(value)) {
            return false;
          }

          // 不能只包含空格
          if (value.trim().length === 0) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

/**
 * 🎯 使用通用验证器的便捷装饰器
 */

// 用户名长度验证
export const IsUsernameLength = (validationOptions?: ValidationOptions) =>
  IsValidStringLength(
    {
      min: AUTH_VALIDATION_LIMITS.USERNAME_MIN_LENGTH,
      max: AUTH_VALIDATION_LIMITS.USERNAME_MAX_LENGTH,
      message: `用户名长度必须在 ${AUTH_VALIDATION_LIMITS.USERNAME_MIN_LENGTH} 到 ${AUTH_VALIDATION_LIMITS.USERNAME_MAX_LENGTH} 个字符之间`,
    },
    validationOptions,
  );

// 密码长度验证
export const IsPasswordLength = (validationOptions?: ValidationOptions) =>
  IsValidStringLength(
    {
      min: AUTH_VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
      max: AUTH_VALIDATION_LIMITS.PASSWORD_MAX_LENGTH,
      message: `密码长度必须在 ${AUTH_VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} 到 ${AUTH_VALIDATION_LIMITS.PASSWORD_MAX_LENGTH} 个字符之间`,
    },
    validationOptions,
  );

// 会话超时验证
export const IsValidSessionTimeout = (validationOptions?: ValidationOptions) =>
  IsNumberInRange(
    {
      min: AUTH_VALIDATION_LIMITS.SESSION_TIMEOUT_MIN,
      max: AUTH_VALIDATION_LIMITS.SESSION_TIMEOUT_MAX,
      message: `会话超时时间必须在 ${AUTH_VALIDATION_LIMITS.SESSION_TIMEOUT_MIN} 到 ${AUTH_VALIDATION_LIMITS.SESSION_TIMEOUT_MAX} 秒之间`,
    },
    validationOptions,
  );

// 重新导出通用验证器
export { IsValidEmail, IsValidPhoneNumber } from "@common/validators";

// 导出验证常量
export const AUTH_VALIDATION_CONSTANTS = Object.freeze(AUTH_VALIDATION_LIMITS);