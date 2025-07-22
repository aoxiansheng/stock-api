import { HttpService } from "@nestjs/axios";
import { Injectable, BadRequestException } from "@nestjs/common";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";

import { createLogger } from "@common/config/logger.config";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";

import {
  NotificationChannelType,
  AlertSeverity,
  Alert,
  AlertRule,
  NotificationResult,
  NotificationSender,
} from "../../types/alert.types";

@Injectable()
export class SlackSender implements NotificationSender {
  type = NotificationChannelType.SLACK;
  private readonly logger = createLogger(SlackSender.name);

  constructor(private readonly httpService: HttpService) {}

  async send(
    alert: Alert,
    rule: AlertRule,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      // SSRF防护检查
      const urlValidation = URLSecurityValidator.validateURL(
        config.webhook_url,
      );
      if (!urlValidation.valid) {
        throw new BadRequestException(
          `Slack Webhook URL安全检查失败: ${urlValidation.error}`,
        );
      }

      const payload = {
        channel: config.channel,
        username: config.username || "AlertBot",
        icon_emoji: config.icon_emoji || ":warning:",
        text: `*${rule.name}* - ${alert.severity.toUpperCase()}`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              { title: "指标", value: alert.metric, short: true },
              { title: "当前值", value: alert.value.toString(), short: true },
              { title: "阈值", value: alert.threshold.toString(), short: true },
              { title: "状态", value: alert.status, short: true },
            ],
            footer: "Stock API Alert System",
            ts: Math.floor(alert.startTime.getTime() / 1000),
          },
        ],
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(config.webhook_url, payload),
      );

      return {
        success: response.status === 200,
        channelId: config.id || "slack",
        channelType: this.type,
        message: "Slack 消息发送成功",
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error({ error: error.stack }, "Slack 发送失败");
      return {
        success: false,
        channelId: config.id || "slack",
        channelType: this.type,
        error: error.message,
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  async test(config: Record<string, any>): Promise<boolean> {
    // SSRF防护检查 - 失败时抛出异常
    const urlValidation = URLSecurityValidator.validateURL(config.webhook_url);
    if (!urlValidation.valid) {
      this.logger.warn(`Slack测试URL安全检查失败: ${urlValidation.error}`);
      throw new BadRequestException(
        `Slack Webhook URL安全检查失败: ${urlValidation.error}`,
      );
    }

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(config.webhook_url, { text: "Test message" }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Slack测试连接失败: ${error.message}`);
      return false;
    }
  }

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.webhook_url) {
      errors.push("Webhook URL is required for Slack notification");
    } else if (typeof config.webhook_url !== "string") {
      errors.push("Webhook URL must be a string");
    } else if (!config.webhook_url.startsWith("https://hooks.slack.com/")) {
      errors.push("Webhook URL must be a valid Slack webhook URL");
    } else {
      // 添加SSRF防护验证
      const urlValidation = URLSecurityValidator.validateURL(
        config.webhook_url,
      );
      if (!urlValidation.valid) {
        errors.push(`Webhook URL安全检查失败: ${urlValidation.error}`);
      }
    }

    if (!config.channel) {
      errors.push("Channel is required for Slack notification");
    } else if (typeof config.channel !== "string") {
      errors.push("Channel must be a string");
    } else if (
      !config.channel.startsWith("#") &&
      !config.channel.startsWith("@")
    ) {
      errors.push("Channel must start with # or @");
    }

    if (config.username && typeof config.username !== "string") {
      errors.push("Username must be a string");
    }

    if (config.icon_emoji && typeof config.icon_emoji !== "string") {
      errors.push("Icon emoji must be a string");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      [AlertSeverity.CRITICAL]: "danger",
      [AlertSeverity.WARNING]: "warning",
      [AlertSeverity.INFO]: "good",
    };
    return colors[severity] || "warning";
  }
}
