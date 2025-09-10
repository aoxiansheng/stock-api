/**
 * Notification模块独立的事件类型定义
 * 🎯 为事件驱动通信提供独立的事件接口
 * 
 * @description 避免对Alert事件的直接依赖，支持通用事件处理
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import {
  GenericAlertEvent,
  GenericAlertEventType,
  GenericAlertSeverity,
  GenericAlertStatus,
} from '@common/events';

import {
  NotificationAlert,
  NotificationAlertRule,
  NotificationAlertContext,
  NotificationAlertChannel,
  NotificationSeverity,
  NotificationAlertStatus,
  NotificationOperator,
  NotificationEventData,
} from './notification-alert.types';

/**
 * 通知事件类型枚举
 */
export enum NotificationEventType {
  // 警告相关事件
  ALERT_FIRED = 'alert.fired',
  ALERT_RESOLVED = 'alert.resolved', 
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_SUPPRESSED = 'alert.suppressed',
  ALERT_ESCALATED = 'alert.escalated',
  
  // 通知发送事件
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_RETRY = 'notification.retry',
  
  // 渠道相关事件
  CHANNEL_TESTED = 'channel.tested',
  CHANNEL_FAILED = 'channel.failed',
  CHANNEL_RECOVERED = 'channel.recovered',
}

/**
 * 基础通知事件接口
 */
export interface BaseNotificationEvent {
  /**
   * 事件唯一标识
   */
  id: string;
  
  /**
   * 事件类型
   */
  type: NotificationEventType;
  
  /**
   * 事件时间戳
   */
  timestamp: Date;
  
  /**
   * 关联ID，用于追踪事件链
   */
  correlationId: string;
  
  /**
   * 事件来源
   */
  source: string;
  
  /**
   * 事件元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 警告触发事件
 */
export interface NotificationAlertFiredEvent extends BaseNotificationEvent {
  type: NotificationEventType.ALERT_FIRED;
  
  /**
   * 触发的警告
   */
  alert: NotificationAlert;
  
  /**
   * 触发规则
   */
  rule: NotificationAlertRule;
  
  /**
   * 触发上下文
   */
  context: NotificationAlertContext;
}

/**
 * 警告解决事件
 */
export interface NotificationAlertResolvedEvent extends BaseNotificationEvent {
  type: NotificationEventType.ALERT_RESOLVED;
  
  /**
   * 解决的警告
   */
  alert: NotificationAlert;
  
  /**
   * 解决时间
   */
  resolvedAt: Date;
  
  /**
   * 解决者
   */
  resolvedBy?: string;
  
  /**
   * 解决备注
   */
  comment?: string;
}

/**
 * 警告确认事件
 */
export interface NotificationAlertAcknowledgedEvent extends BaseNotificationEvent {
  type: NotificationEventType.ALERT_ACKNOWLEDGED;
  
  /**
   * 确认的警告
   */
  alert: NotificationAlert;
  
  /**
   * 确认者
   */
  acknowledgedBy: string;
  
  /**
   * 确认时间
   */
  acknowledgedAt: Date;
  
  /**
   * 确认备注
   */
  comment?: string;
}

/**
 * 警告抑制事件
 */
export interface NotificationAlertSuppressedEvent extends BaseNotificationEvent {
  type: NotificationEventType.ALERT_SUPPRESSED;
  
  /**
   * 抑制的警告
   */
  alert: NotificationAlert;
  
  /**
   * 抑制者
   */
  suppressedBy: string;
  
  /**
   * 抑制时间
   */
  suppressedAt: Date;
  
  /**
   * 抑制持续时间（秒）
   */
  suppressionDuration: number;
  
  /**
   * 抑制原因
   */
  reason?: string;
}

/**
 * 警告升级事件
 */
export interface NotificationAlertEscalatedEvent extends BaseNotificationEvent {
  type: NotificationEventType.ALERT_ESCALATED;
  
  /**
   * 升级的警告
   */
  alert: NotificationAlert;
  
  /**
   * 之前的严重程度
   */
  previousSeverity: NotificationSeverity;
  
  /**
   * 新的严重程度
   */
  newSeverity: NotificationSeverity;
  
  /**
   * 升级时间
   */
  escalatedAt: Date;
  
  /**
   * 升级原因
   */
  escalationReason?: string;
}

/**
 * 通知发送事件
 */
export interface NotificationSentEvent extends BaseNotificationEvent {
  type: NotificationEventType.NOTIFICATION_SENT;
  
  /**
   * 通知ID
   */
  notificationId: string;
  
  /**
   * 警告ID
   */
  alertId: string;
  
  /**
   * 渠道配置
   */
  channel: NotificationAlertChannel;
  
