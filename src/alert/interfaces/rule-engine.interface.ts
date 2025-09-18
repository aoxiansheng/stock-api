import { IAlertRule } from "./alert.interface";
import type { Operator } from "../constants";

/**
 * 指标数据接口
 */
export interface IMetricData {
  metric: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * 规则评估结果接口
 */
export interface IRuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  value: number;
  threshold: number;
  message: string;
  evaluatedAt: Date;
  context?: Record<string, any>;
}

/**
 * 规则引擎接口
 */
export interface IRuleEngine {
  /**
   * 评估单个规则
   */
  evaluateRule(
    rule: IAlertRule,
    metricData: IMetricData[],
  ): IRuleEvaluationResult;

  /**
   * 批量评估规则
   */
  evaluateRules(
    rules: IAlertRule[],
    metricData: IMetricData[],
  ): IRuleEvaluationResult[];

  /**
   * 检查规则是否在冷却期
   */
  isInCooldown(ruleId: string): Promise<boolean>;

  /**
   * 设置规则冷却
   */
  setCooldown(ruleId: string, cooldownSeconds: number): Promise<void>;

  /**
   * 验证规则配置
   */
  validateRule(rule: IAlertRule): { valid: boolean; errors: string[] };
}
