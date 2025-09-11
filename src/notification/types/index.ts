/**
 * Notification Types 统一导出
 * 🎯 通知模块的所有类型定义统一入口
 * 
 * @description 包含独立的警告类型、事件类型和原有的通知类型
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

// 原有通知类型（保持向后兼容）
export * from './notification.types';

// 独立警告类型（替代Alert模块依赖）
export {
  NotificationSeverity,
  NotificationAlertStatus,
  NotificationOperator,
  NotificationAlert,
  NotificationAlertRule,
  NotificationAlertChannel,
  NotificationAlertContext,
  NotificationEventData,
  SEVERITY_COLORS,
  SEVERITY_PRIORITY,
  NotificationAlertTypeUtil,
} from './notification-alert.types';

// 独立事件类型（替代Alert事件依赖）
export {
  NotificationEventType,
  BaseNotificationEvent,
  NotificationAlertFiredEvent,
  NotificationAlertResolvedEvent,
  NotificationAlertAcknowledgedEvent,
  NotificationAlertSuppressedEvent,
  NotificationAlertEscalatedEvent,
  NotificationSentEvent,
  NotificationFailedEvent,
  NotificationChannelTestedEvent,
  NotificationEvent,
  NotificationEventHandleResult,
  NotificationEventMapper,
} from './notification-event.types';

