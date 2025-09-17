/**
 * 手机号验证器
 * 🎯 提供手机号格式验证装饰器
 *
 * @description 基于国际手机号格式验证规则
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
 * 手机号验证约束
 */
@ValidatorConstraint({ async: false })
export class IsValidPhoneNumberConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== "string") {
      return false;
    }

    // 移除所有空格、短横线、括号等常见分隔符
    const cleanPhone = value.replace(/[\s\-\(\)\+]/g, "");

    // 检查是否只包含数字
    if (!/^\d+$/.test(cleanPhone)) {
      return false;
    }

    // 长度检查：国际手机号通常在7-15位之间
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return false;
    }

    // 支持国际格式的手机号验证
    // 允许以+开头，然后是1-3位国家代码，接着是7-12位本地号码
    const internationalPattern = /^\+?[1-9]\d{6,14}$/;

    // 中国大陆手机号格式：1开头，第二位是3-9，总长11位
    const chinaPattern = /^1[3-9]\d{9}$/;

    // 检查原始号码（包含+号）
    const originalPattern = /^\+?[1-9]\d{6,14}$/;

    return (
      originalPattern.test(value.replace(/[\s\-\(\)]/g, "")) ||
      chinaPattern.test(cleanPhone)
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} 必须是有效的手机号码格式`;
  }
}

/**
 * 手机号验证装饰器
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * export class SmsDto {
 *   @IsValidPhoneNumber({ message: '手机号格式不正确' })
 *   phone: string;
 * }
 * ```
 */
export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneNumberConstraint,
    });
  };
}
