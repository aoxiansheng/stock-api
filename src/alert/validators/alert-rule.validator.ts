/**
 * Alert规则验证器
 * 🎯 专门负责告警规则的验证逻辑
 * 
 * @description 从RuleEngineService中提取的验证功能
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createLogger } from '@app/config/logger.config';
import { IAlertRule } from '../interfaces';
import {
  VALID_OPERATORS,
  type Operator,
  AlertRuleUtil,
} from '../constants';

@Injectable()
export class AlertRuleValidator {
  private readonly logger = createLogger('AlertRuleValidator');

  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * 验证规则配置
   */
  validateRule(rule: IAlertRule): { valid: boolean; errors: string[] } {
    const operation = 'VALIDATE_RULE';
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.debug('开始验证规则配置', {
      operation,
      ruleId: rule.id,
      ruleName: rule.name,
    });

    // 验证规则名称
    if (!AlertRuleUtil.isValidRuleName(rule.name)) {
      errors.push('规则名称格式无效或为空');
    }

    // 验证指标名称
    if (!AlertRuleUtil.isValidMetricName(rule.metric)) {
      errors.push('监控指标名称格式无效或为空');
    }

    // 验证操作符
    if (!VALID_OPERATORS.includes(rule.operator as Operator)) {
      errors.push(`无效的比较操作符: ${rule.operator}`);
    }

    // 验证阈值
    if (!AlertRuleUtil.isValidThreshold(rule.threshold)) {
      errors.push('阈值必须是有效数字');
    }

    // 验证持续时间和冷却时间
    const alertConfig = this.configService.get('alert');
    if (alertConfig && alertConfig.validation) {
      const { duration, cooldown } = alertConfig.validation;

      if (
        rule.duration === undefined ||
        rule.duration < duration.min ||
        rule.duration > duration.max
      ) {
        errors.push(
          AlertRuleUtil.formatAlertMessage(
            '持续时间必须在{min}-{max}秒之间',
            { min: duration.min, max: duration.max }
          )
        );
      }

      if (
        rule.cooldown === undefined ||
        rule.cooldown < cooldown.min ||
        rule.cooldown > cooldown.max
      ) {
        errors.push(
          AlertRuleUtil.formatAlertMessage(
            '冷却时间必须在{min}-{max}秒之间',
            { min: cooldown.min, max: cooldown.max }
          )
        );
      }
    }

    // 验证通知渠道
    if (!rule.channels || rule.channels.length === 0) {
      errors.push('至少需要配置一个通知渠道');
    } else {
      // 验证每个渠道的配置
      rule.channels.forEach((channel, index) => {
        if (!channel.type) {
          errors.push(`通知渠道 ${index + 1}: 必须指定渠道类型`);
        }
        if (channel.enabled !== false && !channel.config) {
          warnings.push(`通知渠道 ${index + 1}: 启用的渠道建议配置详细信息`);
        }
      });
    }

    // 业务逻辑警告检查
    if (rule.cooldown && rule.cooldown > 90 * 86400) {
      warnings.push(
        `冷却时间超过${90 * 86400 / 3600}小时，可能会延迟重要告警`
      );
    }

    if (rule.threshold === 0 && ['eq', 'ne'].includes(rule.operator)) {
      warnings.push('使用0作为阈值时请确认业务逻辑正确');
    }

    // 验证严重程度
    const validSeverities = ['info', 'warning', 'critical'];
    if (!validSeverities.includes(rule.severity)) {
      errors.push(`无效的严重程度: ${rule.severity}，必须是: ${validSeverities.join(', ')}`);
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings, // 可选：返回警告信息
    };

    this.logger.debug('规则验证完成', {
      operation,
      ruleId: rule.id,
      valid: result.valid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    });

    return result;
  }

  /**
   * 验证规则名称格式
   */
  validateRuleName(name: string): boolean {
    return AlertRuleUtil.isValidRuleName(name);
  }

  /**
   * 验证指标名称格式
   */
  validateMetricName(metric: string): boolean {
    return AlertRuleUtil.isValidMetricName(metric);
  }

  /**
   * 验证阈值
   */
  validateThreshold(threshold: number): boolean {
    return AlertRuleUtil.isValidThreshold(threshold);
  }

  /**
   * 验证操作符
   */
  validateOperator(operator: string): boolean {
    return VALID_OPERATORS.includes(operator as Operator);
  }

  /**
   * 批量验证规则
   */
  validateRules(rules: IAlertRule[]): Array<{
    ruleId: string;
    valid: boolean;
    errors: string[];
  }> {
    const operation = 'BATCH_VALIDATE_RULES';
    
    this.logger.debug('开始批量验证规则', {
      operation,
      ruleCount: rules.length,
    });

    const results = rules.map(rule => {
      const validation = this.validateRule(rule);
      return {
        ruleId: rule.id,
        valid: validation.valid,
        errors: validation.errors,
      };
    });

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;

    this.logger.debug('批量验证规则完成', {
      operation,
      totalRules: rules.length,
      validRules: validCount,
      invalidRules: invalidCount,
    });

    return results;
  }

  /**
   * 获取所有支持的操作符
   */
  getSupportedOperators(): string[] {
    return [...VALID_OPERATORS];
  }

  /**
   * 获取默认规则配置
   */
  getDefaultRuleConfig(): Partial<IAlertRule> {
    const alertConfig = this.configService.get('alert');
    
    return {
      operator: '>',
      duration: alertConfig?.validation?.duration?.min || 300,
      cooldown: alertConfig?.validation?.cooldown?.min || 300,
      severity: 'warning',
      enabled: true,
      tags: {},
    };
  }

  /**
   * 获取验证器统计信息
   */
  getValidatorStats(): {
    supportedOperators: string[];
    validSeverities: string[];
    defaultDuration: number;
    defaultCooldown: number;
  } {
    const defaultConfig = this.getDefaultRuleConfig();
    
    return {
      supportedOperators: this.getSupportedOperators(),
      validSeverities: ['info', 'warning', 'critical'],
      defaultDuration: defaultConfig.duration || 300,
      defaultCooldown: defaultConfig.cooldown || 300,
    };
  }
}