import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import { CacheService } from "../../cache/services/cache.service";
import {
  VALID_OPERATORS,
  OPERATOR_SYMBOLS,
  Operator,
} from "../constants/alert.constants";
import {
  ALERTING_OPERATIONS,
  ALERTING_MESSAGES,
  ALERTING_TIME_CONFIG,
  ALERTING_CACHE_PATTERNS,
  ALERTING_METRICS,
  AlertingTemplateUtil,
} from "../constants/alerting.constants";
import {
  IAlertRule,
  IRuleEngine,
  IRuleEvaluationResult,
  IMetricData,
} from "../interfaces";

// 🎯 复用 common 模块的日志配置

// 🎯 内部 DTO 类型（用于增强功能，保持接口兼容性）

@Injectable()
export class RuleEngineService implements IRuleEngine {
  private readonly logger = createLogger(RuleEngineService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 评估单个规则
   */
  evaluateRule(
    rule: IAlertRule,
    metricData: IMetricData[],
  ): IRuleEvaluationResult {
    const operation = ALERTING_OPERATIONS.EVALUATE_RULES_SCHEDULED;

    try {
      // 过滤相关的指标数据，并确保数据点有效
      const relevantData = metricData.filter(
        (data) =>
          data &&
          data.metric === rule.metric &&
          data.timestamp &&
          data.value != null,
      );

      if (relevantData.length === 0) {
        const message = AlertingTemplateUtil.formatAlertMessage(
          "没有找到指标 {metric} 的数据",
          { metric: rule.metric },
        );

        return {
          ruleId: rule.id,
          triggered: false,
          value: 0,
          threshold: rule.threshold,
          message,
          evaluatedAt: new Date(),
        };
      }

      // 获取最新的指标值
      const latestData = relevantData.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )[0];

      // 评估规则条件
      const triggered = this.evaluateCondition(
        latestData.value,
        rule.operator as Operator,
        rule.threshold,
      );

      const message = triggered
        ? AlertingTemplateUtil.formatAlertMessage(
            "告警触发: {metric} {operator} {threshold}, 当前值: {value}",
            {
              metric: rule.metric,
              operator: this.getOperatorSymbol(rule.operator as Operator),
              threshold: rule.threshold,
              value: latestData.value,
            },
          )
        : AlertingTemplateUtil.formatAlertMessage("正常: {metric} = {value}", {
            metric: rule.metric,
            value: latestData.value,
          });

      return {
        ruleId: rule.id,
        triggered,
        value: latestData.value,
        threshold: rule.threshold,
        message,
        evaluatedAt: new Date(),
        context: {
          metric: rule.metric,
          operator: rule.operator,
          tags: latestData.tags,
        },
      };
    } catch (error) {
      this.logger.error(
        ALERTING_MESSAGES.RULE_EVALUATION_FAILED,
        sanitizeLogData({
          operation,
          ruleId: rule.id,
          metric: rule.metric,
          error: error.message,
          stack: error.stack,
        }),
      );
      // 🎯 重新抛出错误，让调用者知道评估失败
      throw error;
    }
  }

