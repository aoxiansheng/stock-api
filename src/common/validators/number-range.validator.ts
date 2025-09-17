/**
 * 通用数值范围验证器
 * 🎯 提供可配置的数值范围验证装饰器
 * ✅ 支持最小、最大值限制
 * 🔄 替代各模块的重复数值范围验证实现
 *
 * @description 通用数值范围验证，供所有模块使用
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * 验证数值范围限制装饰器
 * @param options 范围配置选项
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function IsNumberInRange(
  options: {
    min?: number;
    max?: number;
    message?: string;
  },
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isNumberInRange",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [options.min, options.max],
      options: {
        message:
          options.message ||
          `数值必须在 ${options.min || "无限制"} 到 ${options.max || "无限制"} 之间`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "number") {
            return false;
          }
          const [minValue, maxValue] = args.constraints;
          return (
            (minValue === undefined || value >= minValue) &&
            (maxValue === undefined || value <= maxValue)
          );
        },
      },
    });
  };
}

/**
 * 最小数值验证装饰器
 * @param minValue 最小值
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MinNumber(
  minValue: number,
  validationOptions?: ValidationOptions,
) {
  return IsNumberInRange({ min: minValue }, validationOptions);
}

/**
 * 最大数值验证装饰器
 * @param maxValue 最大值
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MaxNumber(
  maxValue: number,
  validationOptions?: ValidationOptions,
) {
  return IsNumberInRange({ max: maxValue }, validationOptions);
}
