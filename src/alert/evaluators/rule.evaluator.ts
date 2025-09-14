/**
 * 规则评估器
 * 🎯 专门负责规则评估的核心逻辑
 * 
 * @description 专业化的规则评估引擎
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable } from '@nestjs/common';

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { IAlertRule, IMetricData, IRuleEvaluationResult } from '../interfaces';
import {
  VALID_OPERATORS,
  type Operator,
  ALERT_OPERATIONS,
  ALERT_MESSAGES,
  ALERT_METRICS,
  OPERATOR_SYMBOLS,
  AlertRuleUtil,
} from '../constants';

@Injectable()
export class RuleEvaluator {
  private readonly logger = createLogger('RuleEvaluator');

  /**
   * 评估单个规则
   */
  evaluateRule(
    rule: IAlertRule,
    metricData: IMetricData[]
  ): IRuleEvaluationResult {
    const operation = ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED;

    try {
      // 过滤相关的指标数据
      const relevantData = metricData.filter(
        (data) =>
          data &&
          data.metric === rule.metric &&
          data.timestamp &&
          data.value != null
      );

      if (relevantData.length === 0) {
        const message = AlertRuleUtil.formatAlertMessage(
          '没有找到指标 {metric} 的数据',
          { metric: rule.metric }
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
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      )[0];

      // 评估规则条件
      const triggered = this.evaluateCondition(
        latestData.value,
        rule.operator as Operator,
        rule.threshold
      );

      const message = triggered
        ? AlertRuleUtil.formatAlertMessage(
            '告警触发: {metric} {operator} {threshold}, 当前值: {value}',
            {
              metric: rule.metric,
              operator: this.getOperatorSymbol(rule.operator as Operator),
              threshold: rule.threshold,
              value: latestData.value,
            }
          )
        : AlertRuleUtil.formatAlertMessage('正常: {metric} = {value}', {
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
        ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED,
        sanitizeLogData({
          operation,
          ruleId: rule.id,
          metric: rule.metric,
          error: error.message,
          stack: error.stack,
        })
      );
      throw error;
    }
  }

  /**
   * 批量评估规则
   */
  evaluateRules(
    rules: IAlertRule[],
    metricData: IMetricData[]
  ): IRuleEvaluationResult[] {
    const operation = ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED;
    const executionStart = Date.now();

    this.logger.debug(
      ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED,
      sanitizeLogData({
        operation,
        rulesCount: rules.length,
        enabledRulesCount: rules.filter((rule) => rule.enabled).length,
        metricDataCount: metricData.length,
      })
    );

    try {
      const results = rules
        .filter((rule) => rule.enabled)
        .map((rule) => {
          try {
            return this.evaluateRule(rule, metricData);
          } catch (error) {
            this.logger.error(
              ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED,
              sanitizeLogData({
                operation,
                ruleId: rule.id,
                ruleName: rule.name,
                error: error.message,
              })
            );
            // 返回错误的评估结果，而不是停止整个批量处理
            return {
              ruleId: rule.id,
              triggered: false,
              value: 0,
              threshold: rule.threshold,
              message: AlertRuleUtil.formatAlertMessage(
                '规则评估失败: {error}',
                { error: error.message }
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

      const executionTime = Date.now() - executionStart;
      const triggeredCount = results.filter((r) => r.triggered).length;

      // 记录性能指标
      this.logger.debug(
        ALERT_MESSAGES.RULES.METRICS_PROCESSED,
        sanitizeLogData({
          operation,
          rulesProcessed: results.length,
          triggeredCount,
          executionTime,
          [ALERT_METRICS.RULES.RULE_EVALUATION_COUNT]: results.length,
          [ALERT_METRICS.RULES.AVERAGE_RULE_EVALUATION_TIME]:
            results.length > 0 ? executionTime / results.length : 0,
        })
      );

      return results;
    } catch (error) {
      const executionTime = Date.now() - executionStart;
      this.logger.error(
        ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED,
        sanitizeLogData({
          operation,
          rulesCount: rules.length,
          error: error.message,
          executionTime,
        })
      );
      throw error;
    }
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(
    value: number,
    operator: Operator,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        this.logger.warn(
          '遇到未知的操作符',
          sanitizeLogData({
            operation: 'evaluateCondition',
            value,
            operator,
            threshold,
          })
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
   * 评估规则的历史表现
   */
  evaluateRulePerformance(
    rule: IAlertRule,
    historicalResults: IRuleEvaluationResult[]
  ): {
    accuracy: number;
    triggerRate: number;
    averageResponseTime: number;
    falsePositiveRate: number;
  } {
    const operation = 'EVALUATE_RULE_PERFORMANCE';
    
    this.logger.debug('评估规则历史表现', {
      operation,
      ruleId: rule.id,
      resultsCount: historicalResults.length,
    });

    if (historicalResults.length === 0) {
      return {
        accuracy: 0,
        triggerRate: 0,
        averageResponseTime: 0,
        falsePositiveRate: 0,
      };
    }

    const triggeredResults = historicalResults.filter(r => r.triggered);
    const totalResults = historicalResults.length;
    
    const triggerRate = (triggeredResults.length / totalResults) * 100;
    
    // 计算平均响应时间（评估时间差）
    let totalResponseTime = 0;
    for (let i = 1; i < historicalResults.length; i++) {
      const timeDiff = historicalResults[i].evaluatedAt.getTime() - 
                      historicalResults[i - 1].evaluatedAt.getTime();
      totalResponseTime += timeDiff;
    }
    const averageResponseTime = totalResults > 1 ? totalResponseTime / (totalResults - 1) : 0;

    // TODO: 实现准确率和误报率计算（需要实际告警反馈数据）
    const accuracy = 85; // 默认值，需要实际计算
    const falsePositiveRate = 10; // 默认值，需要实际计算

    const performance = {
      accuracy,
      triggerRate: Math.round(triggerRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      falsePositiveRate,
    };

    this.logger.debug('规则历史表现评估完成', {
      operation,
      ruleId: rule.id,
      performance,
    });

    return performance;
  }

  /**
   * 模拟评估（用于测试规则配置）
   */
  simulateEvaluation(
    rule: IAlertRule,
    testMetrics: IMetricData[]
  ): {
    results: IRuleEvaluationResult[];
    summary: {
      totalEvaluations: number;
      triggeredCount: number;
      triggerRate: number;
      averageValue: number;
    };
  } {
    const operation = 'SIMULATE_EVALUATION';
    
    this.logger.debug('模拟规则评估', {
      operation,
      ruleId: rule.id,
      testMetricsCount: testMetrics.length,
    });

    const results = testMetrics.map(metric => 
      this.evaluateRule(rule, [metric])
    );

    const triggeredCount = results.filter(r => r.triggered).length;
    const totalValues = results.reduce((sum, r) => sum + r.value, 0);
    
    const summary = {
      totalEvaluations: results.length,
      triggeredCount,
      triggerRate: results.length > 0 ? (triggeredCount / results.length) * 100 : 0,
      averageValue: results.length > 0 ? totalValues / results.length : 0,
    };

    this.logger.debug('规则评估模拟完成', {
      operation,
      ruleId: rule.id,
      summary,
    });

    return { results, summary };
  }

  /**
   * 获取评估器统计信息
   */
  getEvaluatorStats(): {
    supportedOperators: string[];
    operatorSymbols: Record<string, string>;
    totalEvaluations: number;
    successfulEvaluations: number;
  } {
    return {
      supportedOperators: [...VALID_OPERATORS],
      operatorSymbols: { ...OPERATOR_SYMBOLS },
      totalEvaluations: 0, // TODO: 实现统计追踪
      successfulEvaluations: 0, // TODO: 实现统计追踪
    };
  }
}