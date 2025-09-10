/**
 * 通知服务适配器
 * 🎯 在新旧类型之间提供适配层，支持渐进式解耦迁移
 * 
 * @description 提供独立类型接口的同时兼容原有Alert类型接口
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

import { Injectable } from '@nestjs/common';

import { createLogger } from '@app/config/logger.config';

// 导入独立类型
import {
  NotificationAlert,
  NotificationAlertRule,
  NotificationAlertContext,
  NotificationSeverity,
} from '../types/notification-alert.types';

// 导入原有类型（保持兼容性）
import {
  Notification,
  NotificationResult,
  NotificationChannelType,
  NotificationPriority,
} from '../types/notification.types';

// 导入通知发送器
import { 
  EmailSender, 
  WebhookSender, 
  SlackSender, 
  DingTalkSender, 
  LogSender
} from './senders';

// 导入常量
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_OPERATIONS,
} from '../constants/notification.constants';

/**
 * 通知服务适配器
 * 使用独立类型接口，避免对Alert模块的直接依赖
 */
@Injectable()
export class NotificationAdapterService {
  private readonly logger = createLogger('NotificationAdapterService');
  private readonly senders: Map<NotificationChannelType, any> = new Map();

  constructor(
    private readonly emailSender: EmailSender,
    private readonly webhookSender: WebhookSender,
    private readonly slackSender: SlackSender,
    private readonly dingtalkSender: DingTalkSender,
    private readonly logSender: LogSender,
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
  ): Promise<NotificationResult[]> {
    const operation = NOTIFICATION_OPERATIONS.SEND_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      ruleId: rule.id,
      channels: rule.channels.length,
    });

    const results: NotificationResult[] = [];

    try {
      // 为每个启用的通知渠道发送通知
      const enabledChannels = rule.channels.filter(channel => channel.enabled);
      
      if (enabledChannels.length === 0) {
        this.logger.warn('没有启用的通知渠道', {
          alertId: alert.id,
          ruleId: rule.id,
        });
        return results;
      }

      // 创建通知消息
      const notification = this.createNotification(alert, rule, context);

      // 并行发送到所有启用的渠道
      const sendPromises = enabledChannels.map(channel => 
        this.sendToChannel(notification, channel)
      );

      const channelResults = await Promise.allSettled(sendPromises);
      
      // 处理发送结果
      channelResults.forEach((result, index) => {
        const channel = enabledChannels[index];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error('渠道发送失败', {
            channelId: channel.id,
            channelType: channel.type,
            error: result.reason.message,
          });
          
          results.push({
            success: false,
            channelId: channel.id,
            channelType: channel.type as NotificationChannelType,
            error: result.reason.message,
            sentAt: new Date(),
            duration: 0,
            message: `渠道 ${channel.name} 发送失败`,
          });
        }
      });

      this.logger.log('警告通知发送完成', {
        alertId: alert.id,
        ruleId: rule.id,
        totalChannels: enabledChannels.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });

      return results;

    } catch (error) {
      this.logger.error('发送警告通知时发生错误', {
        alertId: alert.id,
        ruleId: rule.id,
        error: error.message,
      });
      
      throw error;
    }
  }

  /**
   * 发送警告解决通知
   */
  async sendResolutionNotifications(
    alert: NotificationAlert,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告解决通知', {
      alertId: alert.id,
      resolvedAt,
      resolvedBy,
    });

    // TODO: 实现解决通知逻辑
    // 这里需要获取相关的规则信息或者从通知历史中获取渠道配置
    return [];
  }

  /**
   * 发送警告确认通知
   */
  async sendAcknowledgmentNotifications(
    alert: NotificationAlert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告确认通知', {
      alertId: alert.id,
      acknowledgedBy,
      acknowledgedAt,
    });

    // TODO: 实现确认通知逻辑
    return [];
  }

  /**
   * 发送警告抑制通知
   */
  async sendSuppressionNotifications(
    alert: NotificationAlert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告抑制通知', {
      alertId: alert.id,
      suppressedBy,
      suppressedAt,
      suppressionDuration,
    });

    // TODO: 实现抑制通知逻辑
    return [];
  }

  /**
   * 发送警告升级通知
   */
  async sendEscalationNotifications(
    alert: NotificationAlert,
    previousSeverity: NotificationSeverity,
    newSeverity: NotificationSeverity,
    escalatedAt: Date,
    escalationReason?: string
  ): Promise<NotificationResult[]> {
    this.logger.debug('发送警告升级通知', {
      alertId: alert.id,
      previousSeverity,
      newSeverity,
      escalatedAt,
      escalationReason,
    });

    // TODO: 实现升级通知逻辑
    return [];
  }

  /**
   * 创建通知消息
   */
  private createNotification(
    alert: NotificationAlert,
    rule: NotificationAlertRule,
    context: NotificationAlertContext
  ): Notification {
    return {
      id: `notif_${alert.id}_${Date.now()}`,
      alertId: alert.id,
      title: `警告: ${alert.metric}`,
      content: this.buildNotificationContent(alert, rule, context),
      priority: this.mapSeverityToPriority(alert.severity),
      status: 'pending',
      channelId: '', // 将在发送时设置
      channelType: NotificationChannelType.LOG, // 默认值，将在发送时更新
      recipient: '', // 将在发送时设置
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        metric: alert.metric,
        severity: alert.severity,
        threshold: context.threshold,
        currentValue: context.metricValue,
        operator: context.operator,
      },
    };
  }

  /**
   * 构建通知内容
   */
  private buildNotificationContent(
    alert: NotificationAlert,
    rule: NotificationAlertRule,
    context: NotificationAlertContext
  ): string {
    const lines = [
      `**警告详情**`,
      `- 规则: ${rule.name}`,
      `- 指标: ${alert.metric}`,
      `- 严重程度: ${alert.severity}`,
      `- 当前值: ${context.metricValue}`,
      `- 阈值: ${context.threshold}`,
      `- 操作符: ${context.operator}`,
      `- 时间: ${context.evaluatedAt.toLocaleString()}`,
    ];

    if (alert.description) {
      lines.push(`- 描述: ${alert.description}`);
    }

    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`- 标签: ${tags}`);
    }

    return lines.join('\n');
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    notification: Notification,
    channel: NotificationAlertRule['channels'][0]
  ): Promise<NotificationResult> {
    const channelType = channel.type as NotificationChannelType;
    const sender = this.senders.get(channelType);
    
    if (!sender) {
      throw new Error(`不支持的通知渠道类型: ${channelType}`);
    }

    // 设置渠道ID
    notification.channelId = channel.id;

    // 调用发送器
    return await sender.send(notification, channel.config);
  }

  /**
   * 映射严重程度到通知优先级
   */
  private mapSeverityToPriority(severity: NotificationSeverity): NotificationPriority {
    const severityPriorityMap = {
      [NotificationSeverity.LOW]: NotificationPriority.LOW,
      [NotificationSeverity.MEDIUM]: NotificationPriority.NORMAL,
      [NotificationSeverity.HIGH]: NotificationPriority.HIGH,
      [NotificationSeverity.CRITICAL]: NotificationPriority.CRITICAL,
    };

    return severityPriorityMap[severity] || NotificationPriority.NORMAL;
  }

  /**
   * 测试通知渠道
   */
  async testChannel(
    channelType: NotificationChannelType,
    config: Record<string, any>
  ): Promise<boolean> {
    const sender = this.senders.get(channelType);
    
    if (!sender) {
      throw new Error(`不支持的通知渠道类型: ${channelType}`);
    }

    return await sender.test(config);
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
      return {
        status: 'healthy',
        details: {
          serviceName: 'NotificationAdapterService',
          supportedChannels: this.getSupportedChannelTypes(),
          senderCount: this.senders.size,
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