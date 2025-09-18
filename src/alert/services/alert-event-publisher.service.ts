/**
 * Alert事件发布服务
 * 🎯 专门负责告警事件的发布和通用事件转换
 *
 * @description 单一职责：专业化的告警事件发布服务
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ConfigType } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { v4 as uuidv4 } from "uuid";
import cacheUnifiedConfig from "../../cache/config/cache-unified.config";

import { createLogger } from "@common/logging/index";
import { IAlert, IAlertRule } from "../interfaces";
import {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
} from "../types/alert.types";
import { AlertContext } from "../events/alert.events";

// 导入通用事件接口
import {
  GenericAlertEvent,
  GenericAlertEventType,
  GenericAlertSeverity,
  GenericAlertStatus,
  GenericAlert,
  GenericAlertRule,
  GenericAlertContext,
  GENERIC_EVENT_TYPES,
} from "@common/events";

@Injectable()
export class AlertEventPublisher {
  private readonly logger = createLogger("AlertEventPublisher");
  private readonly alertConfig: {
    defaultCooldown: number;
  };

  // 事件发布统计追踪
  private publisherStats = {
    totalEventsPublished: 0,
    eventTypeBreakdown: {} as Record<string, number>,
    failedPublications: 0,
    lastPublishedAt: null as Date | null,
    avgPublishingTime: 0,
    totalPublishingTime: 0,
  };

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject('cacheUnified') private readonly cacheConfig: ConfigType<typeof cacheUnifiedConfig>,
  ) {
    // 获取alert配置
    this.alertConfig = this.configService.get("alert", {
      defaultCooldown: 300,
    });
  }

  /**
   * 发布告警触发事件
   */
  async publishAlertFiredEvent(
    alert: IAlert,
    rule: IAlertRule,
    context: any,
  ): Promise<void> {
    const operation = "PUBLISH_ALERT_FIRED";

    this.logger.debug("发布告警触发事件", {
      operation,
      alertId: alert.id,
      ruleId: rule.id,
      ruleName: rule.name,
    });

    try {
      // 转换为Alert模块的原生类型
      const alertForEvent = this.convertToAlertType(alert);
      const ruleForEvent = this.convertToAlertRuleType(rule);
      const contextForEvent = this.convertToAlertContext(context);

      // 只发布通用事件（解耦后）
      await this.emitGenericEvent(
        alertForEvent,
        ruleForEvent,
        contextForEvent,
        GenericAlertEventType.FIRED,
      );

      this.logger.debug("告警触发事件发布成功", {
        operation,
        alertId: alert.id,
        ruleId: rule.id,
      });
    } catch (error) {
      this.logger.error("发布告警触发事件失败", {
        operation,
        alertId: alert.id,
        ruleId: rule.id,
        error: error.message,
        stack: error.stack,
      });
      // 事件发布失败不应影响告警创建
    }
  }

  /**
   * 发布告警解决事件
   */
  async publishAlertResolvedEvent(
    alert: IAlert,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string,
  ): Promise<void> {
    const operation = "PUBLISH_ALERT_RESOLVED";

    this.logger.debug("发布告警解决事件", {
      operation,
      alertId: alert.id,
      resolvedBy,
    });

    try {
      const alertForEvent = this.convertToAlertType(alert);
      const eventData = { resolvedAt, resolvedBy, resolutionComment: comment };

      // 只发布通用事件（解耦后）
      await this.emitGenericEvent(
        alertForEvent,
        null,
        eventData,
        GenericAlertEventType.RESOLVED,
        eventData,
      );

      this.logger.debug("告警解决事件发布成功", {
        operation,
        alertId: alert.id,
        resolvedBy,
      });
    } catch (error) {
      this.logger.error("发布告警解决事件失败", {
        operation,
        alertId: alert.id,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 发布告警确认事件
   */
  async publishAlertAcknowledgedEvent(
    alert: IAlert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string,
  ): Promise<void> {
    const operation = "PUBLISH_ALERT_ACKNOWLEDGED";

    this.logger.debug("发布告警确认事件", {
      operation,
      alertId: alert.id,
      acknowledgedBy,
    });

    try {
      const alertForEvent = this.convertToAlertType(alert);
      const eventData = {
        acknowledgedBy,
        acknowledgedAt,
        acknowledgmentComment: comment,
      };

      // 只发布通用事件（解耦后）
      await this.emitGenericEvent(
        alertForEvent,
        null,
        eventData,
        GenericAlertEventType.ACKNOWLEDGED,
        eventData,
      );

      this.logger.debug("告警确认事件发布成功", {
        operation,
        alertId: alert.id,
        acknowledgedBy,
      });
    } catch (error) {
      this.logger.error("发布告警确认事件失败", {
        operation,
        alertId: alert.id,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 发布告警抑制事件
   */
  async publishAlertSuppressedEvent(
    alert: IAlert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string,
  ): Promise<void> {
    const operation = "PUBLISH_ALERT_SUPPRESSED";

    this.logger.debug("发布告警抑制事件", {
      operation,
      alertId: alert.id,
      suppressedBy,
      suppressionDuration,
    });

    try {
      const alertForEvent = this.convertToAlertType(alert);
      const eventData = {
        suppressedBy,
        suppressedAt,
        suppressionDuration,
        suppressionReason: reason,
      };

      // 只发布通用事件（解耦后）
      await this.emitGenericEvent(
        alertForEvent,
        null,
        eventData,
        GenericAlertEventType.SUPPRESSED,
        eventData,
      );

      this.logger.debug("告警抑制事件发布成功", {
        operation,
        alertId: alert.id,
        suppressedBy,
      });
    } catch (error) {
      this.logger.error("发布告警抑制事件失败", {
        operation,
        alertId: alert.id,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 发布告警升级事件
   */
  async publishAlertEscalatedEvent(
    alert: IAlert,
    previousSeverity: string,
    newSeverity: string,
    escalatedAt: Date,
    escalationReason?: string,
  ): Promise<void> {
    const operation = "PUBLISH_ALERT_ESCALATED";

    this.logger.debug("发布告警升级事件", {
      operation,
      alertId: alert.id,
      previousSeverity,
      newSeverity,
    });

    try {
      const alertForEvent = this.convertToAlertType(alert);
      const eventData = {
        previousSeverity: this.mapSeverityToGeneric(previousSeverity),
        newSeverity: this.mapSeverityToGeneric(newSeverity),
        escalatedAt,
        escalationReason,
      };

      // 只发布通用事件（解耦后）
      await this.emitGenericEvent(
        alertForEvent,
        null,
        eventData,
        GenericAlertEventType.ESCALATED,
        eventData,
      );

      this.logger.debug("告警升级事件发布成功", {
        operation,
        alertId: alert.id,
        previousSeverity,
        newSeverity,
      });
    } catch (error) {
      this.logger.error("发布告警升级事件失败", {
        operation,
        alertId: alert.id,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 发出通用事件
   */
  private async emitGenericEvent(
    alert: Alert,
    rule: AlertRule | null,
    context: any,
    eventType: GenericAlertEventType,
    eventData?: Record<string, any>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const genericEvent = this.convertToGenericEvent(
        alert,
        rule,
        context,
        eventType,
        eventData,
      );

      const eventName = GENERIC_EVENT_TYPES.GENERIC_ALERT[eventType];
      this.eventEmitter.emit(eventName, genericEvent);

      // 记录成功发布的统计
      this.updatePublishingStats(eventType, startTime, true);
    } catch (error) {
      // 记录失败的统计
      this.updatePublishingStats(eventType, startTime, false);
      throw error;
    }
  }

  /**
   * 更新发布统计
   */
  private updatePublishingStats(
    eventType: GenericAlertEventType,
    startTime: number,
    success: boolean,
  ): void {
    const publishingTime = Date.now() - startTime;

    if (success) {
      this.publisherStats.totalEventsPublished++;
      this.publisherStats.lastPublishedAt = new Date();

      // 更新事件类型统计
      if (!this.publisherStats.eventTypeBreakdown[eventType]) {
        this.publisherStats.eventTypeBreakdown[eventType] = 0;
      }
      this.publisherStats.eventTypeBreakdown[eventType]++;

      // 更新平均发布时间
      this.publisherStats.totalPublishingTime += publishingTime;
      this.publisherStats.avgPublishingTime =
        this.publisherStats.totalPublishingTime /
        this.publisherStats.totalEventsPublished;
    } else {
      this.publisherStats.failedPublications++;
    }
  }

  /**
   * 将IAlert转换为Alert类型
   */
  private convertToAlertType(alert: IAlert): Alert {
    return {
      ...alert,
      createdAt: alert.startTime || new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 将IAlertRule转换为AlertRule类型
   */
  private convertToAlertRuleType(rule: IAlertRule): AlertRule {
    return {
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 转换为AlertContext类型
   */
  private convertToAlertContext(context: any): AlertContext {
    return {
      metricValue: context.metricValue || 0,
      threshold: context.threshold || 0,
      triggeredAt: context.triggeredAt || new Date(),
      tags: context.tags || {},
      triggerCondition: context.triggerCondition || {
        operator: ">",
        duration: this.alertConfig.defaultCooldown,
      },
    };
  }

  /**
   * 将Alert模块数据转换为通用事件格式
   */
  private convertToGenericEvent(
    alert: Alert,
    rule: AlertRule | null,
    context: any,
    eventType: GenericAlertEventType,
    eventData?: Record<string, any>,
  ): GenericAlertEvent {
    const correlationId = uuidv4();

    return {
      eventType,
      timestamp: new Date(),
      correlationId,
      alert: this.mapAlertToGeneric(alert),
      rule: rule ? this.mapRuleToGeneric(rule) : this.createDefaultRule(alert),
      context: this.mapContextToGeneric(context),
      eventData: eventData || {},
    };
  }

  /**
   * 映射Alert到通用Alert格式
   */
  private mapAlertToGeneric(alert: Alert): GenericAlert {
    return {
      id: alert.id,
      severity: this.mapSeverityToGeneric(alert.severity),
      status: this.mapStatusToGeneric(alert.status),
      metric: alert.metric || "unknown",
      description: alert.message || `Alert ${alert.id}`,
      value: alert.value,
      threshold: alert.threshold,
      tags: alert.tags,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * 映射AlertRule到通用Rule格式
   */
  private mapRuleToGeneric(rule: AlertRule): GenericAlertRule {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      duration: rule.duration,
      cooldown: rule.cooldown,
      enabled: rule.enabled,
      channels: (rule.channels || []).map((channel) => ({
        id: channel.id || "",
        type: channel.type,
        name: channel.name || channel.type,
        enabled: channel.enabled !== false,
        config: channel.config || {},
        retryCount: channel.retryCount,
        timeout: channel.timeout,
      })),
      tags: rule.tags,
    };
  }

  /**
   * 创建默认规则（当规则信息不可用时）
   */
  private createDefaultRule(alert: Alert): GenericAlertRule {
    return {
      id: `default-rule-${alert.id}`,
      name: `Default rule for alert ${alert.id}`,
      description: "Auto-generated default rule",
      metric: alert.metric || "unknown",
      operator: "gt",
      threshold: alert.threshold || 0,
      duration: this.alertConfig.defaultCooldown,
      cooldown:
        this.cacheConfig.defaultTtl,
      enabled: true,
      channels: [],
      tags: alert.tags,
    };
  }

  /**
   * 映射AlertContext到通用Context格式
   */
  private mapContextToGeneric(context: any): GenericAlertContext {
    return {
      metricValue: context.metricValue || 0,
      threshold: context.threshold || 0,
      duration:
        context.triggerCondition?.duration || this.alertConfig.defaultCooldown,
      operator: context.triggerCondition?.operator || "gt",
      evaluatedAt: context.triggeredAt || new Date(),
      dataPoints:
        context.historicalData?.map((point) => ({
          timestamp: point.timestamp,
          value: point.value,
        })) || [],
      metadata: {
        tags: context.tags || {},
        consecutiveFailures: context.triggerCondition?.consecutiveFailures,
        relatedAlerts: context.relatedAlerts || [],
      },
    };
  }

  /**
   * 映射Alert严重程度到通用严重程度
   */
  private mapSeverityToGeneric(severity: string): GenericAlertSeverity {
    const severityMap = {
      info: GenericAlertSeverity.LOW,
      warning: GenericAlertSeverity.MEDIUM,
      critical: GenericAlertSeverity.CRITICAL,
      high: GenericAlertSeverity.HIGH,
      medium: GenericAlertSeverity.MEDIUM,
      low: GenericAlertSeverity.LOW,
    };

    return severityMap[severity.toLowerCase()] || GenericAlertSeverity.LOW;
  }

  /**
   * 映射Alert状态到通用状态
   */
  private mapStatusToGeneric(status: AlertStatus): GenericAlertStatus {
    const statusMap = {
      [AlertStatus.FIRING]: GenericAlertStatus.ACTIVE,
      [AlertStatus.RESOLVED]: GenericAlertStatus.RESOLVED,
      [AlertStatus.ACKNOWLEDGED]: GenericAlertStatus.ACKNOWLEDGED,
      [AlertStatus.SUPPRESSED]: GenericAlertStatus.SUPPRESSED,
    };

    return statusMap[status] || GenericAlertStatus.ACTIVE;
  }

  /**
   * 获取事件发布统计
   */
  getPublisherStats(): {
    totalEventsPublished: number;
    eventTypeBreakdown: Record<string, number>;
    failedPublications: number;
    lastPublishedAt: Date | null;
    avgPublishingTime: number;
    successRate: number;
  } {
    const totalEvents =
      this.publisherStats.totalEventsPublished +
      this.publisherStats.failedPublications;
    const successRate =
      totalEvents > 0
        ? Math.round(
            (this.publisherStats.totalEventsPublished / totalEvents) * 100,
          )
        : 0;

    return {
      totalEventsPublished: this.publisherStats.totalEventsPublished,
      eventTypeBreakdown: { ...this.publisherStats.eventTypeBreakdown },
      failedPublications: this.publisherStats.failedPublications,
      lastPublishedAt: this.publisherStats.lastPublishedAt,
      avgPublishingTime:
        Math.round(this.publisherStats.avgPublishingTime * 100) / 100,
      successRate: successRate,
    };
  }

  /**
   * 重置发布统计数据
   */
  resetPublisherStats(): void {
    this.publisherStats = {
      totalEventsPublished: 0,
      eventTypeBreakdown: {},
      failedPublications: 0,
      lastPublishedAt: null,
      avgPublishingTime: 0,
      totalPublishingTime: 0,
    };
    this.logger.log("事件发布统计数据已重置");
  }
}