  /**
   * 发送结果
   */
  result: {
    success: boolean;
    message: string;
    deliveryId?: string;
    duration: number;
    error?: string;
  };
}

/**
 * 通知失败事件
 */
export interface NotificationFailedEvent extends BaseNotificationEvent {
  type: NotificationEventType.NOTIFICATION_FAILED;
  
  /**
   * 通知ID
   */
  notificationId: string;
  
  /**
   * 警告ID
   */
  alertId: string;
  
  /**
   * 失败的渠道
   */
  channel: NotificationAlertChannel;
  
  /**
   * 失败信息
   */
  error: {
    code: string;
    message: string;
    stack?: string;
    retryable: boolean;
  };
  
  /**
   * 重试次数
   */
  retryCount: number;
}

/**
 * 渠道测试事件
 */
export interface NotificationChannelTestedEvent extends BaseNotificationEvent {
  type: NotificationEventType.CHANNEL_TESTED;
  
  /**
   * 测试的渠道
   */
  channel: NotificationAlertChannel;
  
  /**
   * 测试结果
   */
  result: {
    success: boolean;
    message: string;
    duration: number;
    error?: string;
  };
  
  /**
   * 测试者
   */
  testedBy?: string;
}

/**
 * 联合事件类型
 */
export type NotificationEvent = 
  | NotificationAlertFiredEvent
  | NotificationAlertResolvedEvent
  | NotificationAlertAcknowledgedEvent
  | NotificationAlertSuppressedEvent
  | NotificationAlertEscalatedEvent
  | NotificationSentEvent
  | NotificationFailedEvent
  | NotificationChannelTestedEvent;

/**
 * 事件处理结果
 */
export interface NotificationEventHandleResult {
  /**
   * 处理是否成功
   */
  success: boolean;
  
  /**
   * 事件ID
   */
  eventId: string;
  
  /**
   * 处理时间
   */
  handledAt: Date;
  
  /**
   * 处理器标识
   */
  handlerId: string;
  
  /**
   * 处理耗时（毫秒）
   */
  duration: number;
  
  /**
   * 错误信息
   */
  error?: string;
  
  /**
   * 处理结果数据
   */
  result?: any;
}

/**
 * 事件映射工具类
 * 用于在通用事件和通知事件之间进行转换
 */
export class NotificationEventMapper {
  /**
   * 将通用警告事件映射为通知警告事件
   */
  static mapGenericToNotification(
    genericEvent: GenericAlertEvent
  ): NotificationEvent {
    const baseEvent: BaseNotificationEvent = {
      id: genericEvent.correlationId,
      type: this.mapEventType(genericEvent.eventType),
      timestamp: genericEvent.timestamp,
      correlationId: genericEvent.correlationId,
      source: 'alert.system',
      metadata: genericEvent.eventData,
    };
    
    switch (genericEvent.eventType) {
      case GenericAlertEventType.FIRED:
        return {
          ...baseEvent,
          type: NotificationEventType.ALERT_FIRED,
          alert: this.mapGenericAlert(genericEvent.alert),
          rule: this.mapGenericRule(genericEvent.rule),
          context: this.mapGenericContext(genericEvent.context),
        } as NotificationAlertFiredEvent;
        
      case GenericAlertEventType.RESOLVED:
        return {
          ...baseEvent,
          type: NotificationEventType.ALERT_RESOLVED,
          alert: this.mapGenericAlert(genericEvent.alert),
          resolvedAt: genericEvent.eventData?.resolvedAt || new Date(),
          resolvedBy: genericEvent.eventData?.resolvedBy,
          comment: genericEvent.eventData?.resolutionComment,
        } as NotificationAlertResolvedEvent;
        
      case GenericAlertEventType.ACKNOWLEDGED:
        return {
          ...baseEvent,
          type: NotificationEventType.ALERT_ACKNOWLEDGED,
          alert: this.mapGenericAlert(genericEvent.alert),
          acknowledgedBy: genericEvent.eventData?.acknowledgedBy || 'system',
          acknowledgedAt: genericEvent.eventData?.acknowledgedAt || new Date(),
          comment: genericEvent.eventData?.acknowledgmentComment,
        } as NotificationAlertAcknowledgedEvent;
        
      case GenericAlertEventType.SUPPRESSED:
        return {
          ...baseEvent,
          type: NotificationEventType.ALERT_SUPPRESSED,
          alert: this.mapGenericAlert(genericEvent.alert),
          suppressedBy: genericEvent.eventData?.suppressedBy || 'system',
          suppressedAt: genericEvent.eventData?.suppressedAt || new Date(),
          suppressionDuration: genericEvent.eventData?.suppressionDuration || 3600,
          reason: genericEvent.eventData?.suppressionReason,
        } as NotificationAlertSuppressedEvent;
        
      case GenericAlertEventType.ESCALATED:
        return {
          ...baseEvent,
          type: NotificationEventType.ALERT_ESCALATED,
          alert: this.mapGenericAlert(genericEvent.alert),
          previousSeverity: this.mapGenericSeverity(genericEvent.eventData?.previousSeverity),
          newSeverity: this.mapGenericSeverity(genericEvent.eventData?.newSeverity),
          escalatedAt: genericEvent.eventData?.escalatedAt || new Date(),
          escalationReason: genericEvent.eventData?.escalationReason,
        } as NotificationAlertEscalatedEvent;
        
      default:
        throw new Error(`Unsupported generic event type: ${genericEvent.eventType}`);
    }
  }
  
