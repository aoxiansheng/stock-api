/**
 * 邮箱验证器
 * 🎯 提供邮箱格式验证装饰器
 *
 * @description 基于常用的邮箱格式验证规则
 * @author Claude Code Assistant
 * @date 2025-09-16
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

/**
 * 邮箱验证约束
 */
@ValidatorConstraint({ async: false })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== "string") {
      return false;
    }

    // 邮箱格式正则表达式
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // 基本格式验证
    if (!emailPattern.test(value)) {
      return false;
    }

    // 长度限制
    if (value.length > 254) {
      return false;
    }

    // 本地部分长度限制（@符号前）
    const localPart = value.split("@")[0];
    if (localPart.length > 64) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} 必须是有效的邮箱地址格式`;
  }
}

/**
 * 邮箱验证装饰器
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * export class UserDto {
 *   @IsValidEmail({ message: '邮箱格式不正确' })
 *   email: string;
 * }
 * ```
 */
export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidEmailConstraint,
    });
  };
}
