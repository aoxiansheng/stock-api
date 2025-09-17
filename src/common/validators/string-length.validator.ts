/**
 * 通用字符串长度验证器
 * 🎯 提供可配置的字符串长度验证装饰器
 * ✅ 支持最小、最大长度限制
 * 🔄 替代各模块的重复字符串长度验证实现
 *
 * @description 通用字符串长度验证，供所有模块使用
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * 验证字符串长度限制装饰器
 * @param maxLength 最大长度
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function IsValidStringLength(
  options: {
    max?: number;
    min?: number;
    message?: string;
  },
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isValidStringLength",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [options.max, options.min],
      options: {
        message:
          options.message ||
          `字符串长度必须在 ${options.min || 0} 到 ${options.max || "无限制"} 个字符之间`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }
          const [maxLength, minLength = 0] = args.constraints;
          return (
            value.length >= minLength &&
            (!maxLength || value.length <= maxLength)
          );
        },
      },
    });
  };
}

/**
 * 最大字符串长度验证装饰器
 * @param maxLength 最大长度
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MaxStringLength(
  maxLength: number,
  validationOptions?: ValidationOptions,
) {
  return IsValidStringLength({ max: maxLength }, validationOptions);
}

/**
 * 最小字符串长度验证装饰器
 * @param minLength 最小长度
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MinStringLength(
  minLength: number,
  validationOptions?: ValidationOptions,
) {
  return IsValidStringLength({ min: minLength }, validationOptions);
}
