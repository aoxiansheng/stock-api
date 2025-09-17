/**
 * 通用值大小验证器
 * 🎯 提供可配置的数据大小验证装饰器
 * ✅ 支持字节大小、序列化后大小限制
 * 🔄 替代各模块的重复大小验证实现
 *
 * @description 通用值大小验证，供所有模块使用
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * 验证序列化后值的字节大小装饰器
 * @param maxSizeBytes 最大字节数
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MaxValueSize(
  maxSizeBytes: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "maxValueSize",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxSizeBytes],
      options: {
        message: `值的序列化大小不能超过 $constraint1 字节`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value == null) {
            return true; // null值允许
          }
          const [maxSize] = args.constraints;
          try {
            const serialized = JSON.stringify(value);
            const sizeBytes = Buffer.byteLength(serialized, "utf8");
            return sizeBytes <= maxSize;
          } catch {
            // 序列化失败，认为验证不通过
            return false;
          }
        },
      },
    });
  };
}

/**
 * 验证数组长度装饰器
 * @param maxLength 最大长度
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function MaxArrayLength(
  maxLength: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "maxArrayLength",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxLength],
      options: {
        message: `数组长度不能超过 $constraint1 个元素`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) {
            return false;
          }
          const [maxLength] = args.constraints;
          return value.length <= maxLength;
        },
      },
    });
  };
}
