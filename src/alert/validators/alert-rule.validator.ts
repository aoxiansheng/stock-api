/**
 * Alert规则验证器
 * 🎯 专门负责告警规则的验证逻辑
 *
 * @description 专业化的规则验证器，确保告警规则配置的正确性和安全性
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ConfigType } from "@nestjs/config";
import cacheUnifiedConfig from "../../cache/config/cache-unified.config";

import { createLogger } from "@common/logging/index";
import { DatabaseValidationUtils } from "@common/utils/database.utils";
import { BUSINESS_ERROR_MESSAGES } from "@common/constants/semantic/error-messages.constants";
import { IAlertRule } from "../interfaces";
import { VALID_OPERATORS, type Operator, AlertRuleUtil } from "../constants";

@Injectable()
export class AlertRuleValidator {
  private readonly logger = createLogger("AlertRuleValidator");

  constructor(
    private readonly configService: ConfigService,
    @Inject('cacheUnified') private readonly cacheConfig: ConfigType<typeof cacheUnifiedConfig>,
  ) {}

  /**
   * 通用ObjectId验证辅助方法
   * 减少重复的try-catch代码
   */
  private validateObjectId(id: string, errors: string[], fieldName: string): boolean {
    try {
      DatabaseValidationUtils.validateObjectId(id, fieldName);
      return true;
    } catch (error) {
      errors.push(error.message);
      return false;
    }
  }

  /**
   * 获取有效的严重程度列表
   * 集中管理严重程度常量，避免重复定义
   */
  private getValidSeverities(): string[] {
    return ["info", "warning", "critical"];
  }

  /**
   * 验证严重程度是否有效
   */
  private isValidSeverity(severity: string): boolean {
    return this.getValidSeverities().includes(severity);
  }

  /**
   * 验证规则配置
   */
  validateRule(rule: IAlertRule): { valid: boolean; errors: string[] } {
    const operation = "VALIDATE_RULE";
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.debug("开始验证规则配置", {
      operation,
      ruleId: rule.id,
      ruleName: rule.name,
    });

    // ID格式验证 - 使用通用组件库的DatabaseValidationUtils
    if (rule.id && !this.validateObjectId(rule.id, errors, "告警规则ID")) {
      // 验证失败，错误已添加到errors数组
    }

    // ✅ 基础验证 - 利用 AlertRuleUtil 中的通用逻辑
    const baseValidations = [
      {
        check: AlertRuleUtil.isValidRuleName(rule.name),
        message: `无效的规则名称格式: ${rule.name || "(空)"}`,
      },
      {
        check: AlertRuleUtil.isValidMetricName(rule.metric),
        message: `无效的监控指标名称格式: ${rule.metric || "(空)"}`,
      },
      {
        check: VALID_OPERATORS.includes(rule.operator as Operator),
        message: `无效的比较操作符: ${rule.operator}`,
      },
      {
        check: AlertRuleUtil.isValidThreshold(rule.threshold),
        message: `无效的阈值: ${rule.threshold}，必须是有效数字`,
      },
    ];

    baseValidations.forEach(({ check, message }) => {
      if (!check) errors.push(message);
    });

    // 验证持续时间和冷却时间
    const alertConfig = this.configService.get("alert");
    if (alertConfig && alertConfig.validation) {
      const { duration, cooldown } = alertConfig.validation;

      if (
        rule.duration === undefined ||
        rule.duration < duration.min ||
        rule.duration > duration.max
      ) {
        errors.push(
          AlertRuleUtil.formatAlertMessage(
            "无效的持续时间: {value}，必须在{min}-{max}秒之间",
            { value: rule.duration, min: duration.min, max: duration.max },
          ),
        );
      }

      if (
        rule.cooldown === undefined ||
        rule.cooldown < cooldown.min ||
        rule.cooldown > cooldown.max
      ) {
        errors.push(
          AlertRuleUtil.formatAlertMessage(
            "无效的冷却时间: {value}，必须在{min}-{max}秒之间",
            { value: rule.cooldown, min: cooldown.min, max: cooldown.max },
          ),
        );
      }
    }

    // 验证通知渠道
    if (!rule.channels || rule.channels.length === 0) {
      errors.push(`${BUSINESS_ERROR_MESSAGES.REQUIRED_FIELD_MISSING}: 通知渠道`);
    } else {
      // 验证每个渠道的配置
      rule.channels.forEach((channel, index) => {
        if (!channel.type) {
          errors.push(`无效的通知渠道配置 ${index + 1}: 必须指定渠道类型`);
        }
        if (channel.enabled !== false && !channel.config) {
          warnings.push(`通知渠道 ${index + 1}: 启用的渠道建议配置详细信息`);
        }
      });
    }

    // 业务逻辑警告检查
    if (rule.cooldown && rule.cooldown > 90 * 86400) {
      warnings.push(
        `冷却时间超过${(90 * 86400) / 3600}小时，可能会延迟重要告警`,
      );
    }

    if (rule.threshold === 0 && ["eq", "ne"].includes(rule.operator)) {
      warnings.push("使用0作为阈值时请确认业务逻辑正确");
    }

    // 验证严重程度 - 使用常量避免重复定义
    if (!this.isValidSeverity(rule.severity)) {
      errors.push(
        `无效的严重程度: ${rule.severity}，必须是: ${this.getValidSeverities().join(", ")}`,
      );
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings, // 可选：返回警告信息
    };

    this.logger.debug("规则验证完成", {
      operation,
      ruleId: rule.id,
      valid: result.valid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    });

    return result;
  }

  // ✅ 简化方法 - 直接使用 AlertRuleUtil 和常量
  // 避免重复的验证方法，DTOs 中已有完整的 class-validator 装饰器

  /**
   * 批量验证规则
   */
  validateRules(rules: IAlertRule[]): Array<{
    ruleId: string;
    valid: boolean;
    errors: string[];
  }> {
    const operation = "BATCH_VALIDATE_RULES";

    this.logger.debug("开始批量验证规则", {
      operation,
      ruleCount: rules.length,
    });

    const results = rules.map((rule) => {
      const validation = this.validateRule(rule);
      return {
        ruleId: rule.id,
        valid: validation.valid,
        errors: validation.errors,
      };
    });

    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.length - validCount;

    this.logger.debug("批量验证规则完成", {
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
    const alertConfig = this.configService.get("alert");

    return {
      operator: ">",
      duration:
        alertConfig?.validation?.duration?.min ||
        this.cacheConfig.defaultTtl,
      cooldown:
        alertConfig?.validation?.cooldown?.min ||
        this.cacheConfig.defaultTtl,
      severity: "warning",
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
      validSeverities: this.getValidSeverities(), // 使用统一常量
      defaultDuration:
        defaultConfig.duration ||
        this.cacheConfig.defaultTtl,
      defaultCooldown:
        defaultConfig.cooldown ||
        this.cacheConfig.defaultTtl,
    };
  }
}
