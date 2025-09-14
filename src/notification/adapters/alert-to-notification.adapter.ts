/**
 * Alert到Notification适配器
 * 🎯 将Alert事件转换为独立的NotificationRequestDto，实现模块解耦
 * 
 * @description 核心适配器，消除Notification模块对Alert模块的直接依赖
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { Injectable, BadRequestException } from '@nestjs/common';

import { createLogger } from "@common/logging/index";

// 导入独立的DTO类型
import {
  NotificationRequestDto,
  NotificationRequestFactory,
} from '../dto/notification-request.dto';

// 导入Notification模块独立类型
import {
  NotificationPriority,
  NotificationChannelType,
} from '../types/notification.types';

// 导入通用Alert事件类型（从common events）
import { 
  GenericAlertEvent,
  GenericAlertEventType,
  GenericAlertSeverity
} from '../../common/events/generic-alert-event.interface';

/**
 * Alert事件到通知请求的适配器
 * 提供Alert模块事件到Notification模块DTO的无损转换
 */
@Injectable()
export class AlertToNotificationAdapter {
  private readonly logger = createLogger('AlertToNotificationAdapter');

  /**
   * 将GenericAlertEvent转换为NotificationRequestDto
   */
  adapt(alertEvent: GenericAlertEvent): NotificationRequestDto {
    this.logger.debug('转换Alert事件为通知请求', {
      eventType: alertEvent.eventType,
      alertId: alertEvent.alert.id,
      severity: alertEvent.alert.severity,
    });

    try {
      const notificationRequest: NotificationRequestDto = {
        alertId: alertEvent.alert.id,
        severity: this.mapSeverityToPriority(alertEvent.alert.severity),
        title: this.buildTitle(alertEvent),
        message: this.buildMessage(alertEvent),
        metadata: this.extractMetadata(alertEvent),
        channelTypes: this.extractChannelTypes(alertEvent),
        recipients: this.extractRecipients(alertEvent),
        triggeredAt: alertEvent.timestamp.toISOString(),
        requiresAcknowledgment: this.shouldRequireAcknowledgment(alertEvent),
        tags: this.extractTags(alertEvent),
      };

      this.logger.debug('Alert事件转换完成', {
        alertId: alertEvent.alert.id,
        notificationTitle: notificationRequest.title,
        channelCount: notificationRequest.channelTypes?.length || 0,
        recipientCount: notificationRequest.recipients?.length || 0,
      });

      return notificationRequest;

    } catch (error) {
      this.logger.error('转换Alert事件失败', {
        alertId: alertEvent.alert.id,
        eventType: alertEvent.eventType,
        error: error.message,
      });
      
      throw new BadRequestException(`Failed to adapt alert event: ${error.message}`);
    }
  }

