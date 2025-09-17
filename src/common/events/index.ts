/**
 * Common Events Module
 * 🎯 统一导出所有通用事件接口
 *
 * @description 为跨模块事件通信提供标准化接口
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

// 通用警告事件接口
export {
  GenericAlertSeverity,
  GenericAlertStatus,
  GenericAlertEventType,
} from "./generic-alert-event.interface";
export type {
  GenericNotificationChannel,
  GenericAlert,
  GenericAlertRule,
  GenericAlertContext,
  GenericAlertEvent,
  GenericAlertEventResult,
  GenericAlertEventHandler,
} from "./generic-alert-event.interface";

// 事件总线接口
export type {
  EventBusMessage,
  EventHandleResult,
  EventHandler,
  EventBus,
  EventBusConfig,
} from "./event-bus.interface";

// 类型工具
import type { GenericAlertEvent } from "./generic-alert-event.interface";
import type { EventBusMessage } from "./event-bus.interface";

export type AlertEventPayload = GenericAlertEvent;
export type NotificationEventPayload = EventBusMessage<any>;

// 常量导出 - 直接定义避免循环导入
export const EVENT_TYPES = {
  ALERT: {
    FIRED: "alert.fired",
    RESOLVED: "alert.resolved",
    ACKNOWLEDGED: "alert.acknowledged",
    SUPPRESSED: "alert.suppressed",
    ESCALATED: "alert.escalated",
  },
  NOTIFICATION: {
    SENT: "notification.sent",
    FAILED: "notification.failed",
    DELIVERED: "notification.delivered",
    CHANNEL_TESTED: "notification.channel_tested",
  },
  SYSTEM: {
    HEALTH_CHECK: "system.health_check",
    MAINTENANCE: "system.maintenance",
    SHUTDOWN: "system.shutdown",
  },
} as const;

export const GENERIC_EVENT_TYPES = {
  ...EVENT_TYPES,
  GENERIC_ALERT: {
    FIRED: "generic.alert.fired",
    RESOLVED: "generic.alert.resolved",
    ACKNOWLEDGED: "generic.alert.acknowledged",
    SUPPRESSED: "generic.alert.suppressed",
    ESCALATED: "generic.alert.escalated",
  },
} as const;
