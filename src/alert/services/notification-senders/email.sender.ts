import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/config/logger.config";

import {
  NotificationType,
  Alert,
  AlertRule,
  NotificationResult,
  NotificationSender,
} from "../../types/alert.types";

@Injectable()
export class EmailSender implements NotificationSender {
  type = NotificationType.EMAIL;
  private readonly logger = createLogger(EmailSender.name);

  async send(
    alert: Alert,
    rule: AlertRule,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      // 这里应该集成实际的邮件服务
      // 例如: SendGrid, AWS SES, 或者 SMTP
      this.logger.log(`模拟发送邮件到: ${config.to}`);
      this.logger.log(`主题: ${config.subject}`);

      return {
        success: true,
        channelId: config.id || "email",
        channelType: this.type,
        message: `邮件已发送到 ${config.to}`,
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error({ error: error.stack }, "邮件发送失败");
      return {
        success: false,
        channelId: config.id || "email",
        channelType: this.type,
        error: error.message,
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  async test(config: Record<string, any>): Promise<boolean> {
    return !!(config.to && config.subject);
  }

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!config.to) {
      errors.push("Email recipient (to) is required");
    } else if (typeof config.to !== "string") {
      errors.push("Email recipient (to) must be a string");
    } else if (!emailRegex.test(config.to)) {
      errors.push("Email recipient (to) must be a valid email address");
    }

    if (!config.subject) {
      errors.push("Email subject is required");
    } else if (typeof config.subject !== "string") {
      errors.push("Email subject must be a string");
    }

    if (config.from && typeof config.from !== "string") {
      errors.push("Email sender (from) must be a string");
    }

    if (config.from && !emailRegex.test(config.from)) {
      errors.push("Email sender (from) must be a valid email address");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
