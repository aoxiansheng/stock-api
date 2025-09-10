/**
 * Alert事件适配器服务
 * 🎯 将Alert模块的原生事件转换为通用事件格式
 * 
 * @description 实现Alert模块与Notification模块的完全解耦
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

import { createLogger } from '@app/config/logger.config';

// 导入Alert模块原生类型
import { Alert, AlertRule, AlertSeverity, AlertStatus } from '../types/alert.types';
import { AlertContext } from '../events/alert.events';

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
} from '@common/events';

/**
 * Alert事件适配器
 * 负责将Alert模块的原生事件转换为通用事件格式
 */
@Injectable()
export class AlertEventAdapterService {
  private readonly logger = createLogger('AlertEventAdapterService');

  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 发出警告触发事件（通用格式）
   */
  async emitAlertFiredEvent(
    alert: Alert,
    rule: AlertRule,
    context: AlertContext
  ): Promise<void> {
    try {
      // 转换为通用事件格式
      const genericEvent = this.convertToGenericEvent(
        alert,
        rule,
        context,
        GenericAlertEventType.FIRED
      );

      // 同时发出原生事件和通用事件
      await Promise.all([
        // 保持原有事件（向后兼容）
        this.emitLegacyEvent(alert, rule, context, 'alert.fired'),
        // 发出通用事件
        this.emitGenericEvent(genericEvent),
      ]);

      this.logger.debug('警告触发事件已发出（双重格式）', {
        alertId: alert.id,
        ruleId: rule.id,
        correlationId: genericEvent.correlationId,
      });

    } catch (error) {
      this.logger.error('发出警告触发事件失败', {
        alertId: alert.id,
        ruleId: rule.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发出警告解决事件（通用格式）
   */
  async emitAlertResolvedEvent(
    alert: Alert,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): Promise<void> {
    try {
      const genericEvent = this.convertToGenericEvent(
        alert,
        null, // 解决事件可能没有规则信息
        { resolvedAt, resolvedBy, comment } as any,
        GenericAlertEventType.RESOLVED,
        {
          resolvedAt,
          resolvedBy,
          resolutionComment: comment,
        }
      );

      await Promise.all([
        this.emitLegacyEvent(alert, null, { resolvedAt, resolvedBy, comment } as any, 'alert.resolved'),
        this.emitGenericEvent(genericEvent),
      ]);

      this.logger.debug('警告解决事件已发出（双重格式）', {
        alertId: alert.id,
        correlationId: genericEvent.correlationId,
      });

    } catch (error) {
      this.logger.error('发出警告解决事件失败', {
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发出警告确认事件（通用格式）
   */
  async emitAlertAcknowledgedEvent(
    alert: Alert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<void> {
    try {
      const genericEvent = this.convertToGenericEvent(
        alert,
        null,
        { acknowledgedBy, acknowledgedAt, comment } as any,
        GenericAlertEventType.ACKNOWLEDGED,
        {
          acknowledgedBy,
          acknowledgedAt,
          acknowledgmentComment: comment,
        }
      );

      await Promise.all([
        this.emitLegacyEvent(alert, null, { acknowledgedBy, acknowledgedAt, comment } as any, 'alert.acknowledged'),
        this.emitGenericEvent(genericEvent),
      ]);

      this.logger.debug('警告确认事件已发出（双重格式）', {
        alertId: alert.id,
        correlationId: genericEvent.correlationId,
      });

    } catch (error) {
      this.logger.error('发出警告确认事件失败', {
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发出警告抑制事件（通用格式）
   */
  async emitAlertSuppressedEvent(
    alert: Alert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<void> {
    try {
      const genericEvent = this.convertToGenericEvent(
        alert,
        null,
        { suppressedBy, suppressedAt, suppressionDuration, reason } as any,
        GenericAlertEventType.SUPPRESSED,
        {
          suppressedBy,
          suppressedAt,
          suppressionDuration,
          suppressionReason: reason,
        }
      );

      await Promise.all([
        this.emitLegacyEvent(alert, null, { suppressedBy, suppressedAt, suppressionDuration, reason } as any, 'alert.suppressed'),
        this.emitGenericEvent(genericEvent),
      ]);

      this.logger.debug('警告抑制事件已发出（双重格式）', {
        alertId: alert.id,
        correlationId: genericEvent.correlationId,
      });

    } catch (error) {
      this.logger.error('发出警告抑制事件失败', {
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发出警告升级事件（通用格式）
   */
  async emitAlertEscalatedEvent(
    alert: Alert,
    previousSeverity: AlertSeverity,
    newSeverity: AlertSeverity,
    escalatedAt: Date,
    escalationReason?: string
  ): Promise<void> {
    try {
      const genericEvent = this.convertToGenericEvent(
        alert,
        null,
        { previousSeverity, newSeverity, escalatedAt, escalationReason } as any,
        GenericAlertEventType.ESCALATED,
        {
          previousSeverity: this.mapSeverityToGeneric(previousSeverity),
          newSeverity: this.mapSeverityToGeneric(newSeverity),
          escalatedAt,
          escalationReason,
        }
      );

      await Promise.all([
        this.emitLegacyEvent(alert, null, { previousSeverity, newSeverity, escalatedAt, escalationReason } as any, 'alert.escalated'),
        this.emitGenericEvent(genericEvent),
      ]);

      this.logger.debug('警告升级事件已发出（双重格式）', {
        alertId: alert.id,
        correlationId: genericEvent.correlationId,
      });

    } catch (error) {
      this.logger.error('发出警告升级事件失败', {
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 将Alert模块原生数据转换为通用事件格式
   */
  private convertToGenericEvent(
    alert: Alert,
    rule: AlertRule | null,
    context: AlertContext,
    eventType: GenericAlertEventType,
    eventData?: Record<string, any>
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
      metric: alert.metric || 'unknown',
      description: (alert as any).description || `Alert ${alert.id}`,
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
      channels: (rule.channels || []).map(channel => ({
        id: channel.id || '',
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
      description: 'Auto-generated default rule',
      metric: alert.metric || 'unknown',
      operator: 'gt',
      threshold: alert.threshold || 0,
      duration: 60,
      cooldown: 300,
      enabled: true,
      channels: [],
      tags: alert.tags,
    };
  }

  /**
   * 映射AlertContext到通用Context格式
   */
  private mapContextToGeneric(context: AlertContext): GenericAlertContext {
    return {
      metricValue: context.metricValue,
      threshold: context.threshold,
      duration: context.triggerCondition?.duration || 60,
      operator: context.triggerCondition?.operator || 'gt',
      evaluatedAt: context.triggeredAt || new Date(),
      dataPoints: context.historicalData?.map(point => ({
        timestamp: point.timestamp,
        value: point.value,
      })),
      metadata: {
        dataSource: context.dataSource,
        tags: context.tags,
        consecutiveFailures: context.triggerCondition?.consecutiveFailures,
        relatedAlerts: context.relatedAlerts,
      },
    };
  }

  /**
   * 映射Alert严重程度到通用严重程度
   */
  private mapSeverityToGeneric(severity: AlertSeverity): GenericAlertSeverity {
    const severityMap = {
      [AlertSeverity.INFO]: GenericAlertSeverity.LOW,
      [AlertSeverity.WARNING]: GenericAlertSeverity.MEDIUM,
      [AlertSeverity.CRITICAL]: GenericAlertSeverity.CRITICAL,
    };

    return severityMap[severity] || GenericAlertSeverity.LOW;
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
   * 发出原生事件（向后兼容）
   */
  private async emitLegacyEvent(
    alert: Alert,
    rule: AlertRule | null,
    context: any,
    eventName: string
  ): Promise<void> {
    // 这里保持原有的事件格式
    this.eventEmitter.emit(eventName, {
      alert,
      rule,
      context,
      timestamp: new Date(),
    });
  }

  /**
   * 发出通用事件
   */
  private async emitGenericEvent(genericEvent: GenericAlertEvent): Promise<void> {
    const eventName = GENERIC_EVENT_TYPES.GENERIC_ALERT[genericEvent.eventType];
    this.eventEmitter.emit(eventName, genericEvent);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      return {
        status: 'healthy',
        details: {
          serviceName: 'AlertEventAdapterService',
          supportedEvents: [
            GenericAlertEventType.FIRED,
            GenericAlertEventType.RESOLVED,
            GenericAlertEventType.ACKNOWLEDGED,
            GenericAlertEventType.SUPPRESSED,
            GenericAlertEventType.ESCALATED,
          ],
          lastHealthCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          lastHealthCheck: new Date().toISOString(),
        },
      };
    }
  }
}