  /**
   * 批量评估规则
   */
  evaluateRules(
    rules: IAlertRule[],
    metricData: IMetricData[],
  ): IRuleEvaluationResult[] {
    const operation = ALERTING_OPERATIONS.EVALUATE_RULES_SCHEDULED;
    const startTime = Date.now();

    this.logger.debug(
      ALERTING_MESSAGES.RULE_EVALUATION_STARTED,
      sanitizeLogData({
        operation,
        rulesCount: rules.length,
        enabledRulesCount: rules.filter((rule) => rule.enabled).length,
        metricDataCount: metricData.length,
      }),
    );

    try {
      const results = rules
        .filter((rule) => rule.enabled)
        .map((rule) => {
          try {
            return this.evaluateRule(rule, metricData);
          } catch (error) {
            this.logger.error(
              ALERTING_MESSAGES.RULE_EVALUATION_FAILED,
              sanitizeLogData({
                operation,
                ruleId: rule.id,
                ruleName: rule.name,
                error: error.message,
              }),
            );
            // 🎯 返回错误的评估结果，而不是停止整个批量处理
            return {
              ruleId: rule.id,
              triggered: false,
              value: 0,
              threshold: rule.threshold,
              message: AlertingTemplateUtil.formatAlertMessage(
                "规则评估失败: {error}",
                { error: error.message },
              ),
              evaluatedAt: new Date(),
              context: {
                metric: rule.metric,
                operator: rule.operator,
                tags: {},
              },
            } as IRuleEvaluationResult;
          }
        });

      const executionTime = Date.now() - startTime;
      const triggeredCount = results.filter((r) => r.triggered).length;

      // 🎯 记录性能指标
      this.logger.debug(
        ALERTING_MESSAGES.METRICS_PROCESSED,
        sanitizeLogData({
          operation,
          rulesProcessed: results.length,
          triggeredCount,
          executionTime,
          [ALERTING_METRICS.RULE_EVALUATION_COUNT]: results.length,
          [ALERTING_METRICS.AVERAGE_RULE_EVALUATION_TIME]:
            results.length > 0 ? executionTime / results.length : 0,
        }),
      );

      return results;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        ALERTING_MESSAGES.RULE_EVALUATION_FAILED,
        sanitizeLogData({
          operation,
          rulesCount: rules.length,
          error: error.message,
          executionTime,
        }),
      );
      throw error;
    }
  }

  /**
   * 检查规则是否在冷却期
   */
  async isInCooldown(ruleId: string): Promise<boolean> {
    const operation = ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION;

    try {
      const cacheKey = this.getCooldownCacheKey(ruleId);
      const inCooldown = await this.cacheService.get<boolean>(cacheKey);

      this.logger.debug(
        "检查规则冷却状态",
        sanitizeLogData({
          operation,
          ruleId,
          inCooldown: !!inCooldown,
          cacheKey,
        }),
      );

      return !!inCooldown;
    } catch (error) {
      this.logger.error(
        "检查冷却状态失败",
        sanitizeLogData({
          operation,
          ruleId,
          error: error.message,
        }),
      );
      // 🎯 重新抛出错误，让调用者知道评估失败
      throw error;
    }
  }

  /**
   * 设置规则冷却
   */
  async setCooldown(ruleId: string, cooldownSeconds: number): Promise<void> {
    const operation = ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION;

    if (cooldownSeconds <= 0) {
      this.logger.debug(
        "跳过设置冷却，时间不合法",
        sanitizeLogData({
          operation,
          ruleId,
          cooldownSeconds,
        }),
      );
      return;
    }

    try {
      const cacheKey = this.getCooldownCacheKey(ruleId);
      await this.cacheService.set(cacheKey, true, { ttl: cooldownSeconds });

      this.logger.log(
        "规则已进入冷却期",
        sanitizeLogData({
          operation,
          ruleId,
          cooldownSeconds,
          cacheKey,
        }),
      );
    } catch (error) {
      this.logger.error(
        "设置冷却失败",
        sanitizeLogData({
          operation,
          ruleId,
          cooldownSeconds,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 验证规则配置
   */
  validateRule(rule: IAlertRule): { valid: boolean; errors: string[] } {
    const operation = ALERTING_OPERATIONS.CREATE_RULE;
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.debug(
      "开始验证规则配置",
      sanitizeLogData({
        operation,
        ruleId: rule.id,
        ruleName: rule.name,
      }),
    );

    // 🎯 使用 common 模块的验证工具
    if (!AlertingTemplateUtil.isValidRuleName(rule.name)) {
      errors.push(
        AlertingTemplateUtil.generateErrorMessage("RULE_VALIDATION_FAILED", {
          errors: "规则名称格式无效或为空",
        }),
      );
    }

    if (!AlertingTemplateUtil.isValidMetricName(rule.metric)) {
      errors.push(
        AlertingTemplateUtil.generateErrorMessage("RULE_VALIDATION_FAILED", {
          errors: "监控指标名称格式无效或为空",
        }),
      );
    }

    if (!VALID_OPERATORS.includes(rule.operator as Operator)) {
      errors.push(
        AlertingTemplateUtil.generateErrorMessage("RULE_VALIDATION_FAILED", {
          errors: `无效的比较操作符: ${rule.operator}`,
        }),
      );
    }

    if (!AlertingTemplateUtil.isValidThreshold(rule.threshold)) {
      errors.push(
        AlertingTemplateUtil.generateErrorMessage("RULE_VALIDATION_FAILED", {
          errors: "阈值必须是有效数字",
        }),
      );
    }

    const alertConfig = this.configService.get("alert");
    const { duration, cooldown } = alertConfig.validation;

    if (
      rule.duration === undefined ||
      rule.duration < duration.min ||
      rule.duration > duration.max
    ) {
      errors.push(
        AlertingTemplateUtil.formatAlertMessage(
          "持续时间必须在{min}-{max}秒之间",
          { min: duration.min, max: duration.max },
        ),
      );
    }

    if (
      rule.cooldown === undefined ||
      rule.cooldown < cooldown.min ||
      rule.cooldown > cooldown.max
    ) {
      errors.push(
        AlertingTemplateUtil.formatAlertMessage(
          "冷却时间必须在{min}-{max}秒之间",
          { min: cooldown.min, max: cooldown.max },
        ),
      );
    }

    // 所有环境都需要检查通知渠道，确保规则验证一致性
    if (!rule.channels || rule.channels.length === 0) {
      errors.push("至少需要配置一个通知渠道");
    }

    // 🎯 使用标准化的时间常量进行警告检查
    if (
      rule.cooldown &&
      rule.cooldown > ALERTING_TIME_CONFIG.ALERT_TTL_SECONDS
    ) {
      warnings.push(
        AlertingTemplateUtil.formatAlertMessage(
          "冷却时间超过{hours}小时，可能会延迟重要告警",
          { hours: ALERTING_TIME_CONFIG.ALERT_TTL_SECONDS / 3600 },
        ),
      );
    }

    if (rule.threshold === 0 && ["eq", "ne"].includes(rule.operator)) {
      warnings.push("使用0作为阈值时请确认业务逻辑正确");
    }

    const result = {
      valid: errors.length === 0,
      errors,
    };

    this.logger.debug(
      "规则验证完成",
      sanitizeLogData({
        operation,
        ruleId: rule.id,
        valid: result.valid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
      }),
    );

    return result;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    value: number,
    operator: Operator,
    threshold: number,
  ): boolean {
    switch (operator) {
      case "gt":
        return value > threshold;
      case "gte":
        return value >= threshold;
      case "lt":
        return value < threshold;
      case "lte":
        return value <= threshold;
      case "eq":
        return value === threshold;
      case "ne":
        return value !== threshold;
      default:
        // 这行代码理论上不可达，因为有类型和 validateRule 的保护
        this.logger.warn(
          `遇到未知的操作符`,
          sanitizeLogData({
            operation: "evaluateCondition",
            value,
            operator,
            threshold,
          }),
        );
        return false;
    }
  }

  /**
   * 获取操作符符号
   */
  private getOperatorSymbol(operator: Operator): string {
    return OPERATOR_SYMBOLS[operator] || operator;
  }

  /**
   * 为规则生成缓存键
   * 🎯 使用 common 模块的标准化缓存模式
   */
  private getCooldownCacheKey(ruleId: string): string {
    return ALERTING_CACHE_PATTERNS.RULE_COOLDOWN.replace("{ruleId}", ruleId);
  }

  /**
   * 获取规则的冷却状态详情
   */
  async getCooldownStatus(
    ruleId: string,
  ): Promise<{ inCooldown: boolean; remainingSeconds?: number }> {
    const operation = ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION;

    try {
      const cacheKey = this.getCooldownCacheKey(ruleId);
      const inCooldown = await this.cacheService.get<boolean>(cacheKey);

      if (!inCooldown) {
        return { inCooldown: false };
      }

      // 🎯 如果有TTL信息，可以计算剩余时间（需要缓存服务支持）
      return { inCooldown: true };
    } catch (error) {
      this.logger.error(
        "获取冷却状态失败",
        sanitizeLogData({
          operation,
          ruleId,
          error: error.message,
        }),
      );
      return { inCooldown: false };
    }
  }

  /**
   * 批量检查规则冷却状态
   */
  async batchCheckCooldown(
    ruleIds: string[],
  ): Promise<Record<string, boolean>> {
    const operation = ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION;
    const results: Record<string, boolean> = {};
    let hasErrors = false;

    this.logger.debug(
      "批量检查冷却状态",
      sanitizeLogData({
        operation,
        ruleIdsCount: ruleIds.length,
      }),
    );

    const promises = ruleIds.map((ruleId) =>
      this.isInCooldown(ruleId).catch((error) => {
        hasErrors = true;
        // 记录单个错误详情但不中断批量操作
        this.logger.error(
          "批量冷却检查中的单个规则失败",
          sanitizeLogData({ operation, ruleId, error: error.message }),
        );
        return false; // 失败时默认为 false
      }),
    );

    const cooldownStates = await Promise.all(promises);

    ruleIds.forEach((ruleId, index) => {
      results[ruleId] = cooldownStates[index];
    });

    if (hasErrors) {
      this.logger.error(
        "批量冷却检查失败",
        sanitizeLogData({
          operation,
          ruleIdsCount: ruleIds.length,
          error: "一个或多个规则的冷却状态检查失败",
        }),
      );
    }

    this.logger.debug(
      "批量冷却检查完成",
      sanitizeLogData({
        operation,
        resultsCount: Object.keys(results).length,
        inCooldownCount: Object.values(results).filter(Boolean).length,
      }),
    );

    return results;
  }

  /**
   * 清除规则的冷却状态
   */
  async clearCooldown(ruleId: string): Promise<void> {
    const operation = ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION;

    try {
      const cacheKey = this.getCooldownCacheKey(ruleId);
      await this.cacheService.del(cacheKey);

      this.logger.log(
        "规则冷却状态已清除",
        sanitizeLogData({
          operation,
          ruleId,
          cacheKey,
        }),
      );
    } catch (error) {
      this.logger.error(
        "清除冷却状态失败",
        sanitizeLogData({
          operation,
          ruleId,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): {
    operatorCount: number;
    supportedOperators: string[];
    configuredCooldownPrefix: string;
  } {
    this.logger.debug(
      `获取服务统计信息`,
      sanitizeLogData({
        operation: "getServiceStats",
      }),
    );

    return {
      operatorCount: VALID_OPERATORS.length,
      supportedOperators: [...VALID_OPERATORS],
      configuredCooldownPrefix:
        this.configService.get("alert").cache.cooldownPrefix,
    };
  }
}
