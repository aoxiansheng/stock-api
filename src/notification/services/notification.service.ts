/**
 * 通知服务
 * 🎯 负责通知的编排、发送和管理
 * 
 * @description 从Alert模块拆分出来的独立通知服务
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from '@nestjs/common';

import { createLogger } from '@appcore/config/logger.config';

// 暂时保留Alert类型导入用于Legacy方法 - 计划后续清理
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
import { NotificationTemplateService } from './notification-template.service';

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
    private readonly templateService: NotificationTemplateService,
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
   * 发送警告触发通知（独立类型接口 - 推荐使用）
   * 使用notification模块独立的类型，避免Alert模块依赖
   */
  async sendAlertNotifications(
    alert: NotificationAlert,
    rule: NotificationAlertRule,
    context: NotificationAlertContext
  ): Promise<NotificationResult[]>;

  /**
   * 发送警告触发通知（原有接口 - 向后兼容）
   * @deprecated 计划后续版本移除，请使用独立类型接口
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
      // 使用独立类型的适配器服务（推荐）
      return await this.adapterService.sendAlertNotifications(
        alert as NotificationAlert,
        rule as NotificationAlertRule,
        context as NotificationAlertContext
      );
    } else {
      // 使用原有的实现逻辑（向后兼容，计划移除）
      return await this.sendResolutionNotificationsLegacy(
        alert as Alert,
        new Date(),
        'system',
        'Legacy compatibility call'
      );
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
    const operation = NOTIFICATION_OPERATIONS.SEND_RESOLUTION_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      resolvedAt,
      resolvedBy,
    });

    try {
      const results: NotificationResult[] = [];

      // 1. 获取原始警告规则配置
      // 注意：这里假设alert对象包含了规则信息或者我们需要通过其他方式获取
      // 在实际实现中，可能需要从数据库查询原始规则配置
      const alertRule = await this.getAlertRuleForAlert(alert);
      
      if (!alertRule || !alertRule.channels || alertRule.channels.length === 0) {
        this.logger.warn(NOTIFICATION_MESSAGES.NO_CHANNELS_CONFIGURED, {
          alertId: alert.id,
          operation,
        });
        return results;
      }

      // 2. 为每个配置的通知渠道发送解决通知
      for (const channel of alertRule.channels) {
        try {
          const result = await this.sendResolutionNotificationToChannel(
            alert,
            alertRule,
            channel,
            resolvedAt,
            resolvedBy,
            comment
          );
          results.push(result);
        } catch (error) {
          this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
            alertId: alert.id,
            channelId: channel.id,
            channelType: channel.type,
            operation,
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
            message: `解决通知发送失败: ${error.message}`,
          });
        }
      }

      this.logger.log(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
        operation,
        alertId: alert.id,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        resolvedBy,
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
   * 发送警告确认通知
   */
  async sendAcknowledgmentNotificationsLegacy(
    alert: Alert,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<NotificationResult[]> {
    const operation = NOTIFICATION_OPERATIONS.SEND_ACKNOWLEDGMENT_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      acknowledgedBy,
      acknowledgedAt,
    });

    try {
      const results: NotificationResult[] = [];

      // 1. 获取原始警告规则配置
      const alertRule = await this.getAlertRuleForAlert(alert);
      
      if (!alertRule || !alertRule.channels || alertRule.channels.length === 0) {
        this.logger.warn(NOTIFICATION_MESSAGES.NO_CHANNELS_CONFIGURED, {
          alertId: alert.id,
          operation,
        });
        return results;
      }

      // 2. 为每个配置的通知渠道发送确认通知
      for (const channel of alertRule.channels) {
        try {
          const result = await this.sendAcknowledgmentNotificationToChannel(
            alert,
            alertRule,
            channel,
            acknowledgedBy,
            acknowledgedAt,
            comment
          );
          results.push(result);
        } catch (error) {
          this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
            alertId: alert.id,
            channelId: channel.id,
            channelType: channel.type,
            operation,
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
            message: `确认通知发送失败: ${error.message}`,
          });
        }
      }

      this.logger.log(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
        operation,
        alertId: alert.id,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        acknowledgedBy,
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
   * 发送警告抑制通知
   */
  async sendSuppressionNotificationsLegacy(
    alert: Alert,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<NotificationResult[]> {
    const operation = NOTIFICATION_OPERATIONS.SEND_SUPPRESSION_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      suppressedBy,
      suppressionDuration,
      suppressedAt,
    });

    try {
      const results: NotificationResult[] = [];

      // 1. 获取原始警告规则配置
      const alertRule = await this.getAlertRuleForAlert(alert);
      
      if (!alertRule || !alertRule.channels || alertRule.channels.length === 0) {
        this.logger.warn(NOTIFICATION_MESSAGES.NO_CHANNELS_CONFIGURED, {
          alertId: alert.id,
          operation,
        });
        return results;
      }

      // 2. 为每个配置的通知渠道发送抑制通知
      for (const channel of alertRule.channels) {
        try {
          const result = await this.sendSuppressionNotificationToChannel(
            alert,
            alertRule,
            channel,
            suppressedBy,
            suppressedAt,
            suppressionDuration,
            reason
          );
          results.push(result);
        } catch (error) {
          this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
            alertId: alert.id,
            channelId: channel.id,
            channelType: channel.type,
            operation,
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
            message: `抑制通知发送失败: ${error.message}`,
          });
        }
      }

      this.logger.log(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
        operation,
        alertId: alert.id,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        suppressedBy,
        suppressionDuration,
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
   * 发送警告升级通知
   */
  async sendEscalationNotificationsLegacy(
    alert: Alert,
    previousSeverity: string,
    newSeverity: string,
    escalatedAt: Date,
    escalationReason: string
  ): Promise<NotificationResult[]> {
    const operation = NOTIFICATION_OPERATIONS.SEND_ESCALATION_NOTIFICATION;
    
    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      previousSeverity,
      newSeverity,
      escalatedAt,
      escalationReason,
    });

    try {
      const results: NotificationResult[] = [];

      // 1. 获取原始警告规则配置
      const alertRule = await this.getAlertRuleForAlert(alert);
      
      if (!alertRule || !alertRule.channels || alertRule.channels.length === 0) {
        this.logger.warn(NOTIFICATION_MESSAGES.NO_CHANNELS_CONFIGURED, {
          alertId: alert.id,
          operation,
        });
        return results;
      }

      // 2. 为每个配置的通知渠道发送升级通知
      // 对于升级通知，可能需要发送到更高级别的渠道
      for (const channel of alertRule.channels) {
        try {
          const result = await this.sendEscalationNotificationToChannel(
            alert,
            alertRule,
            channel,
            previousSeverity,
            newSeverity,
            escalatedAt,
            escalationReason
          );
          results.push(result);
        } catch (error) {
          this.logger.error(NOTIFICATION_MESSAGES.NOTIFICATION_FAILED, {
            alertId: alert.id,
            channelId: channel.id,
            channelType: channel.type,
            operation,
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
            message: `升级通知发送失败: ${error.message}`,
          });
        }
      }

      this.logger.log(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
        operation,
        alertId: alert.id,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        previousSeverity,
        newSeverity,
        escalationReason,
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
   * 获取警告对应的规则配置
   * @private
   */
  private async getAlertRuleForAlert(alert: Alert): Promise<AlertRule | null> {
    try {
      // 方法1: 如果alert对象中包含规则信息
      if ((alert as any).rule) {
        return (alert as any).rule;
      }
      
      // 方法2: 如果alert对象中包含ruleId，需要查询数据库
      if ((alert as any).ruleId) {
        // TODO: 这里需要注入AlertRule的数据访问服务
        // 暂时返回null，在后续迭代中完善
        this.logger.warn('需要通过ruleId查询AlertRule，暂未实现', {
          alertId: alert.id,
          ruleId: (alert as any).ruleId,
        });
        return null;
      }
      
      // 方法3: 通过alert的其他属性推断规则（备用方案）
      this.logger.warn('无法获取Alert对应的规则配置', {
        alertId: alert.id,
      });
      
      return null;
    } catch (error) {
      this.logger.error('获取Alert规则配置失败', {
        alertId: alert.id,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 发送解决通知到指定渠道
   * @private
   */
  private async sendResolutionNotificationToChannel(
    alert: Alert,
    rule: AlertRule,
    channel: AlertNotificationChannel,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    this.logger.debug('发送解决通知到渠道', {
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
      resolvedBy,
    });

    try {
      // 1. 构建解决通知消息内容
      const notificationContent = this.buildResolutionNotificationContent(
        alert,
        rule,
        resolvedAt,
        resolvedBy,
        comment
      );

      // 2. 根据渠道类型选择发送器
      const sender = this.senders.get(channel.type as NotificationChannelType);
      if (!sender) {
        throw new Error(`不支持的通知渠道类型: ${channel.type}`);
      }

      // 3. 创建通知对象
      const notification: Notification = {
        id: `resolution_${alert.id}_${Date.now()}`,
        alertId: alert.id,
        title: `✅ 警告已解决: ${alert.metric}`,
        content: notificationContent,
        priority: this.mapAlertSeverityToPriority(alert.severity),
        status: 'pending',
        channelId: channel.id || '',
        channelType: channel.type as NotificationChannelType,
        recipient: '', // 将在发送时设置
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          type: 'resolution',
          alertId: alert.id,
          ruleId: rule.id,
          resolvedAt: resolvedAt.toISOString(),
          resolvedBy: resolvedBy || 'system',
          comment,
        },
      };

      // 4. 发送通知
      const sendResult = await sender.send(notification, channel.config || {});
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        channelId: channel.id || 'unknown',
        channelType: channel.type as NotificationChannelType,
        message: `解决通知发送成功`,
        sentAt: new Date(),
        duration,
        deliveryId: sendResult.deliveryId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`解决通知发送失败: ${error.message}`);
    }
  }

  /**
   * 构建解决通知消息内容
   * @private
   */
  private buildResolutionNotificationContent(
    alert: Alert,
    rule: AlertRule,
    resolvedAt: Date,
    resolvedBy?: string,
    comment?: string
  ): string {
    const lines = [
      `**✅ 警告已解决**`,
      ``,
      `**警告信息:**`,
      `- 规则: ${rule.name}`,
      `- 指标: ${alert.metric}`,
      `- 严重程度: ${alert.severity}`,
      ``,
      `**解决详情:**`,
      `- 解决时间: ${resolvedAt.toLocaleString()}`,
      `- 解决者: ${resolvedBy || '系统自动'}`,
    ];

    if (comment) {
      lines.push(`- 解决说明: ${comment}`);
    }

    // 添加原始警告的详细信息
    if (alert.message) {
      lines.push(``, `**原始警告:**`, `- ${alert.message}`);
    }

    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`- 标签: ${tags}`);
    }

    lines.push(``, `---`, `🎯 警告处理完成，系统已恢复正常状态`);

    return lines.join('\n');
  }

  /**
   * 映射警告严重程度到通知优先级
   * @private  
   */
  private mapAlertSeverityToPriority(severity: string): NotificationPriority {
    const severityMap: Record<string, NotificationPriority> = {
      'low': NotificationPriority.LOW,
      'medium': NotificationPriority.NORMAL,
      'high': NotificationPriority.HIGH,
      'critical': NotificationPriority.CRITICAL,
    };
    
    return severityMap[severity.toLowerCase()] || NotificationPriority.NORMAL;
  }

  /**
   * 发送确认通知到指定渠道
   * @private
   */
  private async sendAcknowledgmentNotificationToChannel(
    alert: Alert,
    rule: AlertRule,
    channel: AlertNotificationChannel,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    this.logger.debug('发送确认通知到渠道', {
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
      acknowledgedBy,
    });

    try {
      // 1. 构建确认通知消息内容
      const notificationContent = this.buildAcknowledgmentNotificationContent(
        alert,
        rule,
        acknowledgedBy,
        acknowledgedAt,
        comment
      );

      // 2. 根据渠道类型选择发送器
      const sender = this.senders.get(channel.type as NotificationChannelType);
      if (!sender) {
        throw new Error(`不支持的通知渠道类型: ${channel.type}`);
      }

      // 3. 创建通知对象
      const notification: Notification = {
        id: `acknowledgment_${alert.id}_${Date.now()}`,
        alertId: alert.id,
        title: `✋ 警告已确认: ${alert.metric}`,
        content: notificationContent,
        priority: this.mapAlertSeverityToPriority(alert.severity),
        status: 'pending',
        channelId: channel.id || '',
        channelType: channel.type as NotificationChannelType,
        recipient: '', // 将在发送时设置
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          type: 'acknowledgment',
          alertId: alert.id,
          ruleId: rule.id,
          acknowledgedBy,
          acknowledgedAt: acknowledgedAt.toISOString(),
          comment,
        },
      };

      // 4. 发送通知
      const sendResult = await sender.send(notification, channel.config || {});
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        channelId: channel.id || 'unknown',
        channelType: channel.type as NotificationChannelType,
        message: `确认通知发送成功`,
        sentAt: new Date(),
        duration,
        deliveryId: sendResult.deliveryId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`确认通知发送失败: ${error.message}`);
    }
  }

  /**
   * 构建确认通知消息内容
   * @private
   */
  private buildAcknowledgmentNotificationContent(
    alert: Alert,
    rule: AlertRule,
    acknowledgedBy: string,
    acknowledgedAt: Date,
    comment?: string
  ): string {
    const lines = [
      `**✋ 警告已确认**`,
      ``,
      `**警告信息:**`,
      `- 规则: ${rule.name}`,
      `- 指标: ${alert.metric}`,
      `- 严重程度: ${alert.severity}`,
      `- 当前值: ${alert.value}`,
      `- 阈值: ${alert.threshold}`,
      ``,
      `**确认详情:**`,
      `- 确认时间: ${acknowledgedAt.toLocaleString()}`,
      `- 确认人: ${acknowledgedBy}`,
    ];

    if (comment) {
      lines.push(`- 确认说明: ${comment}`);
    }

    // 添加原始警告的详细信息
    if (alert.message) {
      lines.push(``, `**原始警告:**`, `- ${alert.message}`);
    }

    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`- 标签: ${tags}`);
    }

    lines.push(
      ``, 
      `---`, 
      `👤 此警告已被确认，相关人员正在处理中`,
      `📋 状态: 已确认，处理中...`
    );

    return lines.join('\n');
  }

  /**
   * 发送抑制通知到指定渠道
   * @private
   */
  private async sendSuppressionNotificationToChannel(
    alert: Alert,
    rule: AlertRule,
    channel: AlertNotificationChannel,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    this.logger.debug('发送抑制通知到渠道', {
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
      suppressedBy,
      suppressionDuration,
    });

    try {
      // 1. 构建抑制通知消息内容
      const notificationContent = this.buildSuppressionNotificationContent(
        alert,
        rule,
        suppressedBy,
        suppressedAt,
        suppressionDuration,
        reason
      );

      // 2. 根据渠道类型选择发送器
      const sender = this.senders.get(channel.type as NotificationChannelType);
      if (!sender) {
        throw new Error(`不支持的通知渠道类型: ${channel.type}`);
      }

      // 3. 创建通知对象
      const notification: Notification = {
        id: `suppression_${alert.id}_${Date.now()}`,
        alertId: alert.id,
        title: `🔇 警告已抑制: ${alert.metric}`,
        content: notificationContent,
        priority: this.mapAlertSeverityToPriority(alert.severity),
        status: 'pending',
        channelId: channel.id || '',
        channelType: channel.type as NotificationChannelType,
        recipient: '', // 将在发送时设置
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          type: 'suppression',
          alertId: alert.id,
          ruleId: rule.id,
          suppressedBy,
          suppressedAt: suppressedAt.toISOString(),
          suppressionDuration,
          reason,
        },
      };

      // 4. 发送通知
      const sendResult = await sender.send(notification, channel.config || {});
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        channelId: channel.id || 'unknown',
        channelType: channel.type as NotificationChannelType,
        message: `抑制通知发送成功`,
        sentAt: new Date(),
        duration,
        deliveryId: sendResult.deliveryId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`抑制通知发送失败: ${error.message}`);
    }
  }

  /**
   * 构建抑制通知消息内容
   * @private
   */
  private buildSuppressionNotificationContent(
    alert: Alert,
    rule: AlertRule,
    suppressedBy: string,
    suppressedAt: Date,
    suppressionDuration: number,
    reason?: string
  ): string {
    // 计算抑制结束时间
    const suppressionEndTime = new Date(suppressedAt.getTime() + suppressionDuration * 1000);
    const durationHours = Math.floor(suppressionDuration / 3600);
    const durationMinutes = Math.floor((suppressionDuration % 3600) / 60);
    
    let durationText = '';
    if (durationHours > 0) {
      durationText = `${durationHours}小时`;
      if (durationMinutes > 0) {
        durationText += `${durationMinutes}分钟`;
      }
    } else {
      durationText = `${durationMinutes}分钟`;
    }

    const lines = [
      `**🔇 警告已抑制**`,
      ``,
      `**警告信息:**`,
      `- 规则: ${rule.name}`,
      `- 指标: ${alert.metric}`,
      `- 严重程度: ${alert.severity}`,
      `- 当前值: ${alert.value}`,
      `- 阈值: ${alert.threshold}`,
      ``,
      `**抑制详情:**`,
      `- 抑制时间: ${suppressedAt.toLocaleString()}`,
      `- 抑制者: ${suppressedBy}`,
      `- 抑制持续时间: ${durationText}`,
      `- 预计恢复时间: ${suppressionEndTime.toLocaleString()}`,
    ];

    if (reason) {
      lines.push(`- 抑制原因: ${reason}`);
    }

    // 添加原始警告的详细信息
    if (alert.message) {
      lines.push(``, `**原始警告:**`, `- ${alert.message}`);
    }

    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`- 标签: ${tags}`);
    }

    lines.push(
      ``, 
      `---`, 
      `🔕 此警告通知已被临时抑制`,
      `⏰ 抑制期间不会发送新的通知`,
      `📅 抑制将在 ${suppressionEndTime.toLocaleString()} 自动解除`
    );

    return lines.join('\n');
  }

  /**
   * 发送升级通知到指定渠道
   * @private
   */
  private async sendEscalationNotificationToChannel(
    alert: Alert,
    rule: AlertRule,
    channel: AlertNotificationChannel,
    previousSeverity: string,
    newSeverity: string,
    escalatedAt: Date,
    escalationReason: string
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    
    this.logger.debug('发送升级通知到渠道', {
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
      previousSeverity,
      newSeverity,
    });

    try {
      // 1. 构建升级通知消息内容
      const notificationContent = this.buildEscalationNotificationContent(
        alert,
        rule,
        previousSeverity,
        newSeverity,
        escalatedAt,
        escalationReason
      );

      // 2. 根据渠道类型选择发送器
      const sender = this.senders.get(channel.type as NotificationChannelType);
      if (!sender) {
        throw new Error(`不支持的通知渠道类型: ${channel.type}`);
      }

      // 3. 创建通知对象 - 升级通知使用更高的优先级
      const escalatedPriority = this.getEscalatedPriority(newSeverity);
      
      const notification: Notification = {
        id: `escalation_${alert.id}_${Date.now()}`,
        alertId: alert.id,
        title: `🚨 警告严重程度升级: ${alert.metric}`,
        content: notificationContent,
        priority: escalatedPriority,
        status: 'pending',
        channelId: channel.id || '',
        channelType: channel.type as NotificationChannelType,
        recipient: '', // 将在发送时设置
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          type: 'escalation',
          alertId: alert.id,
          ruleId: rule.id,
          previousSeverity,
          newSeverity,
          escalatedAt: escalatedAt.toISOString(),
          escalationReason,
        },
      };

      // 4. 发送通知
      const sendResult = await sender.send(notification, channel.config || {});
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        channelId: channel.id || 'unknown',
        channelType: channel.type as NotificationChannelType,
        message: `升级通知发送成功`,
        sentAt: new Date(),
        duration,
        deliveryId: sendResult.deliveryId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`升级通知发送失败: ${error.message}`);
    }
  }

  /**
   * 构建升级通知消息内容
   * @private
   */
  private buildEscalationNotificationContent(
    alert: Alert,
    rule: AlertRule,
    previousSeverity: string,
    newSeverity: string,
    escalatedAt: Date,
    escalationReason: string
  ): string {
    // 根据严重程度变化确定紧急程度指示器
    const getSeverityIcon = (severity: string) => {
      switch (severity.toLowerCase()) {
        case 'critical': return '🔴';
        case 'high': return '🟠';
        case 'medium': return '🟡';
        case 'low': return '🟢';
        default: return '⚪';
      }
    };

    const previousIcon = getSeverityIcon(previousSeverity);
    const newIcon = getSeverityIcon(newSeverity);

    const lines = [
      `**🚨 警告严重程度升级**`,
      ``,
      `**警告信息:**`,
      `- 规则: ${rule.name}`,
      `- 指标: ${alert.metric}`,
      `- 当前值: ${alert.value}`,
      `- 阈值: ${alert.threshold}`,
      ``,
      `**升级详情:**`,
      `- 升级时间: ${escalatedAt.toLocaleString()}`,
      `- 严重程度变化: ${previousIcon} ${previousSeverity} → ${newIcon} ${newSeverity}`,
      `- 升级原因: ${escalationReason}`,
    ];

    // 添加原始警告的详细信息
    if (alert.message) {
      lines.push(``, `**原始警告:**`, `- ${alert.message}`);
    }

    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`- 标签: ${tags}`);
    }

    // 添加紧急程度提示
    if (newSeverity.toLowerCase() === 'critical') {
      lines.push(
        ``, 
        `---`, 
        `🔴 **紧急警告**: 此警告已升级为严重级别`,
        `⚡ 需要立即处理以防止系统影响扩大`,
        `📞 建议通知相关责任人员`
      );
    } else {
      lines.push(
        ``, 
        `---`, 
        `📈 警告严重程度已升级，请及时处理`,
        `🔍 建议检查相关系统状态`
      );
    }

    return lines.join('\n');
  }

  /**
   * 获取升级后的通知优先级
   * @private
   */
  private getEscalatedPriority(newSeverity: string): NotificationPriority {
    // 升级通知应该使用比正常优先级更高的级别
    switch (newSeverity.toLowerCase()) {
      case 'critical':
        return NotificationPriority.CRITICAL;
      case 'high':
        return NotificationPriority.HIGH;
      case 'medium':
        return NotificationPriority.HIGH; // 中等升级为高优先级
      default:
        return NotificationPriority.NORMAL;
    }
  }

  /**
   * 使用模板系统生成通知内容
   * @private
   */
  private async generateNotificationWithTemplate(
    eventType: string,
    alert: Alert,
    rule: AlertRule,
    channelType: NotificationChannelType,
    additionalVariables: Record<string, any> = {}
  ): Promise<{ subject?: string; body: string; format: string } | null> {
    try {
      // 获取该事件类型的模板
      const templates = await this.templateService.getTemplatesByEventType(eventType);
      
      if (templates.length === 0) {
        this.logger.debug('未找到模板，使用传统方法', {
          eventType,
          channelType,
          alertId: alert.id,
        });
        return null; // 返回null表示使用传统方法
      }

      // 选择第一个启用的模板（按优先级排序）
      const template = templates[0];

      // 准备模板变量
      const variables = {
        // 基础变量
        alertId: alert.id,
        ruleName: rule.name,
        ruleDescription: rule.description || rule.name,
        ruleId: alert.ruleId,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        startTime: alert.startTime?.toLocaleString(),
        endTime: alert.endTime?.toLocaleString(),
        duration: alert.endTime && alert.startTime 
          ? Math.round((alert.endTime.getTime() - alert.startTime.getTime()) / 1000)
          : undefined,
        
        // 条件变量
        acknowledgedBy: alert.acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt?.toLocaleString(),
        resolvedBy: alert.resolvedBy,
        resolvedAt: alert.resolvedAt?.toLocaleString(),
        
        // 标签处理
        tags: alert.tags ? Object.entries(alert.tags).map(([k, v]) => `${k}=${v}`).join(', ') : '',
        
        // 附加变量（来自调用者）
        ...additionalVariables,
      };

      // 渲染模板
      const rendered = await this.templateService.renderTemplate({
        templateId: template.templateId,
        channelType: channelType,
        variables,
        fallbackToDefault: true,
      });

      return {
        subject: rendered.subject,
        body: rendered.body,
        format: rendered.format,
      };
    } catch (error) {
      this.logger.warn('模板生成失败，使用传统方法', {
        eventType,
        channelType,
        alertId: alert.id,
        error: error.message,
      });
      return null; // 返回null表示使用传统方法
    }
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