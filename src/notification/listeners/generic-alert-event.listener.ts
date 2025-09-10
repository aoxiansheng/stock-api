/**
 * 通用警告事件监听器
 * 🎯 监听通用警告事件，触发相应的通知发送
 * 
 * @description 实现完全解耦的事件驱动架构，不依赖Alert模块
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { createLogger } from '@app/config/logger.config';

// 导入通用事件接口
import {
  GenericAlertEvent,
  GenericAlertEventType,
  GENERIC_EVENT_TYPES,
} from '@common/events';

// 导入通知模块独立类型
import {
  NotificationEventMapper,
  NotificationEvent,
  NotificationEventType,
} from '../types/notification-event.types';

// 导入通知服务
import { NotificationService } from '../services/notification.service';

/**
 * 通用警告事件监听器
 * 替代原有的AlertEventListener，实现完全解耦
 */
@Injectable()
export class GenericAlertEventListener {
  private readonly logger = createLogger('GenericAlertEventListener');

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 处理警告触发事件
   * 监听通用警告触发事件，发送相应通知
   */
  @OnEvent(GENERIC_EVENT_TYPES.GENERIC_ALERT.FIRED)
  async handleAlertFired(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('处理警告触发事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      severity: genericEvent.alert.severity,
      metric: genericEvent.alert.metric,
      value: genericEvent.context.metricValue,
      threshold: genericEvent.context.threshold,
      correlationId: genericEvent.correlationId,
    });

