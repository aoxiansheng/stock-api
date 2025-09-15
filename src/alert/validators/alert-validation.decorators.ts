/**
 * Alert专用验证装饰器
 * 🎯 提供Alert业务特定的验证装饰器，增强验证能力
 * 
 * @description 基于class-validator创建Alert领域专用验证装饰器
 * @author Claude Code Assistant  
 * @date 2025-09-15
 */

import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { VALID_OPERATORS } from '../constants';
import { AlertSeverity } from '../types/alert.types';

/**
 * 验证Alert操作符
 * 确保操作符在允许的列表中
 * 
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsValidAlertOperator({ message: '无效的告警操作符' })
 *   operator: string;
 * }
 * ```
 */
export function IsValidAlertOperator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAlertOperator',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }
          return VALID_OPERATORS.includes(value as any);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} 必须是有效的告警操作符: ${VALID_OPERATORS.join(', ')}`;
        },
      },
    });
  };
}

/**
 * 验证Alert严重级别
 * 确保严重级别在允许的枚举值中
 * 
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsValidSeverityLevel({ message: '无效的告警严重级别' })
 *   severity: AlertSeverity;
 * }
 * ```
 */
export function IsValidSeverityLevel(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidSeverityLevel',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }
          return Object.values(AlertSeverity).includes(value as AlertSeverity);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} 必须是有效的告警严重级别: ${Object.values(AlertSeverity).join(', ')}`;
        },
      },
    });
  };
}

/**
 * 验证Alert时间范围
 * 确保时间值在指定范围内，支持动态最小值和最大值
 * 
 * @param min - 最小值（秒）
 * @param max - 最大值（秒）
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsAlertTimeRange(30, 600, { message: '持续时间必须在30-600秒之间' })
 *   duration: number;
 *   
 *   @IsAlertTimeRange(60, 7200, { message: '冷却时间必须在60-7200秒之间' })
 *   cooldown: number;
 * }
 * ```
 */
export function IsAlertTimeRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAlertTimeRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [minValue, maxValue] = args.constraints;
          
          if (typeof value !== 'number') {
            return false;
          }
          
          if (!Number.isInteger(value) || value < 0) {
            return false;
          }
          
          return value >= minValue && value <= maxValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [minValue, maxValue] = args.constraints;
          return `${args.property} 必须是 ${minValue} 到 ${maxValue} 秒之间的正整数`;
        },
      },
    });
  };
}

/**
 * 验证Alert阈值
 * 确保阈值为有效数值（支持整数和浮点数）
 * 
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsAlertThreshold({ message: '阈值必须是有效的数值' })
 *   threshold: number;
 * }
 * ```
 */
export function IsAlertThreshold(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAlertThreshold',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') {
            return false;
          }
          
          // 检查是否为有效数字（不是NaN或Infinity）
          return Number.isFinite(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} 必须是有效的数值（不能是NaN或Infinity）`;
        },
      },
    });
  };
}

/**
 * 验证Alert规则名称
 * 确保规则名称符合命名规范：不为空，长度合适，字符合法
 * 
 * @param maxLength - 最大长度，默认100
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsAlertRuleName(50, { message: '告警规则名称不符合规范' })
 *   name: string;
 * }
 * ```
 */
export function IsAlertRuleName(maxLength: number = 100, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAlertRuleName',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxLength],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [maxLen] = args.constraints;
          
          if (typeof value !== 'string') {
            return false;
          }
          
          // 检查长度
          if (value.length === 0 || value.length > maxLen) {
            return false;
          }
          
          // 检查字符：允许中文、英文、数字、下划线、短横线、空格
          const namePattern = /^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/;
          if (!namePattern.test(value)) {
            return false;
          }
          
          // 不能只有空格
          if (value.trim().length === 0) {
            return false;
          }
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxLen] = args.constraints;
          return `${args.property} 必须是1-${maxLen}位的有效告警规则名称（支持中英文、数字、下划线、短横线）`;
        },
      },
    });
  };
}

/**
 * 验证Alert指标名称
 * 确保指标名称符合监控系统的命名规范
 * 
 * @param validationOptions - class-validator选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class AlertRuleDto {
 *   @IsAlertMetricName({ message: '指标名称格式不正确' })
 *   metric: string;
 * }
 * ```
 */
export function IsAlertMetricName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAlertMetricName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }
          
          // 指标名称规范：字母开头，可包含字母、数字、下划线、点号
          // 例如：cpu_usage, memory.used_percent, disk_io.read_bytes
          const metricPattern = /^[a-zA-Z][a-zA-Z0-9_\.]*$/;
          
          return metricPattern.test(value) && value.length >= 1 && value.length <= 100;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} 必须是有效的监控指标名称（字母开头，可包含字母、数字、下划线、点号，长度1-100位）`;
        },
      },
    });
  };
}