/**
 * 通知事件定义
 * 🎯 实现事件驱动架构的核心事件类型
 *
 * @description 支持异步、松耦合的通知处理流程
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import {
  NotificationPriority,
  NotificationChannelType,
  NotificationStatus,
} from "../types/notification.types";

/**
 * 通知事件类型枚举
 */
export enum NotificationEventType {
  // 核心事件
  NOTIFICATION_REQUESTED = "notification.requested",
  NOTIFICATION_SENT = "notification.sent",
  NOTIFICATION_DELIVERED = "notification.delivered",
  NOTIFICATION_FAILED = "notification.failed",
  NOTIFICATION_RETRIED = "notification.retried",

  // 批量事件
  BATCH_NOTIFICATION_STARTED = "notification.batch.started",
  BATCH_NOTIFICATION_COMPLETED = "notification.batch.completed",
  BATCH_NOTIFICATION_FAILED = "notification.batch.failed",

  // 历史事件
  NOTIFICATION_HISTORY_RECORDED = "notification.history.recorded",
  NOTIFICATION_HISTORY_QUERIED = "notification.history.queried",

  // 系统事件
  NOTIFICATION_SYSTEM_ERROR = "notification.system.error",
  NOTIFICATION_CHANNEL_ERROR = "notification.channel.error",
}

/**
 * 通知事件基类
 */
export abstract class NotificationEvent {
  /**
   * 事件类型
   */
  abstract readonly eventType: NotificationEventType;

  /**
   * 事件ID，用于追踪和去重
   */
  readonly eventId: string;

  /**
   * 事件时间戳
   */
  readonly timestamp: Date;

  /**
   * 关联的警告ID
   */
  readonly alertId: string;

  /**
   * 事件元数据
   */
  readonly metadata: Record<string, any>;

  constructor(alertId: string, metadata: Record<string, any> = {}) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
    this.alertId = alertId;
    this.metadata = {
      ...metadata,
      eventSource: "NotificationModule",
      eventVersion: "1.0",
    };
  }
}

/**
 * 通知请求事件
 * 当有新的通知请求时触发
 */
export class NotificationRequestedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_REQUESTED;

  constructor(
    alertId: string,
    public readonly requestId: string,
    public readonly severity: NotificationPriority,
    public readonly title: string,
    public readonly message: string,
    public readonly channelTypes: NotificationChannelType[],
    public readonly recipients?: string[],
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      requestId,
      severity,
      channelCount: channelTypes.length,
    });
  }
}

/**
 * 通知发送成功事件
 */
export class NotificationSentEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_SENT;

  constructor(
    alertId: string,
    public readonly notificationId: string,
    public readonly channelId: string,
    public readonly channelType: NotificationChannelType,
    public readonly recipient: string,
    public readonly sentAt: Date,
    public readonly duration: number,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      notificationId,
      channelId,
      channelType,
      recipient,
      duration,
    });
  }
}

/**
 * 通知投递成功事件
 */
export class NotificationDeliveredEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_DELIVERED;

  constructor(
    alertId: string,
    public readonly notificationId: string,
    public readonly channelType: NotificationChannelType,
    public readonly deliveredAt: Date,
    public readonly confirmationId?: string,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      notificationId,
      channelType,
      confirmationId,
    });
  }
}

/**
 * 通知发送失败事件
 */
export class NotificationFailedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_FAILED;

  constructor(
    alertId: string,
    public readonly notificationId: string,
    public readonly channelType: NotificationChannelType,
    public readonly error: string,
    public readonly retryCount: number,
    public readonly failedAt: Date,
    public readonly willRetry: boolean = false,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      notificationId,
      channelType,
      error,
      retryCount,
      willRetry,
    });
  }
}

/**
 * 通知重试事件
 */
export class NotificationRetriedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_RETRIED;

  constructor(
    alertId: string,
    public readonly notificationId: string,
    public readonly channelType: NotificationChannelType,
    public readonly retryAttempt: number,
    public readonly previousError: string,
    public readonly retriedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      notificationId,
      channelType,
      retryAttempt,
      previousError,
    });
  }
}

/**
 * 批量通知开始事件
 */
export class BatchNotificationStartedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.BATCH_NOTIFICATION_STARTED;

  constructor(
    alertId: string,
    public readonly batchId: string,
    public readonly requestCount: number,
    public readonly concurrency: number,
    public readonly startedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      batchId,
      requestCount,
      concurrency,
    });
  }
}

/**
 * 批量通知完成事件
 */
export class BatchNotificationCompletedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.BATCH_NOTIFICATION_COMPLETED;

  constructor(
    alertId: string,
    public readonly batchId: string,
    public readonly successCount: number,
    public readonly failureCount: number,
    public readonly totalDuration: number,
    public readonly completedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      batchId,
      successCount,
      failureCount,
      totalDuration,
      successRate: successCount / (successCount + failureCount),
    });
  }
}

/**
 * 批量通知失败事件
 */
export class BatchNotificationFailedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.BATCH_NOTIFICATION_FAILED;

  constructor(
    alertId: string,
    public readonly batchId: string,
    public readonly error: string,
    public readonly processedCount: number,
    public readonly totalCount: number,
    public readonly failedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      batchId,
      error,
      processedCount,
      totalCount,
    });
  }
}

/**
 * 通知历史记录事件
 */