  /**
   * 映射事件类型
   */
  private static mapEventType(type: GenericAlertEventType): NotificationEventType {
    const typeMap = {
      [GenericAlertEventType.FIRED]: NotificationEventType.ALERT_FIRED,
      [GenericAlertEventType.RESOLVED]: NotificationEventType.ALERT_RESOLVED,
      [GenericAlertEventType.ACKNOWLEDGED]: NotificationEventType.ALERT_ACKNOWLEDGED,
      [GenericAlertEventType.SUPPRESSED]: NotificationEventType.ALERT_SUPPRESSED,
      [GenericAlertEventType.ESCALATED]: NotificationEventType.ALERT_ESCALATED,
    };
    return typeMap[type];
  }
  
  /**
   * 映射警告数据
   */
  private static mapGenericAlert(alert: GenericAlertEvent['alert']): NotificationAlert {
    return {
      id: alert.id,
      severity: this.mapGenericSeverity(alert.severity),
      status: this.mapGenericStatus(alert.status),
      metric: alert.metric,
      description: alert.description,
      value: alert.value,
      threshold: alert.threshold,
      tags: alert.tags,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
  
  /**
   * 映射规则数据
   */
  private static mapGenericRule(rule: GenericAlertEvent['rule']): NotificationAlertRule {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      metric: rule.metric,
      operator: this.mapGenericOperator(rule.operator),
      threshold: rule.threshold,
      duration: rule.duration,
      severity: NotificationSeverity.MEDIUM, // 使用默认严重程度，规则本身没有严重程度
      enabled: rule.enabled,
      cooldown: rule.cooldown,
      channels: rule.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        enabled: channel.enabled,
        config: channel.config,
        retryCount: channel.retryCount,
        timeout: channel.timeout,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      tags: rule.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  /**
   * 映射上下文数据
   */
  private static mapGenericContext(context: GenericAlertEvent['context']): NotificationAlertContext {
    return {
      metricValue: context.metricValue,
      threshold: context.threshold,
      duration: context.duration,
      operator: this.mapGenericOperator(context.operator),
      evaluatedAt: context.evaluatedAt,
      dataPoints: context.dataPoints,
      metadata: context.metadata,
    };
  }
  
  /**
   * 映射严重程度
   */
  private static mapGenericSeverity(severity: GenericAlertSeverity): NotificationSeverity {
    const severityMap = {
      [GenericAlertSeverity.LOW]: NotificationSeverity.LOW,
      [GenericAlertSeverity.MEDIUM]: NotificationSeverity.MEDIUM,
      [GenericAlertSeverity.HIGH]: NotificationSeverity.HIGH,
      [GenericAlertSeverity.CRITICAL]: NotificationSeverity.CRITICAL,
    };
    return severityMap[severity] || NotificationSeverity.LOW;
  }

  /**
   * 映射状态
   */
  private static mapGenericStatus(status: GenericAlertStatus): NotificationAlertStatus {
    const statusMap = {
      [GenericAlertStatus.ACTIVE]: NotificationAlertStatus.ACTIVE,
      [GenericAlertStatus.RESOLVED]: NotificationAlertStatus.RESOLVED,
      [GenericAlertStatus.ACKNOWLEDGED]: NotificationAlertStatus.ACKNOWLEDGED,
      [GenericAlertStatus.SUPPRESSED]: NotificationAlertStatus.SUPPRESSED,
    };
    return statusMap[status] || NotificationAlertStatus.ACTIVE;
  }

  /**
   * 映射操作符
   */
  private static mapGenericOperator(operator: string): NotificationOperator {
    const operatorMap = {
      'gt': NotificationOperator.GT,
      'lt': NotificationOperator.LT,
      'gte': NotificationOperator.GTE,
      'lte': NotificationOperator.LTE,
      'eq': NotificationOperator.EQ,
      'ne': NotificationOperator.NE,
      'contains': NotificationOperator.CONTAINS,
      'not_contains': NotificationOperator.NOT_CONTAINS,
    };
    return operatorMap[operator] || NotificationOperator.GT;
  }
}