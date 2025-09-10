/**
 * Alert事件监听器
 * 🎯 监听Alert模块发出的事件，触发相应的通知发送
 * 
 * @description 实现Alert和Notification模块的事件驱动解耦
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { createLogger } from '@app/config/logger.config';

// 导入Alert事件类型
import {
  AlertFiredEvent,
  AlertResolvedEvent,
  AlertAcknowledgedEvent,
  AlertSuppressedEvent,
  AlertEscalatedEvent,
  ALERT_EVENTS
} from '../../alert/events/alert.events';

// 导入通知服务
import { NotificationService } from '../services/notification.service';

@Injectable()
export class AlertEventListener {
  private readonly logger = createLogger('AlertEventListener');

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 处理警告触发事件
   * 当新警告被触发时，发送相应通知
   */
  @OnEvent(ALERT_EVENTS.FIRED)
  async handleAlertFired(event: AlertFiredEvent): Promise<void> {
    this.logger.debug('处理警告触发事件', {
      alertId: event.alert.id,
      ruleId: event.rule.id,
      severity: event.alert.severity,
      metric: event.alert.metric,
      value: event.context.metricValue,
      threshold: event.context.threshold,
    });

    try {
      // 根据警告规则配置的通知渠道发送通知
      await this.notificationService.sendAlertNotifications(
        event.alert,
        event.rule,
        event.context
      );

      this.logger.log('警告触发通知发送成功', {
        alertId: event.alert.id,
        ruleId: event.rule.id,
      });
    } catch (error) {
      this.logger.error('警告触发通知发送失败', {
        alertId: event.alert.id,
        ruleId: event.rule.id,
        error: error.message,
      });
      // 通知发送失败不应该影响警告本身的处理
      // 这里可以考虑添加重试机制或者记录到失败队列
    }
  }

  /**
   * 处理警告解决事件
   * 当警告被解决时，发送恢复通知
   */
  @OnEvent(ALERT_EVENTS.RESOLVED)
  async handleAlertResolved(event: AlertResolvedEvent): Promise<void> {
    this.logger.debug('处理警告解决事件', {
      alertId: event.alert.id,
      resolvedAt: event.resolvedAt,
      resolvedBy: event.resolvedBy,
    });

    try {
      await this.notificationService.sendResolutionNotificationsLegacy(
        event.alert,
        event.resolvedAt,
        event.resolvedBy,
        event.comment
      );

      this.logger.log('警告解决通知发送成功', {
        alertId: event.alert.id,
      });
    } catch (error) {
      this.logger.error('警告解决通知发送失败', {
        alertId: event.alert.id,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告确认事件
   * 当警告被确认时，发送确认通知
   */
  @OnEvent(ALERT_EVENTS.ACKNOWLEDGED)
  async handleAlertAcknowledged(event: AlertAcknowledgedEvent): Promise<void> {
    this.logger.debug('处理警告确认事件', {
      alertId: event.alert.id,
      acknowledgedBy: event.acknowledgedBy,
      acknowledgedAt: event.acknowledgedAt,
    });

    try {
      await this.notificationService.sendAcknowledgmentNotificationsLegacy(
        event.alert,
        event.acknowledgedBy,
        event.acknowledgedAt,
        event.comment
      );

      this.logger.log('警告确认通知发送成功', {
        alertId: event.alert.id,
      });
    } catch (error) {
      this.logger.error('警告确认通知发送失败', {
        alertId: event.alert.id,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告抑制事件
   * 当警告被抑制时，发送抑制通知
   */
  @OnEvent(ALERT_EVENTS.SUPPRESSED)
  async handleAlertSuppressed(event: AlertSuppressedEvent): Promise<void> {
    this.logger.debug('处理警告抑制事件', {
      alertId: event.alert.id,
      suppressedBy: event.suppressedBy,
      suppressionDuration: event.suppressionDuration,
    });

    try {
      await this.notificationService.sendSuppressionNotificationsLegacy(
        event.alert,
        event.suppressedBy,
        event.suppressedAt,
        event.suppressionDuration,
        event.reason
      );

      this.logger.log('警告抑制通知发送成功', {
        alertId: event.alert.id,
      });
    } catch (error) {
      this.logger.error('警告抑制通知发送失败', {
        alertId: event.alert.id,
        error: error.message,
      });
    }
  }

  /**
   * 处理警告升级事件
   * 当警告严重程度升级时，发送升级通知
   */
  @OnEvent(ALERT_EVENTS.ESCALATED)
  async handleAlertEscalated(event: AlertEscalatedEvent): Promise<void> {
    this.logger.debug('处理警告升级事件', {
      alertId: event.alert.id,
      previousSeverity: event.previousSeverity,
      newSeverity: event.newSeverity,
      escalatedAt: event.escalatedAt,
    });

    try {
      await this.notificationService.sendEscalationNotificationsLegacy(
        event.alert,
        event.previousSeverity,
        event.newSeverity,
        event.escalatedAt,
        event.escalationReason
      );

      this.logger.log('警告升级通知发送成功', {
        alertId: event.alert.id,
        newSeverity: event.newSeverity,
      });
    } catch (error) {
      this.logger.error('警告升级通知发送失败', {
        alertId: event.alert.id,
        error: error.message,
      });
    }
  }
}