    try {
      // 将通用事件映射为通知事件
      const notificationEvent = NotificationEventMapper.mapGenericToNotification(genericEvent);
      
      if (notificationEvent.type === NotificationEventType.ALERT_FIRED) {
        // 根据警告规则配置的通知渠道发送通知
        await this.notificationService.sendAlertNotifications(
          notificationEvent.alert,
          notificationEvent.rule,
          notificationEvent.context
        );

        this.logger.log('警告触发通知发送成功', {
          alertId: notificationEvent.alert.id,
          ruleId: notificationEvent.rule.id,
          correlationId: genericEvent.correlationId,
        });
      }
    } catch (error) {
      this.logger.error('警告触发通知发送失败', {
        alertId: genericEvent.alert.id,
        correlationId: genericEvent.correlationId,
        error: error.message,
        stack: error.stack,
      });
      // 通知发送失败不应该影响警告本身的处理
      // 这里可以考虑添加重试机制或者记录到失败队列
    }
  }

  /**
   * 处理警告解决事件
   * 监听通用警告解决事件，发送恢复通知
   */
  @OnEvent(GENERIC_EVENT_TYPES.GENERIC_ALERT.RESOLVED)
  async handleAlertResolved(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('处理警告解决事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      resolvedAt: genericEvent.eventData?.resolvedAt,
      resolvedBy: genericEvent.eventData?.resolvedBy,
      correlationId: genericEvent.correlationId,
    });

    try {
      const notificationEvent = NotificationEventMapper.mapGenericToNotification(genericEvent);
      
      if (notificationEvent.type === NotificationEventType.ALERT_RESOLVED) {
        await this.notificationService.sendResolutionNotifications(
          notificationEvent.alert,
          notificationEvent.resolvedAt,
          notificationEvent.resolvedBy,
          notificationEvent.comment
        );

        this.logger.log('警告解决通知发送成功', {
          alertId: notificationEvent.alert.id,
          correlationId: genericEvent.correlationId,
        });
      }
    } catch (error) {
      this.logger.error('警告解决通知发送失败', {
        alertId: genericEvent.alert.id,
        correlationId: genericEvent.correlationId,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告确认事件
   * 监听通用警告确认事件，发送确认通知
   */
  @OnEvent(GENERIC_EVENT_TYPES.GENERIC_ALERT.ACKNOWLEDGED)
  async handleAlertAcknowledged(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('处理警告确认事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      acknowledgedBy: genericEvent.eventData?.acknowledgedBy,
      acknowledgedAt: genericEvent.eventData?.acknowledgedAt,
      correlationId: genericEvent.correlationId,
    });

    try {
      const notificationEvent = NotificationEventMapper.mapGenericToNotification(genericEvent);
      
      if (notificationEvent.type === NotificationEventType.ALERT_ACKNOWLEDGED) {
        await this.notificationService.sendAcknowledgmentNotifications(
          notificationEvent.alert,
          notificationEvent.acknowledgedBy,
          notificationEvent.acknowledgedAt,
          notificationEvent.comment
        );

        this.logger.log('警告确认通知发送成功', {
          alertId: notificationEvent.alert.id,
          correlationId: genericEvent.correlationId,
        });
      }
    } catch (error) {
      this.logger.error('警告确认通知发送失败', {
        alertId: genericEvent.alert.id,
        correlationId: genericEvent.correlationId,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告抑制事件
   * 监听通用警告抑制事件，发送抑制通知
   */
  @OnEvent(GENERIC_EVENT_TYPES.GENERIC_ALERT.SUPPRESSED)
  async handleAlertSuppressed(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('处理警告抑制事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      suppressedBy: genericEvent.eventData?.suppressedBy,
      suppressionDuration: genericEvent.eventData?.suppressionDuration,
      correlationId: genericEvent.correlationId,
    });

    try {
      const notificationEvent = NotificationEventMapper.mapGenericToNotification(genericEvent);
      
      if (notificationEvent.type === NotificationEventType.ALERT_SUPPRESSED) {
        await this.notificationService.sendSuppressionNotifications(
          notificationEvent.alert,
          notificationEvent.suppressedBy,
          notificationEvent.suppressedAt,
          notificationEvent.suppressionDuration,
          notificationEvent.reason
        );

        this.logger.log('警告抑制通知发送成功', {
          alertId: notificationEvent.alert.id,
          correlationId: genericEvent.correlationId,
        });
      }
    } catch (error) {
      this.logger.error('警告抑制通知发送失败', {
        alertId: genericEvent.alert.id,
        correlationId: genericEvent.correlationId,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告升级事件
   * 监听通用警告升级事件，发送升级通知
   */
  @OnEvent(GENERIC_EVENT_TYPES.GENERIC_ALERT.ESCALATED)
  async handleAlertEscalated(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('处理警告升级事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      previousSeverity: genericEvent.eventData?.previousSeverity,
      newSeverity: genericEvent.eventData?.newSeverity,
      escalatedAt: genericEvent.eventData?.escalatedAt,
      correlationId: genericEvent.correlationId,
    });

    try {
      const notificationEvent = NotificationEventMapper.mapGenericToNotification(genericEvent);
      
      if (notificationEvent.type === NotificationEventType.ALERT_ESCALATED) {
        await this.notificationService.sendEscalationNotifications(
          notificationEvent.alert,
          notificationEvent.previousSeverity,
          notificationEvent.newSeverity,
          notificationEvent.escalatedAt,
          notificationEvent.escalationReason
        );

        this.logger.log('警告升级通知发送成功', {
          alertId: notificationEvent.alert.id,
          newSeverity: notificationEvent.newSeverity,
          correlationId: genericEvent.correlationId,
        });
      }
    } catch (error) {
      this.logger.error('警告升级通知发送失败', {
        alertId: genericEvent.alert.id,
        correlationId: genericEvent.correlationId,
        error: error.message,
      });
    }
  }

  /**
   * 通用事件处理入口
   * 可以处理所有类型的通用警告事件
   */
  @OnEvent('generic.alert.*')
  async handleGenericAlertEvent(genericEvent: GenericAlertEvent): Promise<void> {
    this.logger.debug('收到通用警告事件', {
      eventType: genericEvent.eventType,
      alertId: genericEvent.alert.id,
      correlationId: genericEvent.correlationId,
    });

    // 根据事件类型分发到具体的处理方法
    switch (genericEvent.eventType) {
      case GenericAlertEventType.FIRED:
        await this.handleAlertFired(genericEvent);
        break;
      case GenericAlertEventType.RESOLVED:
        await this.handleAlertResolved(genericEvent);
        break;
      case GenericAlertEventType.ACKNOWLEDGED:
        await this.handleAlertAcknowledged(genericEvent);
        break;
      case GenericAlertEventType.SUPPRESSED:
        await this.handleAlertSuppressed(genericEvent);
        break;
      case GenericAlertEventType.ESCALATED:
        await this.handleAlertEscalated(genericEvent);
        break;
      default:
        this.logger.warn('未处理的事件类型', {
          eventType: genericEvent.eventType,
          alertId: genericEvent.alert.id,
          correlationId: genericEvent.correlationId,
        });
    }
  }

  /**
   * 获取支持的事件类型
   */
  getSupportedEventTypes(): string[] {
    return [
      GENERIC_EVENT_TYPES.GENERIC_ALERT.FIRED,
      GENERIC_EVENT_TYPES.GENERIC_ALERT.RESOLVED,
      GENERIC_EVENT_TYPES.GENERIC_ALERT.ACKNOWLEDGED,
      GENERIC_EVENT_TYPES.GENERIC_ALERT.SUPPRESSED,
      GENERIC_EVENT_TYPES.GENERIC_ALERT.ESCALATED,
    ];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      return {
        status: 'healthy',
        details: {
          listenerName: 'GenericAlertEventListener',
          supportedEvents: this.getSupportedEventTypes(),
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