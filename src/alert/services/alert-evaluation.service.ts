/**
 * Alert评估服务
 * 🎯 专门负责规则评估和指标处理
 * 
 * @description 单一职责：评估逻辑，不涉及规则管理和告警生命周期
 * @author Claude Code Assistant  
 * @date 2025-09-10
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { createLogger } from "@common/logging/index";
import { IAlertRule, IMetricData, IRuleEvaluationResult } from '../interfaces';
import { AlertRuleService } from './alert-rule.service';
import { AlertCacheService } from './alert-cache.service';
import { AlertLifecycleService } from './alert-lifecycle.service';
import { RuleEvaluator } from '../evaluators/rule.evaluator';

@Injectable()
export class AlertEvaluationService implements OnModuleInit {
  private readonly logger = createLogger('AlertEvaluationService');

  constructor(
    private readonly alertRuleService: AlertRuleService,
    private readonly alertCacheService: AlertCacheService,
    private readonly alertLifecycleService: AlertLifecycleService,
    private readonly ruleEvaluator: RuleEvaluator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('告警评估服务初始化完成');
  }

  /**
   * 处理指标数据并评估规则
   */
  async processMetrics(metricData: IMetricData[]): Promise<void> {
    if (metricData.length === 0) {
      this.logger.debug('无指标数据需要处理');
      return;
    }

    const operation = 'PROCESS_METRICS';
    this.logger.debug('开始处理指标数据', {
      operation,
      metricCount: metricData.length,
    });

    try {
      const enabledRules = await this.alertRuleService.getEnabledRules();
      
      if (enabledRules.length === 0) {
        this.logger.debug('没有启用的规则需要评估', { operation });
        return;
      }

      const evaluationResults = this.ruleEvaluator.evaluateRules(enabledRules, metricData);

      // 并行处理评估结果
      await Promise.all(
        evaluationResults.map(result => this.handleEvaluationResult(result, enabledRules))
      );

      this.logger.debug('指标数据处理完成', {
        operation,
        metricCount: metricData.length,
        ruleCount: enabledRules.length,
        triggeredCount: evaluationResults.filter(r => r.triggered).length,
      });

    } catch (error) {
      this.logger.error('指标数据处理失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 评估单个规则
   */
  async evaluateRule(ruleId: string, metricData: IMetricData[]): Promise<IRuleEvaluationResult> {
    const operation = 'EVALUATE_SINGLE_RULE';
    
    this.logger.debug('评估单个规则', {
      operation,
      ruleId,
      metricCount: metricData.length,
    });

    try {
      const rule = await this.alertRuleService.getRuleById(ruleId);
      
      if (!rule.enabled) {
        this.logger.debug('规则已禁用，跳过评估', { operation, ruleId });
        return this.createSkippedResult(rule, '规则已禁用');
      }

      const result = this.ruleEvaluator.evaluateRule(rule, metricData);

      this.logger.debug('单个规则评估完成', {
        operation,
        ruleId,
        triggered: result.triggered,
      });

      return result;
    } catch (error) {
      this.logger.error('单个规则评估失败', {
        operation,
        ruleId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 批量评估指定规则
   */
  async evaluateRules(ruleIds: string[], metricData: IMetricData[]): Promise<IRuleEvaluationResult[]> {
    const operation = 'EVALUATE_BATCH_RULES';
    
    this.logger.debug('批量评估规则', {
      operation,
      ruleCount: ruleIds.length,
      metricCount: metricData.length,
    });

    try {
      const rules = await Promise.all(
        ruleIds.map(ruleId => this.alertRuleService.getRuleById(ruleId))
      );

      const enabledRules = rules.filter(rule => rule.enabled);
      
      if (enabledRules.length === 0) {
        this.logger.debug('没有启用的规则需要评估', { operation });
        return ruleIds.map(ruleId => this.createSkippedResult({ id: ruleId } as IAlertRule, '规则已禁用'));
      }

      const results = this.ruleEvaluator.evaluateRules(enabledRules, metricData);

      this.logger.debug('批量规则评估完成', {
        operation,
        totalRules: ruleIds.length,
        enabledRules: enabledRules.length,
        triggeredCount: results.filter(r => r.triggered).length,
      });

      return results;
    } catch (error) {
      this.logger.error('批量规则评估失败', {
        operation,
        ruleIds,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 监听系统事件进行评估
   */
  @OnEvent('performance.**')
  @OnEvent('security.**')
  @OnEvent('auth.**')
  @OnEvent('provider.**')
  @OnEvent('system.**')
  async handleSystemEvent(event: any): Promise<void> {
    const operation = 'HANDLE_SYSTEM_EVENT';
    
    this.logger.debug('处理系统事件', {
      operation,
      eventType: event.type,
    });

    try {
      const metricData = this.convertEventToMetric(event);
      
      if (metricData) {
        await this.processMetrics([metricData]);
        
        this.logger.debug('系统事件处理完成', {
          operation,
          eventType: event.type,
        });
      }
    } catch (error) {
      this.logger.error('系统事件处理失败', {
        operation,
        error: error.message,
        eventType: event?.type,
      });
      // 不重新抛出错误，避免影响事件总线
    }
  }

  /**
   * 定时评估规则 - 每分钟执行
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleRuleEvaluation(): Promise<void> {
    const operation = 'SCHEDULED_EVALUATION';
    
    this.logger.debug('开始定时规则评估', { operation });

    try {
      // 在实际实现中，这里应该从监控数据源获取最新指标
      const recentMetrics: IMetricData[] = await this.fetchRecentMetrics();
      
      await this.processMetrics(recentMetrics);
      
      this.logger.debug('定时规则评估完成', {
        operation,
        metricCount: recentMetrics.length,
      });
      
    } catch (error) {
      this.logger.error('定时规则评估失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      // 不重新抛出错误，避免影响后续定时任务
    }
  }

  /**
   * 强制评估所有启用的规则
   */
  async forceEvaluateAllRules(): Promise<{
    evaluatedCount: number;
    triggeredCount: number;
    errors: string[];
  }> {
    const operation = 'FORCE_EVALUATE_ALL';
    
    this.logger.log('强制评估所有规则', { operation });

    try {
      const enabledRules = await this.alertRuleService.getEnabledRules();
      const recentMetrics = await this.fetchRecentMetrics();
      
      const results = this.ruleEvaluator.evaluateRules(enabledRules, recentMetrics);
      
      // 并行处理结果，收集错误
      const errors: string[] = [];
      await Promise.allSettled(
        results.map(async (result) => {
          try {
            await this.handleEvaluationResult(result, enabledRules);
          } catch (error) {
            errors.push(`规则 ${result.ruleId}: ${error.message}`);
          }
        })
      );

      const summary = {
        evaluatedCount: results.length,
        triggeredCount: results.filter(r => r.triggered).length,
        errors,
      };

      this.logger.log('强制评估完成', {
        operation,
        ...summary,
      });

      return summary;
    } catch (error) {
      this.logger.error('强制评估失败', {
        operation,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 处理评估结果
   */
  private async handleEvaluationResult(
    result: IRuleEvaluationResult,
    rules: IAlertRule[]
  ): Promise<void> {
    const rule = rules.find(r => r.id === result.ruleId);
    if (!rule) return;

    try {
      const activeAlert = await this.alertCacheService.getActiveAlert(result.ruleId);
      const isInCooldown = await this.alertCacheService.isInCooldown(result.ruleId);

      if (result.triggered) {
        // 规则触发但告警不存在且不在冷却期，创建新告警
        if (!activeAlert && !isInCooldown) {
          await this.alertLifecycleService.createAlert(result, rule);
          await this.alertCacheService.setCooldown(result.ruleId, rule.cooldown);
        }
      } else if (activeAlert) {
        // 规则恢复且有活跃告警，解决告警
        await this.alertLifecycleService.resolveAlert(activeAlert.id, 'system', rule.id);
      }
    } catch (error) {
      this.logger.error('处理评估结果失败', {
        ruleId: result.ruleId,
        triggered: result.triggered,
        error: error.message,
      });
      // 继续处理其他结果，不中断整个流程
    }
  }

  /**
   * 创建跳过评估的结果
   */
  private createSkippedResult(rule: IAlertRule, reason: string): IRuleEvaluationResult {
    return {
      ruleId: rule.id,
      triggered: false,
      value: 0,
      threshold: 0,
      message: reason,
      evaluatedAt: new Date(),
    };
  }

  /**
   * 将系统事件转换为指标数据
   */
  private convertEventToMetric(event: any): IMetricData | null {
    // TODO: 实际实现中应根据事件类型转换为相应的指标
    // 这里返回null表示暂不处理
    return null;
  }

  /**
   * 获取最近的指标数据
   */
  private async fetchRecentMetrics(): Promise<IMetricData[]> {
    // TODO: 实际实现中应从监控数据源获取指标
    // 这里返回空数组
    return [];
  }

  /**
   * 获取评估服务统计
   */
  getEvaluationStats(): {
    lastEvaluationTime: Date | null;
    totalEvaluations: number;
    successfulEvaluations: number;
    failedEvaluations: number;
  } {
    // TODO: 实现评估统计追踪
    return {
      lastEvaluationTime: null,
      totalEvaluations: 0,
      successfulEvaluations: 0,
      failedEvaluations: 0,
    };
  }
}