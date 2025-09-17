/**
 * URL验证器
 * 🎯 提供URL格式验证装饰器
 *
 * @description 基于HTTP/HTTPS URL格式验证规则
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
 * URL验证约束
 */
@ValidatorConstraint({ async: false })
export class IsValidUrlConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== "string") {
      return false;
    }

    try {
      const url = new URL(value);

      // 只允许HTTP和HTTPS协议
      if (!["http:", "https:"].includes(url.protocol)) {
        return false;
      }

      // 检查主机名
      if (!url.hostname || url.hostname.length === 0) {
        return false;
      }

      // URL长度限制
      if (value.length > 2048) {
        return false;
      }

      // 基本格式验证
      const urlPattern =
        /^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?$/;
      return urlPattern.test(value);
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} 必须是有效的HTTP或HTTPS URL格式`;
  }
}

/**
 * URL验证装饰器
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * export class WebhookDto {
 *   @IsValidUrl({ message: 'Webhook URL格式不正确' })
 *   url: string;
 * }
 * ```
 */
export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUrlConstraint,
    });
  };
}