  /**
   * 批量转换Alert事件
   */
  adaptMany(alertEvents: GenericAlertEvent[]): NotificationRequestDto[] {
    this.logger.debug('批量转换Alert事件', {
      eventCount: alertEvents.length,
    });

    const results: NotificationRequestDto[] = [];
    const errors: Array<{ event: GenericAlertEvent; error: string }> = [];

    for (const event of alertEvents) {
      try {
        results.push(this.adapt(event));
      } catch (error) {
        errors.push({ event, error: error.message });
        this.logger.warn('单个事件转换失败', {
          alertId: event.alert.id,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      this.logger.warn('批量转换完成，存在部分失败', {
        totalCount: alertEvents.length,
        successCount: results.length,
        errorCount: errors.length,
      });
    }

    return results;
  }

  /**
   * 将Alert严重程度映射到通知优先级
   */
  private mapSeverityToPriority(alertSeverity: GenericAlertSeverity): NotificationPriority {
    const severityMap: Record<GenericAlertSeverity, NotificationPriority> = {
      [GenericAlertSeverity.LOW]: NotificationPriority.LOW,
      [GenericAlertSeverity.MEDIUM]: NotificationPriority.NORMAL,
      [GenericAlertSeverity.HIGH]: NotificationPriority.HIGH,
      [GenericAlertSeverity.CRITICAL]: NotificationPriority.CRITICAL,
    };

    const mapped = severityMap[alertSeverity];
    if (!mapped) {
      this.logger.warn('未知的Alert严重程度，使用默认值', {
        alertSeverity,
        defaultPriority: NotificationPriority.NORMAL,
      });
      return NotificationPriority.NORMAL;
    }

    return mapped;
  }

  /**
   * 构建通知标题
   */
  private buildTitle(alertEvent: GenericAlertEvent): string {
    const { alert, context } = alertEvent;
    
    // 根据事件类型构建不同的标题
    switch (alertEvent.eventType) {
      case GenericAlertEventType.FIRED:
        return `🚨 警告触发: ${alert.metric}`;
      
      case GenericAlertEventType.RESOLVED:
        return `✅ 警告已解决: ${alert.metric}`;
      
      case GenericAlertEventType.ACKNOWLEDGED:
        return `👁️ 警告已确认: ${alert.metric}`;
      
      case GenericAlertEventType.ESCALATED:
        return `⬆️ 警告已升级: ${alert.metric}`;
      
      case GenericAlertEventType.SUPPRESSED:
        return `🔕 警告已抑制: ${alert.metric}`;
      
      default:
        return `📢 警告通知: ${alert.metric}`;
    }
  }

  /**
   * 构建通知消息内容
   */
  private buildMessage(alertEvent: GenericAlertEvent): string {
    const { alert, context } = alertEvent;
    
    const messageParts: string[] = [];
    
    // 基本信息
    messageParts.push(`**警告详情**`);
    messageParts.push(`- 警告ID: ${alert.id}`);
    messageParts.push(`- 指标: ${alert.metric}`);
    messageParts.push(`- 严重程度: ${alert.severity}`);
    messageParts.push(`- 时间: ${alertEvent.timestamp.toLocaleString('zh-CN')}`);

    // 根据事件类型添加特定信息
    if (alertEvent.eventType === GenericAlertEventType.FIRED && context) {
      if (context.metricValue !== undefined) {
        messageParts.push(`- 当前值: ${context.metricValue}`);
      }
      if (context.threshold !== undefined) {
        messageParts.push(`- 阈值: ${context.threshold}`);
      }
      if (context.operator) {
        messageParts.push(`- 条件: ${context.operator}`);
      }
    }

    // 描述信息
    if (alert.description) {
      messageParts.push(`- 描述: ${alert.description}`);
    }

    // 标签信息
    if (alert.tags && Object.keys(alert.tags).length > 0) {
      const tags = Object.entries(alert.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      messageParts.push(`- 标签: ${tags}`);
    }

    // 事件特定信息
    if (alertEvent.eventData?.resolutionComment) {
      messageParts.push(`- 解决备注: ${alertEvent.eventData.resolutionComment}`);
    }
    if (alertEvent.eventData?.acknowledgmentComment) {
      messageParts.push(`- 确认备注: ${alertEvent.eventData.acknowledgmentComment}`);
    }
    if (alertEvent.eventData?.suppressionReason) {
      messageParts.push(`- 抑制原因: ${alertEvent.eventData.suppressionReason}`);
    }
    if (alertEvent.eventData?.escalationReason) {
      messageParts.push(`- 升级原因: ${alertEvent.eventData.escalationReason}`);
    }

    return messageParts.join('\n');
  }

  /**
   * 提取元数据信息
   */
  private extractMetadata(alertEvent: GenericAlertEvent): Record<string, any> {
    const { alert, context } = alertEvent;

    const metadata: Record<string, any> = {
      // 事件基本信息
      eventType: alertEvent.eventType,
      correlationId: alertEvent.correlationId,
      timestamp: alertEvent.timestamp.toISOString(),
      
      // Alert信息
      alertId: alert.id,
      metric: alert.metric,
      severity: alert.severity,
      
      // 规则信息
      ruleId: alertEvent.rule?.id,
      ruleName: alertEvent.rule?.name,
      
      // 上下文信息
      ...(context && {
        evaluatedAt: context.evaluatedAt?.toISOString(),
        metricValue: context.metricValue,
        threshold: context.threshold,
        operator: context.operator,
      }),

      // 标签
      tags: alert.tags || {},
      
      // 事件特定数据
      eventData: alertEvent.eventData,
      
      // 原始事件数据（用于调试和审计）
      originalEvent: {
        eventType: alertEvent.eventType,
        alertId: alert.id,
        timestamp: alertEvent.timestamp.toISOString(),
      },
    };

    return metadata;
  }

  /**
   * 提取通知渠道类型
   */
  private extractChannelTypes(alertEvent: GenericAlertEvent): NotificationChannelType[] | undefined {
    const { rule } = alertEvent;
    
    // 从规则中提取渠道信息
    if (rule?.channels && Array.isArray(rule.channels)) {
      const channelTypes: NotificationChannelType[] = [];
      
      for (const channel of rule.channels) {
        if (channel.enabled && channel.type) {
          const channelType = this.mapChannelType(channel.type);
          if (channelType && !channelTypes.includes(channelType)) {
            channelTypes.push(channelType);
          }
        }
      }
      
      return channelTypes.length > 0 ? channelTypes : undefined;
    }

    // 根据严重程度提供默认渠道
    return this.getDefaultChannelTypes(alertEvent.alert.severity);
  }

  /**
   * 映射渠道类型
   */
  private mapChannelType(channelType: string): NotificationChannelType | null {
    const channelMap: Record<string, NotificationChannelType> = {
      'email': NotificationChannelType.EMAIL,
      'webhook': NotificationChannelType.WEBHOOK,
      'slack': NotificationChannelType.SLACK,
      'dingtalk': NotificationChannelType.DINGTALK,
      'sms': NotificationChannelType.SMS,
      'log': NotificationChannelType.LOG,
    };

    return channelMap[channelType.toLowerCase()] || null;
  }

  /**
   * 根据严重程度获取默认通知渠道
   */
  private getDefaultChannelTypes(severity: GenericAlertSeverity): NotificationChannelType[] {
    const severityChannelMap: Record<GenericAlertSeverity, NotificationChannelType[]> = {
      [GenericAlertSeverity.LOW]: [NotificationChannelType.LOG],
      [GenericAlertSeverity.MEDIUM]: [NotificationChannelType.LOG, NotificationChannelType.EMAIL],
      [GenericAlertSeverity.HIGH]: [NotificationChannelType.LOG, NotificationChannelType.EMAIL, NotificationChannelType.SLACK],
      [GenericAlertSeverity.CRITICAL]: [NotificationChannelType.LOG, NotificationChannelType.EMAIL, NotificationChannelType.SLACK, NotificationChannelType.SMS, NotificationChannelType.WEBHOOK],
    };

    return severityChannelMap[severity] || [NotificationChannelType.LOG];
  }

  /**
   * 提取接收者列表
   */
  private extractRecipients(alertEvent: GenericAlertEvent): string[] | undefined {
    // 从事件数据中提取接收者信息
    if (alertEvent.eventData?.recipients && Array.isArray(alertEvent.eventData.recipients)) {
      return alertEvent.eventData.recipients.filter((recipient: any) => 
        typeof recipient === 'string' && recipient.trim().length > 0
      );
    }

    // 从metadata中提取
    if (alertEvent.context?.metadata?.recipients && Array.isArray(alertEvent.context.metadata.recipients)) {
      return alertEvent.context.metadata.recipients.filter((recipient: any) => 
        typeof recipient === 'string' && recipient.trim().length > 0
      );
    }

    return undefined;
  }

  /**
   * 判断是否需要确认
   */
  private shouldRequireAcknowledgment(alertEvent: GenericAlertEvent): boolean {
    const { alert } = alertEvent;
    
    // 高严重程度的警告需要确认
    const highSeverityLevels = [
      GenericAlertSeverity.HIGH,
      GenericAlertSeverity.CRITICAL
    ];
    return highSeverityLevels.includes(alert.severity);
  }

  /**
   * 提取标签
   */
  private extractTags(alertEvent: GenericAlertEvent): string[] | undefined {
    const { alert, rule } = alertEvent;
    
    const tags: string[] = [];
    
    // 从Alert标签中提取
    if (alert.tags && typeof alert.tags === 'object') {
      for (const [key, value] of Object.entries(alert.tags)) {
        tags.push(`${key}:${value}`);
      }
    }
    
    // 添加系统标签
    tags.push(`severity:${alert.severity}`);
    tags.push(`metric:${alert.metric}`);
    tags.push(`event:${alertEvent.eventType}`);
    
    // 从规则中添加相关标签
    if (rule?.id) {
      tags.push(`rule:${rule.id}`);
    }
    
    return tags.length > 0 ? tags : undefined;
  }

  /**
   * 验证Alert事件有效性
   */
  validateAlertEvent(alertEvent: GenericAlertEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!alertEvent) {
      errors.push('Alert事件不能为空');
      return { valid: false, errors };
    }

    if (!alertEvent.alert) {
      errors.push('Alert事件必须包含alert对象');
    } else {
      if (!alertEvent.alert.id) {
        errors.push('Alert必须包含有效的ID');
      }
      if (!alertEvent.alert.metric) {
        errors.push('Alert必须包含metric');
      }
      if (!alertEvent.alert.severity) {
        errors.push('Alert必须包含severity');
      }
    }

    if (!alertEvent.eventType) {
      errors.push('Alert事件必须包含eventType');
    }

    if (!alertEvent.timestamp) {
      errors.push('Alert事件必须包含timestamp时间戳');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}