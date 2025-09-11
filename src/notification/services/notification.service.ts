/**
 * 通知服务
 * 🎯 负责通知的编排、发送和管理
 * 
 * @description 从Alert模块拆分出来的独立通知服务
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from '@nestjs/common';

import { createLogger } from '@appcore/config/logger.config';

// 导入Alert相关类型（用于接收事件数据）- 保持向后兼容
import { Alert, AlertRule, NotificationChannel as AlertNotificationChannel } from '../../alert/types/alert.types';
import { AlertContext } from '../../alert/events/alert.events';

// 导入独立类型和适配器服务
import {
  NotificationAlert,
  NotificationAlertRule,
  NotificationAlertContext,
  NotificationSeverity,
} from '../types/notification-alert.types';
import { NotificationAdapterService } from './notification-adapter.service';

// 导入通知发送器
import { 
  EmailSender, 
  WebhookSender, 
  SlackSender, 
  DingTalkSender, 
  LogSender
} from '../services/senders';

// 导入Notification类型
import {
  Notification,
  NotificationResult,
  BatchNotificationResult,
  NotificationChannel,
  NotificationChannelType,
  NotificationPriority,
} from '../types/notification.types';

// 导入常量
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_OPERATIONS,
} from '../constants/notification.constants';

@Injectable()
export class NotificationService {
  private readonly logger = createLogger('NotificationService');
  private readonly senders: Map<NotificationChannelType, any> = new Map();

  constructor(
    private readonly emailSender: EmailSender,
    private readonly webhookSender: WebhookSender,
    private readonly slackSender: SlackSender,
    private readonly dingtalkSender: DingTalkSender,
    private readonly logSender: LogSender,
    private readonly adapterService: NotificationAdapterService,
  ) {
    // 初始化发送器映射
    this.senders.set(NotificationChannelType.EMAIL, this.emailSender);
    this.senders.set(NotificationChannelType.WEBHOOK, this.webhookSender);
    this.senders.set(NotificationChannelType.SLACK, this.slackSender);
    this.senders.set(NotificationChannelType.DINGTALK, this.dingtalkSender);
    this.senders.set(NotificationChannelType.LOG, this.logSender);
    
    this.logger.debug(NOTIFICATION_MESSAGES.SENDERS_INITIALIZED, {
      senderCount: this.senders.size,
    });
  }

  /**
   * 发送警告触发通知（独立类型接口）
   * 使用notification模块独立的类型，避免Alert模块依赖
   */
  async sendAlertNotifications(
    alert: NotificationAlert,
    rule: NotificationAlertRule,
    context: NotificationAlertContext
  ): Promise<NotificationResult[]>;

  /**
   * 发送警告触发通知（原有接口 - 向后兼容）
   * 根据警告规则配置的通知渠道发送通知
   */
  async sendAlertNotifications(
    alert: Alert,
    rule: AlertRule,
    context: AlertContext
  ): Promise<NotificationResult[]>;

  /**
   * 发送警告触发通知 - 实现
   */
  async sendAlertNotifications(
    alert: Alert | NotificationAlert,
    rule: AlertRule | NotificationAlertRule,
    context: AlertContext | NotificationAlertContext
  ): Promise<NotificationResult[]> {
    // 检测类型并委派给相应的实现
    if (this.isIndependentType(alert, rule, context)) {
      // 使用独立类型的适配器服务
      return await this.adapterService.sendAlertNotifications(
        alert as NotificationAlert,
        rule as NotificationAlertRule,
        context as NotificationAlertContext
      );
    } else {
      // 使用原有的实现逻辑（向后兼容）
      return await this.sendAlertNotificationsLegacy(
        alert as Alert,
        rule as AlertRule,
        context as AlertContext
      );
    }
  }

  /**
   * 原有的发送逻辑（向后兼容）
   */
  private async sendAlertNotificationsLegacy(
    alert: Alert,
    rule: AlertRule,
    context: AlertContext
  ): Promise<NotificationResult[]> {
    const operation = NOTIFICATION_OPERATIONS.SEND_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      ruleId: rule.id,
      channels: rule.channels?.length || 0,
    });

    try {
      const results: NotificationResult[] = [];

      // 为每个配置的通知渠道发送通知
      if (rule.channels && rule.channels.length > 0) {
        for (const channel of rule.channels) {
          try {
            const result = await this.sendSingleNotification(
              alert,
              rule,
              context,
              channel
            );
            results.push(result);
          } catch (error) {
            this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
              alertId: alert.id,
              channelId: channel.id,
              error: error.message,
            });
            
            // 即使单个通知失败，也要继续发送其他通知
            results.push({
              success: false,
              channelId: channel.id || 'unknown',
              channelType: channel.type,
              error: error.message,
              sentAt: new Date(),
              duration: 0,
            });
          }
        }
      }

      this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
        alertId: alert.id,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
      });

      return results;
    } catch (error) {
      this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
        operation,
        alertId: alert.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发送警告解决通知（传统接口）
   */
  async sendResolutionNotificationsLegacy(
    alert: Alert,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告解决通知（传统接口）', {
      alertId: alert.id,
      resolvedBy,
    });

    // TODO: 实现解决通知发送逻辑
    // 这里需要获取原始规则的通知渠道配置
    return [];
  }

  /**
   * 发送警告确认通知
   */
  async sendAcknowledgmentNotificationsLegacy(
    alert: Alert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告确认通知', {
      alertId: alert.id,
      acknowledgedBy,
    });

    // TODO: 实现确认通知发送逻辑
    return [];
  }

  /**
   * 发送警告抑制通知
   */
  async sendSuppressionNotificationsLegacy(
    alert: Alert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告抑制通知', {
      alertId: alert.id,
      suppressedBy,
      suppressionDuration,
    });

    // TODO: 实现抑制通知发送逻辑
    return [];
  }

  /**
   * 发送警告升级通知
   */
  async sendEscalationNotificationsLegacy(
    alert: Alert,
    previousSeverity: string,
    newSeverity: string,
    escalatedAt: Date,
    escalationReason: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告升级通知（传统接口）', {
      alertId: alert.id,
      previousSeverity,
      newSeverity,
      escalationReason,
    });

    // TODO: 实现升级通知发送逻辑
    return [];
  }

  /**
   * 发送单个通知
   * @private
   */
  private async sendSingleNotification(
    alert: Alert,
    rule: AlertRule,
    context: AlertContext,
    channel: AlertNotificationChannel
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    this.logger.debug('发送单个通知', {
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
    });

    // TODO: 实现具体的通知发送逻辑
    // 1. 根据渠道类型选择对应的发送器
    // 2. 生成通知内容（使用模板）
    // 3. 调用发送器发送通知
    // 4. 记录发送结果和日志

    // 临时返回成功结果
    const duration = Date.now() - startTime;
    return {
      success: true,
      channelId: channel.id || 'unknown',
      channelType: channel.type,
      message: '通知发送成功（临时实现）',
      sentAt: new Date(),
      duration,
    };
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(
    notifications: Array<{
      alert: Alert;
      rule: AlertRule;
      context: AlertContext;
    }>
  ): Promise<BatchNotificationResult> {
    const operation = NOTIFICATION_OPERATIONS.SEND_BATCH_NOTIFICATIONS;
    
    this.logger.debug(NOTIFICATION_MESSAGES.BATCH_PROCESSING_STARTED, {
      operation,
      batchSize: notifications.length,
    });

    const startTime = Date.now();
    const results: NotificationResult[] = [];

    try {
      // 并行处理批量通知
      const promises = notifications.map(async ({ alert, rule, context }) => {
        try {
          return await this.sendAlertNotifications(alert, rule, context);
        } catch (error) {
          this.logger.error(NOTIFICATION_MESSAGES.BATCH_NOTIFICATION_FAILED, {
            alertId: alert.id,
            error: error.message,
          });
          return [];
        }
      });

      const batchResults = await Promise.all(promises);
      
      // 合并所有结果
      for (const resultList of batchResults) {
        results.push(...resultList);
      }

      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.debug(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_COMPLETED, {
        total: results.length,
        successful,
        failed,
        duration,
      });

      return {
        total: results.length,
        successful,
        failed,
        results,
        duration,
        summary: this.generateBatchSummary(results),
      };
    } catch (error) {
      this.logger.error(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_FAILED, {
        operation,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 生成批量结果摘要
   * @private
   */
  private generateBatchSummary(results: NotificationResult[]) {
    const byChannel: any = {};
    const byStatus: any = {};

    for (const result of results) {
      // 按渠道统计
      if (!byChannel[result.channelType]) {
        byChannel[result.channelType] = { total: 0, successful: 0, failed: 0 };
      }
      byChannel[result.channelType].total++;
      if (result.success) {
        byChannel[result.channelType].successful++;
      } else {
        byChannel[result.channelType].failed++;
      }

      // 按状态统计
      const status = result.success ? 'SENT' : 'FAILED';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    return { byChannel, byStatus };
  }

  /**
   * 测试通知渠道
   */
  async testNotificationChannel(
    channelType: NotificationChannelType,
    config: Record<string, any>,
    testMessage?: string
  ): Promise<boolean> {
    const operation = NOTIFICATION_OPERATIONS.TEST_CHANNEL;
    
    this.logger.debug(NOTIFICATION_MESSAGES.CHANNEL_TEST_STARTED, {
      operation,
      channelType,
    });

    try {
      const sender = this.senders.get(channelType);
      if (!sender) {
        throw new Error(`不支持的通知渠道类型: ${channelType}`);
      }

      // 使用发送器进行测试
      const result = await sender.test(config);

      const message = result
        ? NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED
        : NOTIFICATION_MESSAGES.CHANNEL_TEST_FAILED;
      
      this.logger.debug(message, { 
        operation,
        channelType,
        result 
      });
      
      return result;
    } catch (error) {
      this.logger.error(NOTIFICATION_MESSAGES.CHANNEL_TEST_FAILED, {
        operation,
        channelType,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 发送解决通知（独立类型接口）
   */
  async sendResolutionNotifications(
    alert: NotificationAlert,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): Promise<NotificationResult[]> {
    return await this.adapterService.sendResolutionNotifications(
      alert, resolvedAt, resolvedBy, comment
    );
  }

  /**
   * 发送确认通知（独立类型接口）
   */
  async sendAcknowledgmentNotifications(
    alert: NotificationAlert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<NotificationResult[]> {
    return await this.adapterService.sendAcknowledgmentNotifications(
      alert, acknowledgedBy, acknowledgedAt, comment
    );
  }

  /**
   * 发送抑制通知（独立类型接口）
   */
  async sendSuppressionNotifications(
    alert: NotificationAlert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<NotificationResult[]> {
    return await this.adapterService.sendSuppressionNotifications(
      alert, suppressedBy, suppressedAt, suppressionDuration, reason
    );
  }

  /**
   * 发送升级通知（独立类型接口）
   */
  async sendEscalationNotifications(
    alert: NotificationAlert,
    previousSeverity: NotificationSeverity,
    newSeverity: NotificationSeverity,
    escalatedAt: Date,
    escalationReason?: string
  ): Promise<NotificationResult[]> {
    return await this.adapterService.sendEscalationNotifications(
      alert, previousSeverity, newSeverity, escalatedAt, escalationReason
    );
  }

  /**
   * 检测是否为独立类型
   * 通过检查对象的特征属性来判断类型
   */
  private isIndependentType(
    alert: Alert | NotificationAlert,
    rule: AlertRule | NotificationAlertRule,
    context: AlertContext | NotificationAlertContext
  ): boolean {
    // 检查NotificationAlert的特征属性
    const isNotificationAlert = (
      alert &&
      typeof alert === 'object' &&
      'severity' in alert &&
      // NotificationSeverity是字符串枚举
      typeof (alert as any).severity === 'string' &&
      ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes((alert as any).severity)
    );

    // 检查NotificationAlertRule的特征属性
    const isNotificationRule = (
      rule &&
      typeof rule === 'object' &&
      'channels' in rule &&
      Array.isArray(rule.channels) &&
      rule.channels.length > 0 &&
      // 检查channels的结构是否符合NotificationAlertChannel
      rule.channels.every((channel: any) => 
        channel &&
        typeof channel === 'object' &&
        'id' in channel &&
        'type' in channel &&
        'enabled' in channel &&
        'config' in channel
      )
    );

    // 检查NotificationAlertContext的特征属性
    const isNotificationContext = (
      context &&
      typeof context === 'object' &&
      'metricValue' in context &&
      'threshold' in context &&
      'evaluatedAt' in context &&
      (context as any).evaluatedAt instanceof Date
    );

    return isNotificationAlert && isNotificationRule && isNotificationContext;
  }

  /**
   * 获取支持的渠道类型
   */
  getSupportedChannelTypes(): NotificationChannelType[] {
    return Array.from(this.senders.keys());
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const adapterHealth = await this.adapterService.healthCheck();
      
      return {
        status: adapterHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: {
          serviceName: 'NotificationService',
          legacySenders: {
            count: this.senders.size,
            types: this.getSupportedChannelTypes(),
          },
          adapterService: adapterHealth,
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