export class NotificationHistoryRecordedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_HISTORY_RECORDED;

  constructor(
    alertId: string,
    public readonly historyId: string,
    public readonly notificationId: string,
    public readonly status: NotificationStatus,
    public readonly recordedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      historyId,
      notificationId,
      status,
    });
  }
}

/**
 * 通知历史查询事件
 */
export class NotificationHistoryQueriedEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_HISTORY_QUERIED;

  constructor(
    alertId: string,
    public readonly queryId: string,
    public readonly resultCount: number,
    public readonly queryDuration: number,
    public readonly queriedAt: Date,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      queryId,
      resultCount,
      queryDuration,
    });
  }
}

/**
 * 通知系统错误事件
 */
export class NotificationSystemErrorEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_SYSTEM_ERROR;

  constructor(
    alertId: string,
    public readonly component: string,
    public readonly error: string,
    public readonly stackTrace?: string,
    public readonly context?: Record<string, any>,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      component,
      error,
      context,
      severity: "error",
    });
  }
}

/**
 * 通知渠道错误事件
 */
export class NotificationChannelErrorEvent extends NotificationEvent {
  readonly eventType = NotificationEventType.NOTIFICATION_CHANNEL_ERROR;

  constructor(
    alertId: string,
    public readonly channelType: NotificationChannelType,
    public readonly channelId: string,
    public readonly error: string,
    public readonly isChannelDown: boolean = false,
    metadata: Record<string, any> = {},
  ) {
    super(alertId, {
      ...metadata,
      channelType,
      channelId,
      error,
      isChannelDown,
    });
  }
}

/**
 * 事件工厂类
 * 提供便捷的事件创建方法
 */
export class NotificationEventFactory {
  /**
   * 创建通知请求事件
   */
  static createNotificationRequested(
    alertId: string,
    requestId: string,
    severity: NotificationPriority,
    title: string,
    message: string,
    channelTypes: NotificationChannelType[],
    recipients?: string[],
    metadata?: Record<string, any>,
  ): NotificationRequestedEvent {
    return new NotificationRequestedEvent(
      alertId,
      requestId,
      severity,
      title,
      message,
      channelTypes,
      recipients,
      metadata,
    );
  }

  /**
   * 创建通知发送成功事件
   */
  static createNotificationSent(
    alertId: string,
    notificationId: string,
    channelId: string,
    channelType: NotificationChannelType,
    recipient: string,
    duration: number,
    metadata?: Record<string, any>,
  ): NotificationSentEvent {
    return new NotificationSentEvent(
      alertId,
      notificationId,
      channelId,
      channelType,
      recipient,
      new Date(),
      duration,
      metadata,
    );
  }

  /**
   * 创建通知失败事件
   */
  static createNotificationFailed(
    alertId: string,
    notificationId: string,
    channelType: NotificationChannelType,
    error: string,
    retryCount: number,
    willRetry: boolean = false,
    metadata?: Record<string, any>,
  ): NotificationFailedEvent {
    return new NotificationFailedEvent(
      alertId,
      notificationId,
      channelType,
      error,
      retryCount,
      new Date(),
      willRetry,
      metadata,
    );
  }

  /**
   * 创建批量通知完成事件
   */
  static createBatchCompleted(
    alertId: string,
    batchId: string,
    successCount: number,
    failureCount: number,
    totalDuration: number,
    metadata?: Record<string, any>,
  ): BatchNotificationCompletedEvent {
    return new BatchNotificationCompletedEvent(
      alertId,
      batchId,
      successCount,
      failureCount,
      totalDuration,
      new Date(),
      metadata,
    );
  }
}

/**
 * 事件类型守卫
 */
export class NotificationEventTypeGuards {
  static isNotificationRequestedEvent(
    event: NotificationEvent,
  ): event is NotificationRequestedEvent {
    return event.eventType === NotificationEventType.NOTIFICATION_REQUESTED;
  }

  static isNotificationSentEvent(
    event: NotificationEvent,
  ): event is NotificationSentEvent {
    return event.eventType === NotificationEventType.NOTIFICATION_SENT;
  }

  static isNotificationFailedEvent(
    event: NotificationEvent,
  ): event is NotificationFailedEvent {
    return event.eventType === NotificationEventType.NOTIFICATION_FAILED;
  }

  static isBatchEvent(event: NotificationEvent): boolean {
    return [
      NotificationEventType.BATCH_NOTIFICATION_STARTED,
      NotificationEventType.BATCH_NOTIFICATION_COMPLETED,
      NotificationEventType.BATCH_NOTIFICATION_FAILED,
    ].includes(event.eventType);
  }

  static isHistoryEvent(event: NotificationEvent): boolean {
    return [
      NotificationEventType.NOTIFICATION_HISTORY_RECORDED,
      NotificationEventType.NOTIFICATION_HISTORY_QUERIED,
    ].includes(event.eventType);
  }

  static isErrorEvent(event: NotificationEvent): boolean {
    return [
      NotificationEventType.NOTIFICATION_FAILED,
      NotificationEventType.BATCH_NOTIFICATION_FAILED,
      NotificationEventType.NOTIFICATION_SYSTEM_ERROR,
      NotificationEventType.NOTIFICATION_CHANNEL_ERROR,
    ].includes(event.eventType);
  }
}
