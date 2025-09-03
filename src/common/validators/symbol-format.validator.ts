import { registerDecorator, ValidationOptions } from "class-validator";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";

/**
 * 股票代码格式验证装饰器
 * 使用统一的符号验证逻辑
 */
export function IsValidSymbolFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isValidSymbolFormat",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;

          // 单个符号验证
          if (typeof value === "string") {
            return SymbolValidationUtils.isValidSymbol(value);
          }

          // 符号数组验证
          if (Array.isArray(value)) {
            return value.every(
              (symbol) =>
                typeof symbol === "string" &&
                SymbolValidationUtils.isValidSymbol(symbol),
            );
          }

          return false;
        },
        defaultMessage() {
          const examples = SymbolValidationUtils.getSupportedFormatExamples();
          const exampleList = Object.values(examples)
            .flat()
            .slice(0, 5)
            .join(", ");

          return `股票代码格式不正确。支持的格式示例: ${exampleList}`;
        },
      },
    });
  };
}

/**
 * 股票代码数量限制验证装饰器
 */
export function IsSymbolCountValid(
  maxCount?: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSymbolCountValid",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!Array.isArray(value)) return false;

          return !SymbolValidationUtils.isSymbolCountExceeded(value, maxCount);
        },
        defaultMessage() {
          const limit = maxCount || 100;
          return `股票代码数量不能超过 ${limit} 个`;
        },
      },
    });
  };
}
