import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { createLogger } from '@common/config/logger.config';


import { CacheService } from '../../cache/cache.service';
import {
  ALERTING_OPERATIONS,
  ALERTING_MESSAGES,
  ALERTING_DEFAULT_STATS,
  AlertingTemplateUtil,
} from '../constants/alerting.constants';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from '../dto';
import {
  IAlertRule,
  IAlert,
  IAlertStats,
} from '../interfaces';

// 🎯 引入仓储层和新配置
import {
  IMetricData,
  IRuleEvaluationResult,
} from '../interfaces';

// 🎯 引入统一的类型定义
import { AlertRuleRepository } from '../repositories/alert-rule.repository';
import { AlertStatus ,
  Alert,
  AlertRule,
  AlertStats,
  MetricData,
  RuleEvaluationResult,
} from '../types/alert.types';



// 🎯 复用 common 模块的日志配置
// 🎯 引入告警服务常量

import { AlertHistoryService } from './alert-history.service';
import { NotificationService } from './notification.service';
import { RuleEngineService } from './rule-engine.service';

@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = createLogger(AlertingService.name);
  private readonly config: {
    activeAlertPrefix: string;
    activeAlertTtlSeconds: number;
    cooldownPrefix: string;
  };

  constructor(
    // 🎯 使用仓储层
    private readonly alertRuleRepository: AlertRuleRepository,
    private readonly ruleEngine: RuleEngineService,
    private readonly notificationService: NotificationService,
    private readonly alertHistoryService: AlertHistoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.get('alert.cache');
  }

  async onModuleInit() {
    this.logger.log(ALERTING_MESSAGES.SERVICE_INITIALIZED);
    try {
      await this.loadActiveAlerts();
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.INITIALIZATION_FAILED, { error: error.stack });
      // 在初始化阶段失败，需要抛出异常以使应用启动失败
      throw error;
    }
  }

  /**
   * 创建告警规则
   */
  async createRule(createRuleDto: CreateAlertRuleDto): Promise<IAlertRule> {
    const operation = ALERTING_OPERATIONS.CREATE_RULE;

    this.logger.debug(ALERTING_MESSAGES.RULE_CREATION_STARTED, {
      operation,
      ruleName: createRuleDto.name,
    });

    const tempRule = { ...createRuleDto, id: 'temp' } as IAlertRule;
    const validation = this.ruleEngine.validateRule(tempRule);
    if (!validation.valid) {
      const errorMsg = AlertingTemplateUtil.generateErrorMessage('RULE_VALIDATION_FAILED', {
        errors: validation.errors.join(', ')
      });
      this.logger.warn(errorMsg, { operation, errors: validation.errors });
      throw new BadRequestException(errorMsg);
    }

    try {
      const savedRule = await this.alertRuleRepository.create({
        ...createRuleDto,
        id: AlertingTemplateUtil.generateRuleId(),
      });

      this.logger.log(ALERTING_MESSAGES.RULE_CREATED, {
        operation,
        ruleId: savedRule.id,
        ruleName: createRuleDto.name,
      });

      return savedRule;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.CREATE_RULE_DB_FAILED, { operation, error: error.stack });
      // 🎯 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 更新告警规则
   */
  async updateRule(
    ruleId: string,
    updateRuleDto: UpdateAlertRuleDto,
  ): Promise<IAlertRule> {
    const operation = ALERTING_OPERATIONS.UPDATE_RULE;

    this.logger.debug(ALERTING_MESSAGES.RULE_UPDATE_STARTED, {
      operation,
      ruleId,
      updateFields: Object.keys(updateRuleDto),
    });

    try {
      const updatedRule = await this.alertRuleRepository.update(ruleId, updateRuleDto);

      this.logger.log(ALERTING_MESSAGES.RULE_UPDATED, {
        operation,
        ruleId,
        ruleName: updatedRule.name,
      });

      return updatedRule;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.UPDATE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const operation = ALERTING_OPERATIONS.DELETE_RULE;

    this.logger.debug(ALERTING_MESSAGES.RULE_DELETION_STARTED, {
      operation,
      ruleId,
    });

    try {
      const result = await this.alertRuleRepository.delete(ruleId);

      this.logger.log(ALERTING_MESSAGES.RULE_DELETED, {
        operation,
        ruleId,
      });

      return result;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.DELETE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取所有告警规则
   */
  async getRules(): Promise<IAlertRule[]> {
    const operation = ALERTING_OPERATIONS.GET_RULES;
    try {
      const rules = await this.alertRuleRepository.findAll();

      this.logger.debug(ALERTING_MESSAGES.STATS_RETRIEVED, {
        operation,
        count: rules.length,
      });

      return rules;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.GET_RULES_FAILED, {
        operation,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 根据ID获取告警规则
   */
  async getRuleById(ruleId: string): Promise<IAlertRule> {
    const operation = ALERTING_OPERATIONS.GET_RULE_BY_ID;
    try {
      const rule = await this.alertRuleRepository.findById(ruleId);
      if (!rule) {
        throw new NotFoundException(
          AlertingTemplateUtil.generateErrorMessage('RULE_NOT_FOUND', { ruleId })
        );
      }
      return rule;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.GET_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 启用/禁用告警规则
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<boolean> {
    const operation = ALERTING_OPERATIONS.TOGGLE_RULE;
    try {
      const success = await this.alertRuleRepository.toggle(ruleId, enabled);
      if (success) {
        this.logger.log(ALERTING_MESSAGES.RULE_STATUS_TOGGLED, {
          operation,
          ruleId,
          enabled
        });
      } else {
        this.logger.warn(ALERTING_MESSAGES.RULE_STATUS_UNCHANGED, {
          operation,
          ruleId,
          enabled
        });
      }
      return success;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.TOGGLE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 处理指标数据并评估规则
   */
  async processMetrics(metricData: IMetricData[]): Promise<void> {
    if (metricData.length === 0) {
      this.logger.debug(ALERTING_MESSAGES.NO_METRICS_TO_PROCESS);
      return;
    }

    const operation = ALERTING_OPERATIONS.PROCESS_METRICS;

    this.logger.debug(ALERTING_MESSAGES.METRICS_PROCESSING_STARTED, {
      operation,
      metricCount: metricData.length,
    });

    try {
      const rules = await this.alertRuleRepository.findAllEnabled();
      if (rules.length === 0) {
        this.logger.debug(ALERTING_MESSAGES.NO_ENABLED_RULES, { operation });
        return;
      }

      const evaluationResults = this.ruleEngine.evaluateRules(rules, metricData);

      for (const result of evaluationResults) {
        await this.handleRuleEvaluation(result, rules);
      }

      this.logger.debug(ALERTING_MESSAGES.METRICS_PROCESSED, {
        operation,
        metricCount: metricData.length,
        ruleCount: rules.length,
      });
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.PROCESS_METRICS_FAILED, {
        operation,
        error: error.stack
      });
      // 🎯 重新抛出错误，防止静默失败
      throw error;
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<IAlert> {
    const operation = ALERTING_OPERATIONS.ACKNOWLEDGE_ALERT;

    this.logger.debug(ALERTING_MESSAGES.ALERT_ACKNOWLEDGMENT_STARTED, {
      operation,
      alertId,
      acknowledgedBy,
    });

    try {
      await this.alertHistoryService.updateAlertStatus(
        alertId,
        AlertStatus.ACKNOWLEDGED,
        acknowledgedBy,
      );

      this.logger.log(ALERTING_MESSAGES.ALERT_ACKNOWLEDGED, {
        operation,
        alertId,
        acknowledgedBy,
      });

      // 返回更新后的告警对象
      const updatedAlert = await this.alertHistoryService.getAlertById(alertId);
      if (!updatedAlert) {
        throw new NotFoundException(`确认后未能找到ID为 ${alertId} 的告警`);
      }
      return updatedAlert;

    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.ACKNOWLEDGE_ALERT_FAILED, {
        operation,
        alertId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    ruleId: string,
  ): Promise<boolean> {
    const operation = ALERTING_OPERATIONS.RESOLVE_ALERT;

    this.logger.debug(ALERTING_MESSAGES.ALERT_RESOLUTION_STARTED, {
      operation,
      alertId,
      resolvedBy,
      ruleId,
    });

    try {
      const alert = await this.alertHistoryService.updateAlertStatus(
        alertId,
        AlertStatus.RESOLVED,
        resolvedBy,
      );

      if (!alert) {
        throw new NotFoundException(
          AlertingTemplateUtil.generateErrorMessage('ALERT_NOT_FOUND_FOR_RESOLVE', { alertId })
        );
      }

      await this.cacheService.del(`${this.config.activeAlertPrefix}:${ruleId}`);

      this.logger.log(ALERTING_MESSAGES.ALERT_RESOLVED, {
        operation,
        alertId,
        resolvedBy
      });

      return true;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.RESOLVE_ALERT_FAILED, {
        operation,
        alertId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取告警统计
   */
  async getStats(): Promise<IAlertStats> {
    const operation = ALERTING_OPERATIONS.GET_STATS;

    this.logger.debug(ALERTING_MESSAGES.STATS_CALCULATION_STARTED, {
      operation,
    });

    try {
      const [historyStats, totalRules, enabledRules] = await Promise.all([
        this.alertHistoryService.getAlertStats(),
        this.alertRuleRepository.countAll(),
        this.alertRuleRepository.countEnabled(),
      ]);

      // 🎯 修复: 为可能缺失的统计数据提供默认值，以满足 IAlertStats 接口要求
      const stats = {
        ...ALERTING_DEFAULT_STATS,
        ...historyStats,
        totalRules,
        enabledRules,
      };

      this.logger.debug(ALERTING_MESSAGES.STATS_RETRIEVED, {
        operation,
        activeAlerts: stats.activeAlerts,
        totalRules,
        enabledRules,
      });

      return stats;
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.GET_STATS_FAILED, {
        operation,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * 监听系统事件
   */
  @OnEvent('performance.**')
  @OnEvent('security.**')
  @OnEvent('auth.**')
  @OnEvent('provider.**')
  @OnEvent('system.**')
  async handleSystemEvent(event: any): Promise<void> {
    const operation = ALERTING_OPERATIONS.HANDLE_SYSTEM_EVENT;

    this.logger.debug(ALERTING_MESSAGES.SYSTEM_EVENT_RECEIVED, {
      operation,
      eventType: event.type,
    });

    try {
      const metricData = this.convertEventToMetric(event);
      if (metricData) {
        await this.processMetrics([metricData]);

        this.logger.debug(ALERTING_MESSAGES.SYSTEM_EVENT_PROCESSED, {
          operation,
          eventType: event.type,
        });
      }
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.HANDLE_EVENT_FAILED, {
        operation,
        error: error.stack
      });
      // 🎯 不重新抛出，避免单个事件处理失败影响整个事件总线
    }
  }

  /**
   * 定时评估规则（每分钟）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateRulesScheduled(): Promise<void> {
    const operation = 'evaluateRulesScheduled';
    this.logger.debug('开始定时评估规则', { operation });
    try {
      // 实际应集成监控数据源
      await this.processMetrics([]);
    } catch (error) {
      this.logger.error('定时规则评估失败', { operation, error: error.stack });
      // 🎯 不重新抛出，避免一次定时任务失败导致后续所有任务中断
    }
  }

  /**
   * 处理规则评估结果
   */
  private async handleRuleEvaluation(
    result: IRuleEvaluationResult,
    rules: IAlertRule[],
  ): Promise<void> {
    const rule = rules.find(r => r.id === result.ruleId);
    if (!rule) return;

    const existingAlert = await this.cacheService.get<IAlert>(
      `${this.config.activeAlertPrefix}:${result.ruleId}`,
    );

    if (result.triggered) {
      if (!existingAlert && !(await this.ruleEngine.isInCooldown(result.ruleId))) {
        await this.createNewAlert(result, rule);
        await this.ruleEngine.setCooldown(result.ruleId, rule.cooldown);
      }
    } else if (existingAlert) {
      await this.resolveAlert(existingAlert.id, 'system', rule.id);
    }
  }

  /**
   * 创建新告警
   */
  private async createNewAlert(
    result: IRuleEvaluationResult,
    rule: IAlertRule,
  ): Promise<void> {
    const operation = ALERTING_OPERATIONS.CREATE_NEW_ALERT;

    this.logger.debug(ALERTING_MESSAGES.ALERT_CREATION_STARTED, {
      operation,
      ruleId: rule.id,
      ruleName: rule.name,
    });
    try {
      const alert = await this.alertHistoryService.createAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        value: result.value,
        threshold: result.threshold,
        severity: rule.severity,
        message: result.message,
        tags: rule.tags,
        context: result.context,
      });

      await this.cacheService.set(
        `${this.config.activeAlertPrefix}:${alert.ruleId}`,
        alert,
        { ttl: this.config.activeAlertTtlSeconds },
      );

      // 将IAlert转换为Alert类型
      const alertForNotification: Alert = {
        ...alert,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await this.notificationService.sendBatchNotifications(alertForNotification, rule);

      this.logger.warn(ALERTING_MESSAGES.NEW_ALERT_TRIGGERED, {
        operation,
        ruleName: rule.name,
        message: result.message
      });
    } catch (error) {
      this.logger.error(ALERTING_MESSAGES.CREATE_ALERT_FAILED, {
        operation,
        ruleName: rule.name,
        error: error.stack
      });
      // 🎯 重新抛出错误，让上层 handleRuleEvaluation 知道创建失败
      throw error;
    }
  }

  /**
   * 加载活跃告警到缓存
   */
  private async loadActiveAlerts(): Promise<void> {
    const activeAlerts = await this.alertHistoryService.getActiveAlerts();

    if (activeAlerts.length > 0) {
      const cachePromises = activeAlerts.map(alert =>
        this.cacheService.set(
          `${this.config.activeAlertPrefix}:${alert.ruleId}`,
          alert,
          { ttl: this.config.activeAlertTtlSeconds },
        ),
      );
      await Promise.all(cachePromises);
    }

    this.logger.log(`加载 ${activeAlerts.length} 条活跃告警到缓存`, {
      operation: 'loadActiveAlerts',
      count: activeAlerts.length,
    });
  }
  
  /**
   * 将系统事件转换为指标数据
   */
  private convertEventToMetric(_event: any): IMetricData | null {
    // 实际应该根据事件类型转换为指标
    return null;
  }


}
