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
export class WebhookSender implements NotificationSender {
  type = NotificationChannelType.WEBHOOK;
  private readonly logger = createLogger(WebhookSender.name);

  constructor(private readonly httpService: HttpService) {}

  async send(
    alert: Alert,
    rule: AlertRule,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    // SSRF防护检查 - 失败时直接抛出异常，不被catch捕获
    const urlValidation = URLSecurityValidator.validateURL(config.url);
    if (!urlValidation.valid) {
      throw new BadRequestException(
        `URL安全检查失败: ${urlValidation.error}`,
      );
    }

    try {
      const payload = {
        alert,
        rule: {
          id: rule.id,
          name: rule.name,
          metric: rule.metric,
          severity: rule.severity,
        },
        timestamp: new Date().toISOString(),
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(config.url, payload, {
          headers: config.headers || {},
          timeout: config.timeout || 30000,
        }),
      );

      // 与其他Sender保持一致：非2xx状态时success为false，但不包含error字段
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          channelId: config.id || "webhook",
          channelType: this.type,
          message: `Webhook 调用成功: ${response.status}`,
          sentAt: new Date(),
          duration: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          channelId: config.id || "webhook",
          channelType: this.type,
          message: `Webhook 返回状态码: ${response.status}`,
          sentAt: new Date(),
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      this.logger.error({ error: error.stack }, "Webhook 发送失败");
      return {
        success: false,
        channelId: config.id || "webhook",
        channelType: this.type,
        error: error.message,
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  async test(config: Record<string, any>): Promise<boolean> {
    // SSRF防护检查 - 失败时抛出异常
    const urlValidation = URLSecurityValidator.validateURL(config.url);
    if (!urlValidation.valid) {
      this.logger.warn(`Webhook测试URL安全检查失败: ${urlValidation.error}`);
      throw new BadRequestException(`URL安全检查失败: ${urlValidation.error}`);
    }

    // 检查是否存在潜在的敏感头部
    if (
      config.headers &&
      Object.keys(config.headers).some(
        (h) => h.toLowerCase() === "authorization",
      )
    ) {
      this.logger.warn("Webhook测试配置中检测到潜在的敏感头部 (Authorization)");
      throw new BadRequestException(
        "出于安全原因，测试配置中不允许包含 Authorization 头部",
      );
    }

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(config.url, { timeout: 5000 }),
      );
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      this.logger.warn(`Webhook测试连接失败: ${error.message}`);
      return false;
    }
  }

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push("URL is required for webhook notification");
    } else if (typeof config.url !== "string") {
      errors.push("URL must be a string");
    } else {
      try {
        new URL(config.url);

        // 添加SSRF防护验证
        const urlValidation = URLSecurityValidator.validateURL(config.url);
        if (!urlValidation.valid) {
          errors.push(`URL安全检查失败: ${urlValidation.error}`);
        }
      } catch {
        errors.push("URL must be a valid URL");
      }
    }

    if (
      config.timeout &&
      (typeof config.timeout !== "number" || config.timeout <= 0)
    ) {
      errors.push("Timeout must be a positive number");
    }

    if (config.headers && typeof config.headers !== "object") {
      errors.push("Headers must be an object");
    } else if (
      config.headers &&
      Object.keys(config.headers).some(
        (h) => h.toLowerCase() === "authorization",
      )
    ) {
      errors.push("出于安全原因，配置中不允许包含 Authorization 头部");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
