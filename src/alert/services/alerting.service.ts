import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";

import { createLogger } from "@app/config/logger.config";

import { CacheService } from "../../cache/services/cache.service";
import {
  ALERT_OPERATIONS,
  ALERT_MESSAGES,
  ALERT_DEFAULTS,
  AlertRuleUtil,
} from "../constants";
import { CreateAlertRuleDto, UpdateAlertRuleDto } from "../dto";
import { IAlertRule, IAlert, IAlertStats } from "../interfaces";

// 🎯 引入仓储层和新配置
import { IMetricData, IRuleEvaluationResult } from "../interfaces";

// 🎯 引入统一的类型定义
import { AlertRuleRepository } from "../repositories/alert-rule.repository";
import { AlertStatus, Alert } from "../types/alert.types";

// 🎯 复用 common 模块的日志配置
// 🎯 引入告警服务常量

import { AlertHistoryService } from "./alert-history.service";
import { NotificationService } from "./notification.service";
import { RuleEngineService } from "./rule-engine.service";

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
    this.config = this.configService.get("alert.cache");
  }

  async onModuleInit() {
    this.logger.log(ALERT_MESSAGES.SYSTEM.SERVICE_INITIALIZED);
    try {
      await this.loadActiveAlerts();
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.SYSTEM.INITIALIZATION_FAILED, {
        error: error.stack,
      });
      // 在初始化阶段失败，需要抛出异常以使应用启动失败
      throw error;
    }
  }

  /**
   * 创建告警规则
   */
  async createRule(createRuleDto: CreateAlertRuleDto): Promise<IAlertRule> {
    const operation = ALERT_OPERATIONS.RULES.CREATE_RULE;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_CREATION_STARTED, {
      operation,
      ruleName: createRuleDto.name,
    });

    const tempRule = { ...createRuleDto, id: "temp" } as IAlertRule;
    const validation = this.ruleEngine.validateRule(tempRule);
    if (!validation.valid) {
      const errorMsg = AlertRuleUtil.generateErrorMessage(
        "RULE_VALIDATION_FAILED",
        {
          errors: validation.errors.join(", "),
        },
      );
      this.logger.warn(errorMsg, { operation, errors: validation.errors });
      throw new BadRequestException(errorMsg);
    }

    try {
      const savedRule = await this.alertRuleRepository.create({
        ...createRuleDto,
        id: AlertRuleUtil.generateRuleId(),
      });

      this.logger.log(ALERT_MESSAGES.RULES.RULE_CREATED, {
        operation,
        ruleId: savedRule.id,
        ruleName: createRuleDto.name,
      });

      return savedRule;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.CREATE_RULE_DB_FAILED, {
        operation,
        error: error.stack,
      });
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
    const operation = ALERT_OPERATIONS.RULES.UPDATE_RULE;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_UPDATE_STARTED, {
      operation,
      ruleId,
      updateFields: Object.keys(updateRuleDto),
    });

    try {
      const updatedRule = await this.alertRuleRepository.update(
        ruleId,
        updateRuleDto,
      );

      this.logger.log(ALERT_MESSAGES.RULES.RULE_UPDATED, {
        operation,
        ruleId,
        ruleName: updatedRule.name,
      });

      return updatedRule;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.UPDATE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const operation = ALERT_OPERATIONS.RULES.DELETE_RULE;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_DELETION_STARTED, {
      operation,
      ruleId,
    });

    try {
      const result = await this.alertRuleRepository.delete(ruleId);

      this.logger.log(ALERT_MESSAGES.RULES.RULE_DELETED, {
        operation,
        ruleId,
      });

      return result;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.DELETE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取所有告警规则
   */
  async getRules(): Promise<IAlertRule[]> {
    const operation = ALERT_OPERATIONS.RULES.GET_RULES;
    try {
      const rules = await this.alertRuleRepository.findAll();

      this.logger.debug(ALERT_MESSAGES.RULES.METRICS_PROCESSED, {
        operation,
        count: rules.length,
      });

      return rules;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.GET_RULES_FAILED, {
        operation,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据ID获取告警规则
   */
  async getRuleById(ruleId: string): Promise<IAlertRule> {
    const operation = ALERT_OPERATIONS.RULES.GET_RULE_BY_ID;
    try {
      const rule = await this.alertRuleRepository.findById(ruleId);
      if (!rule) {
        throw new NotFoundException(
          AlertRuleUtil.generateErrorMessage("RULE_NOT_FOUND", {
            ruleId,
          }),
        );
      }
      return rule;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.GET_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 启用/禁用告警规则
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<boolean> {
    const operation = ALERT_OPERATIONS.RULES.TOGGLE_RULE;
    try {
      const success = await this.alertRuleRepository.toggle(ruleId, enabled);
      if (success) {
        this.logger.log(ALERT_MESSAGES.RULES.RULE_STATUS_TOGGLED, {
          operation,
          ruleId,
          enabled,
        });
      } else {
        this.logger.warn(ALERT_MESSAGES.RULES.RULE_STATUS_UNCHANGED, {
          operation,
          ruleId,
          enabled,
        });
      }
      return success;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.TOGGLE_RULE_FAILED, {
        operation,
        ruleId,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 处理指标数据并评估规则
   */
  async processMetrics(metricData: IMetricData[]): Promise<void> {
    if (metricData.length === 0) {
      this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED);
      return;
    }

    const operation = ALERT_OPERATIONS.RULES.PROCESS_METRICS;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED, {
      operation,
      metricCount: metricData.length,
    });

    try {
      const rules = await this.alertRuleRepository.findAllEnabled();
      if (rules.length === 0) {
        this.logger.debug(ALERT_MESSAGES.RULES.NO_ENABLED_RULES, { operation });
        return;
      }

      const evaluationResults = this.ruleEngine.evaluateRules(
        rules,
        metricData,
      );

      for (const result of evaluationResults) {
        await this.handleRuleEvaluation(result, rules);
      }

      this.logger.debug(ALERT_MESSAGES.RULES.METRICS_PROCESSED, {
        operation,
        metricCount: metricData.length,
        ruleCount: rules.length,
      });
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED, {
        operation,
        error: error.stack,
      });
      // 🎯 重新抛出错误，防止静默失败
      throw error;
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<IAlert> {
    const operation = ALERT_OPERATIONS.RULES.ACKNOWLEDGE_ALERT;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED, {
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

      this.logger.log(ALERT_MESSAGES.RULES.RULE_STATUS_TOGGLED, {
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
      this.logger.error(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED, {
        operation,
        alertId,
        error: error.stack,
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
    const operation = ALERT_OPERATIONS.RULES.RESOLVE_ALERT;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED, {
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
          AlertRuleUtil.generateErrorMessage(
            "ALERT_NOT_FOUND_FOR_RESOLVE",
            { alertId },
          ),
        );
      }

      await this.cacheService.del(`${this.config.activeAlertPrefix}:${ruleId}`);

      this.logger.log(ALERT_MESSAGES.RULES.RULE_STATUS_TOGGLED, {
        operation,
        alertId,
        resolvedBy,
      });

      return true;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED, {
        operation,
        alertId,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取告警统计
   */
  async getStats(): Promise<IAlertStats> {
    const operation = ALERT_OPERATIONS.RULES.GET_STATS;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED, {
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
        ...ALERT_DEFAULTS.STATS,
        ...historyStats,
        totalRules,
        enabledRules,
      };

      this.logger.debug(ALERT_MESSAGES.RULES.METRICS_PROCESSED, {
        operation,
        activeAlerts: stats.activeAlerts,
        totalRules,
        enabledRules,
      });

      return stats;
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.GET_RULES_FAILED, {
        operation,
        error: error.stack,
      });
      throw error;
    }
  }

  /**
   * 监听系统事件
   */
  @OnEvent("performance.**")
  @OnEvent("security.**")
  @OnEvent("auth.**")
  @OnEvent("provider.**")
  @OnEvent("system.**")
  async handleSystemEvent(event: any): Promise<void> {
    const operation = ALERT_OPERATIONS.RULES.HANDLE_SYSTEM_EVENT;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED, {
      operation,
      eventType: event.type,
    });

    try {
      const metricData = this.convertEventToMetric();
      if (metricData) {
        await this.processMetrics([metricData]);

        this.logger.debug(ALERT_MESSAGES.RULES.METRICS_PROCESSED, {
          operation,
          eventType: event.type,
        });
      }
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED, {
        operation,
        error: error.stack,
      });
      // 🎯 不重新抛出，避免单个事件处理失败影响整个事件总线
    }
  }

  /**
   * 定时评估规则（每分钟）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateRulesScheduled(): Promise<void> {
    const operation = "evaluateRulesScheduled";
    this.logger.debug("开始定时评估规则", { operation });
    try {
      // 实际应集成监控数据源
      await this.processMetrics([]);
    } catch (error) {
      this.logger.error("定时规则评估失败", { operation, error: error.stack });
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
    const rule = rules.find((r) => r.id === result.ruleId);
    if (!rule) return;

    const existingAlert = await this.cacheService.get<IAlert>(
      `${this.config.activeAlertPrefix}:${result.ruleId}`,
    );

    if (result.triggered) {
      if (
        !existingAlert &&
        !(await this.ruleEngine.isInCooldown(result.ruleId))
      ) {
        await this.createNewAlert(result, rule);
        await this.ruleEngine.setCooldown(result.ruleId, rule.cooldown);
      }
    } else if (existingAlert) {
      await this.resolveAlert(existingAlert.id, "system", rule.id);
    }
  }

  /**
   * 创建新告警
   */
  private async createNewAlert(
    result: IRuleEvaluationResult,
    rule: IAlertRule,
  ): Promise<void> {
    const operation = ALERT_OPERATIONS.RULES.CREATE_RULE;

    this.logger.debug(ALERT_MESSAGES.RULES.RULE_CREATION_STARTED, {
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

      // 缓存设置 - 错误时记录但不中断流程
      try {
        await this.cacheService.set(
          `${this.config.activeAlertPrefix}:${alert.ruleId}`,
          alert,
          { ttl: this.config.activeAlertTtlSeconds },
        );
      } catch (cacheError) {
        this.logger.error("告警缓存设置失败", {
          operation,
          ruleName: rule.name,
          alertId: alert.id,
          error: cacheError.message,
        });
      }

      // 通知发送 - 错误时记录但不中断流程
      try {
        // 将IAlert转换为Alert类型
        const alertForNotification: Alert = {
          ...alert,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await this.notificationService.sendBatchNotifications(
          alertForNotification,
          rule,
        );
      } catch (notificationError) {
        this.logger.error("告警通知发送失败", {
          operation,
          ruleName: rule.name,
          alertId: alert.id,
          error: notificationError.message,
        });
      }

      this.logger.warn(ALERT_MESSAGES.RULES.RULE_CREATED, {
        operation,
        ruleName: rule.name,
        message: result.message,
      });
    } catch (error) {
      this.logger.error(ALERT_MESSAGES.RULES.CREATE_RULE_DB_FAILED, {
        operation,
        ruleName: rule.name,
        error: error.stack,
      });
      // 🎯 只有告警创建失败时才抛出错误，缓存和通知错误不中断流程
      throw error;
    }
  }

  /**
   * 加载活跃告警到缓存
   */
  private async loadActiveAlerts(): Promise<void> {
    const activeAlerts = await this.alertHistoryService.getActiveAlerts();

    if (activeAlerts.length > 0) {
      // 为每个告警单独处理缓存设置，避免单个失败影响整体
      const cacheResults = await Promise.allSettled(
        activeAlerts.map(async (alert) => {
          try {
            await this.cacheService.set(
              `${this.config.activeAlertPrefix}:${alert.ruleId}`,
              alert,
              { ttl: this.config.activeAlertTtlSeconds },
            );
            return { success: true, alertId: alert.id };
          } catch (error) {
            this.logger.error("活跃告警缓存设置失败", {
              operation: "loadActiveAlerts",
              alertId: alert.id,
              ruleId: alert.ruleId,
              error: error.message,
            });
            return { success: false, alertId: alert.id, error: error.message };
          }
        }),
      );

      const successCount = cacheResults.filter(
        (result) => result.status === "fulfilled" && result.value.success,
      ).length;
      const failureCount = activeAlerts.length - successCount;

      this.logger.log(`加载活跃告警到缓存完成`, {
        operation: "loadActiveAlerts",
        total: activeAlerts.length,
        success: successCount,
        failed: failureCount,
      });
    } else {
      this.logger.log("没有活跃告警需要加载到缓存", {
        operation: "loadActiveAlerts",
        count: 0,
      });
    }
  }

  /**
   * 将系统事件转换为指标数据
   */
  private convertEventToMetric(): IMetricData | null {
    // 实际应该根据事件类型转换为指标
    return null;
  }
}
