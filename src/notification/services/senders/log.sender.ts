/**
 * 日志通知发送器
 * 🎯 负责将通知记录到日志系统
 * 
 * @description 从Alert模块迁移的日志发送器，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from "@nestjs/common";

import { createLogger } from "@appcore/config/logger.config";

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationResult,
  NotificationSender,
  Notification,
} from "../../types/notification.types";

@Injectable()
export class LogSender implements NotificationSender {
  type = NotificationChannelType.LOG;
  private readonly logger = createLogger(LogSender.name);

  /**
   * 发送日志通知
   */
  async send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult> {
    const executionStart = Date.now();

    try {
      // 构建日志内容
      const logContent = this.buildLogContent(notification, channelConfig);
      
      // 根据优先级选择日志级别
      const logLevel = this.getLogLevel(notification.priority);
      
      // 记录到日志系统
      this.logger[logLevel](logContent, {
        notificationId: notification.id,
        alertId: notification.alertId,
        channelId: notification.channelId,
        priority: notification.priority,
        status: notification.status,
        recipient: notification.recipient,
        metadata: notification.metadata,
      });

      return {
        success: true,
        channelId: notification.channelId,
        channelType: this.type,
        message: `通知已记录到${logLevel}日志`,
        sentAt: new Date(),
        duration: Date.now() - executionStart,
        deliveryId: `log_${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(`日志记录失败`, {
        notificationId: notification.id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        channelId: notification.channelId,
        channelType: this.type,
        error: error.message,
        sentAt: new Date(),
        duration: Date.now() - executionStart,
      };
    }
  }

  /**
   * 测试日志配置
   */
  async test(config: Record<string, any>): Promise<boolean> {
    try {
      // 日志发送器基本上总是可用的
      this.logger.log("日志通知配置测试", {
        config,
        testTime: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      this.logger.error(`日志配置测试失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证日志配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证日志级别（如果指定）
    if (config.logLevel) {
      const validLevels = ['error', 'warn', 'info', 'debug'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push(`日志级别必须是以下之一: ${validLevels.join(', ')}`);
      }
    }

    // 验证格式（如果指定）
    if (config.format && !['json', 'text'].includes(config.format)) {
      errors.push("日志格式必须是 'json' 或 'text'");
    }

    // 验证是否包含敏感信息标志
    if (config.includeSensitiveData && typeof config.includeSensitiveData !== 'boolean') {
      errors.push("includeSensitiveData 必须是布尔值");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取配置模式
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: "object",
      properties: {
        logLevel: {
          type: "string",
          enum: ["error", "warn", "info", "debug"],
          description: "日志级别（可选，默认根据优先级自动选择）",
        },
        format: {
          type: "string",
          enum: ["json", "text"],
          default: "json",
          description: "日志格式",
        },
        includeSensitiveData: {
          type: "boolean",
          default: false,
          description: "是否包含敏感数据",
        },
        maxContentLength: {
          type: "number",
          default: 1000,
          minimum: 100,
          maximum: 10000,
          description: "日志内容最大长度",
        },
      },
    };
  }

  /**
   * 构建日志内容
   * @private
   */
  private buildLogContent(
    notification: Notification,
    config: Record<string, any>
  ): string {
    const maxLength = config.maxContentLength || 1000;
    
    let content = `[通知] ${notification.title}`;
    
    if (notification.content) {
      content += `\n内容: ${notification.content}`;
    }
    
    content += `\n详情:`;
    content += `\n  - 通知ID: ${notification.id}`;
    content += `\n  - 警告ID: ${notification.alertId}`;
    content += `\n  - 优先级: ${notification.priority.toUpperCase()}`;
    content += `\n  - 状态: ${notification.status.toUpperCase()}`;
    content += `\n  - 接收者: ${notification.recipient}`;
    content += `\n  - 创建时间: ${notification.createdAt.toISOString()}`;

    // 如果配置允许且有扩展元数据，添加到内容中
    if (config.includeSensitiveData && notification.metadata) {
      content += `\n  - 扩展数据: ${JSON.stringify(notification.metadata, null, 2)}`;
    }

    // 截断过长的内容
    if (content.length > maxLength) {
      content = content.substring(0, maxLength - 3) + '...';
    }

    return content;
  }

  /**
   * 根据通知优先级获取日志级别
   * @private
   */
  private getLogLevel(priority: string): 'error' | 'warn' | 'info' | 'debug' {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'urgent':
        return 'error';
      case 'high':
        return 'warn';
      case 'normal':
        return 'info';
      case 'low':
      default:
        return 'debug';
    }
  }
}