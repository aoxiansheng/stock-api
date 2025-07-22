import * as crypto from "crypto";

import { HttpService } from "@nestjs/axios";
import { Injectable, BadRequestException } from "@nestjs/common";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";

import { createLogger } from "@common/config/logger.config";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";

import {
  NotificationChannelType,
  Alert,
  AlertRule,
  NotificationResult,
  NotificationSender,
} from "../../types/alert.types";

@Injectable()
export class DingTalkSender implements NotificationSender {
  type = NotificationChannelType.DINGTALK;
  private readonly logger = createLogger(DingTalkSender.name);

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
          `DingTalk Webhook URL安全检查失败: ${urlValidation.error}`,
        );
      }

      const payload = {
        msgtype: "markdown",
        markdown: {
          title: `[${alert.severity.toUpperCase()}] ${rule.name}`,
          text: this.formatDingTalkMessage(alert, rule),
        },
        at: {
          atMobiles: config.at_mobiles || [],
          isAtAll: config.at_all || false,
        },
      };

      const url = this.getSignedUrl(config.webhook_url, config.secret);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(url, payload),
      );

      return {
        success: response.data?.errcode === 0,
        channelId: config.id || "dingtalk",
        channelType: this.type,
        message: "钉钉消息发送成功",
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error({ error: error.stack }, "钉钉发送失败");
      return {
        success: false,
        channelId: config.id || "dingtalk",
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
      this.logger.warn(`DingTalk测试URL安全检查失败: ${urlValidation.error}`);
      throw new BadRequestException(
        `DingTalk Webhook URL安全检查失败: ${urlValidation.error}`,
      );
    }

    try {
      const testPayload = {
        msgtype: "text",
        text: { content: "测试消息" },
      };

      const url = this.getSignedUrl(config.webhook_url, config.secret);
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(url, testPayload),
      );

      return response.data?.errcode === 0;
    } catch (error) {
      this.logger.warn(`DingTalk测试连接失败: ${error.message}`);
      return false;
    }
  }

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.webhook_url) {
      errors.push("Webhook URL is required for DingTalk notification");
    } else if (typeof config.webhook_url !== "string") {
      errors.push("Webhook URL must be a string");
    } else if (
      !config.webhook_url.startsWith("https://oapi.dingtalk.com/robot/send")
    ) {
      errors.push("Webhook URL must be a valid DingTalk webhook URL");
    } else {
      // 添加SSRF防护验证
      const urlValidation = URLSecurityValidator.validateURL(
        config.webhook_url,
      );
      if (!urlValidation.valid) {
        errors.push(`Webhook URL安全检查失败: ${urlValidation.error}`);
      }
    }

    if (!config.secret) {
      errors.push("Secret is required for DingTalk notification");
    } else if (typeof config.secret !== "string") {
      errors.push("Secret must be a string");
    }

    if (config.at_mobiles && !Array.isArray(config.at_mobiles)) {
      errors.push("at_mobiles must be an array");
    }

    if (config.at_all && typeof config.at_all !== "boolean") {
      errors.push("at_all must be a boolean");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getSignedUrl(webhookUrl: string, secret: string): string {
    if (!secret) return webhookUrl;

    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${secret}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(stringToSign)
      .digest("base64");

    const signedUrl = new URL(webhookUrl);
    signedUrl.searchParams.append("timestamp", timestamp.toString());
    signedUrl.searchParams.append("sign", signature);

    return signedUrl.toString();
  }

  private formatDingTalkMessage(alert: Alert, rule: AlertRule): string {
    return `
## ${rule.name}

**严重级别**: ${alert.severity.toUpperCase()}  
**监控指标**: ${alert.metric}  
**当前值**: ${alert.value}  
**阈值**: ${alert.threshold}  
**状态**: ${alert.status}  
**时间**: ${alert.startTime.toLocaleString()}
    `.trim();
  }
}
