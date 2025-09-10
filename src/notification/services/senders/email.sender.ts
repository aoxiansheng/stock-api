/**
 * 邮件通知发送器
 * 🎯 负责邮件通知的发送和验证
 * 
 * @description 从Alert模块迁移的邮件发送器，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Injectable } from "@nestjs/common";

import { createLogger } from "@app/config/logger.config";

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationResult,
  NotificationSender,
  Notification,
} from "../../types/notification.types";

// 使用独立类型，避免Alert模块依赖
// Email发送器主要依赖Notification类型，不需要Alert类型

@Injectable()
export class EmailSender implements NotificationSender {
  type = NotificationChannelType.EMAIL;
  private readonly logger = createLogger(EmailSender.name);

  /**
   * 发送邮件通知
   */
  async send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult> {
    const executionStart = Date.now();

    try {
      // 这里应该集成实际的邮件服务
      // 例如: SendGrid, AWS SES, 或者 SMTP
      this.logger.log(`发送邮件通知`, {
        notificationId: notification.id,
        recipient: notification.recipient,
        title: notification.title,
        channelConfig: {
          to: channelConfig.to,
          from: channelConfig.from,
          smtp: channelConfig.smtp ? 'configured' : 'not configured',
        },
      });

      // 模拟邮件发送过程
      await this.simulateEmailSending(notification, channelConfig);

      return {
        success: true,
        channelId: notification.channelId,
        channelType: this.type,
        message: `邮件已发送到 ${notification.recipient}`,
        sentAt: new Date(),
        duration: Date.now() - executionStart,
        deliveryId: `email_${Date.now()}`, // 模拟邮件服务返回的ID
      };
    } catch (error) {
      this.logger.error(`邮件发送失败`, {
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
   * 测试邮件配置
   */
  async test(config: Record<string, any>): Promise<boolean> {
    try {
      // 验证基本配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        this.logger.warn('邮件配置验证失败', { errors: validation.errors });
        return false;
      }

      // 这里可以发送测试邮件
      this.logger.log('邮件配置测试通过', {
        to: config.to,
        from: config.from,
        smtp: config.smtp ? 'configured' : 'not configured',
      });

      return true;
    } catch (error) {
      this.logger.error('邮件配置测试失败', { error: error.message });
      return false;
    }
  }

  /**
   * 验证邮件配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 验证收件人
    if (!config.to) {
      errors.push("收件人地址 (to) 是必填项");
    } else if (typeof config.to !== "string") {
      errors.push("收件人地址 (to) 必须是字符串");
    } else if (!emailRegex.test(config.to)) {
      errors.push("收件人地址 (to) 格式无效");
    }

    // 验证发件人
    if (!config.from) {
      errors.push("发件人地址 (from) 是必填项");
    } else if (typeof config.from !== "string") {
      errors.push("发件人地址 (from) 必须是字符串");
    } else if (!emailRegex.test(config.from)) {
      errors.push("发件人地址 (from) 格式无效");
    }

    // 验证SMTP配置（如果提供）
    if (config.smtp) {
      if (!config.smtp.host) {
        errors.push("SMTP主机地址是必填项");
      }
      if (!config.smtp.port) {
        errors.push("SMTP端口是必填项");
      }
      if (config.smtp.auth) {
        if (!config.smtp.auth.user) {
          errors.push("SMTP用户名是必填项");
        }
        if (!config.smtp.auth.pass) {
          errors.push("SMTP密码是必填项");
        }
      }
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
      required: ["to", "from"],
      properties: {
        to: {
          type: "string",
          format: "email",
          description: "收件人邮箱地址",
        },
        from: {
          type: "string", 
          format: "email",
          description: "发件人邮箱地址",
        },
        smtp: {
          type: "object",
          description: "SMTP服务器配置",
          properties: {
            host: {
              type: "string",
              description: "SMTP服务器地址",
            },
            port: {
              type: "number",
              description: "SMTP端口",
              default: 587,
            },
            secure: {
              type: "boolean",
              description: "是否使用SSL/TLS",
              default: false,
            },
            auth: {
              type: "object",
              properties: {
                user: {
                  type: "string",
                  description: "SMTP用户名",
                },
                pass: {
                  type: "string",
                  description: "SMTP密码",
                },
              },
            },
          },
        },
        timeout: {
          type: "number",
          description: "发送超时时间(毫秒)",
          default: 30000,
        },
      },
    };
  }

  /**
   * 模拟邮件发送过程
   * @private
   */
  private async simulateEmailSending(
    notification: Notification,
    config: Record<string, any>
  ): Promise<void> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 这里应该是实际的邮件发送逻辑
    // 例如使用 nodemailer 或第三方邮件服务
    /*
    const transporter = nodemailer.createTransporter({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: notification.recipient,
      subject: notification.title,
      html: notification.content,
    });
    */

    this.logger.debug('邮件发送模拟完成', {
      to: notification.recipient,
      subject: notification.title,
    });
  }
}