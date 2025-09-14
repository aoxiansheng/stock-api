/**
 * Webhook通知发送器
 * 🎯 负责Webhook通知的发送和验证
 * 
 * @description 从Alert模块迁移的Webhook发送器，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { HttpService } from "@nestjs/axios";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";
import { BadRequestException, Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";
import { OPERATION_LIMITS } from '@common/constants/domain';

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationResult,
  NotificationSender,
  Notification,
} from "../../types/notification.types";

// 使用独立类型，避免Alert模块依赖
// Webhook发送器主要依赖Notification类型，不需要Alert类型

@Injectable()
export class WebhookSender implements NotificationSender {
  type = NotificationChannelType.WEBHOOK;
  private readonly logger = createLogger(WebhookSender.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * 发送Webhook通知
   */
  async send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult> {
    const executionStart = Date.now();

    // SSRF防护检查 - 失败时直接抛出异常，不被catch捕获
    const urlValidation = URLSecurityValidator.validateURL(channelConfig.url);
    if (!urlValidation.valid) {
      throw new BadRequestException(`URL安全检查失败: ${urlValidation.error}`);
    }

    try {
      // 构建Webhook payload
      const payload = this.buildWebhookPayload(notification, channelConfig);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(channelConfig.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NotificationService/1.0',
            ...channelConfig.headers || {},
          },
          timeout: channelConfig.timeout || 30000,
        }),
      );

      // 与其他Sender保持一致：非2xx状态时success为false，但不包含error字段
      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Webhook通知发送成功`, {
          notificationId: notification.id,
          url: channelConfig.url,
          status: response.status,
          duration: Date.now() - executionStart,
        });

        return {
          success: true,
          channelId: notification.channelId,
          channelType: this.type,
          message: `Webhook 调用成功: ${response.status}`,
          sentAt: new Date(),
          duration: Date.now() - executionStart,
          deliveryId: response.headers['x-delivery-id'] || `webhook_${Date.now()}`,
        };
      } else {
        this.logger.warn(`Webhook返回非成功状态码`, {
          notificationId: notification.id,
          status: response.status,
          statusText: response.statusText,
        });

        return {
          success: false,
          channelId: notification.channelId,
          channelType: this.type,
          message: `Webhook 返回状态码: ${response.status}`,
          sentAt: new Date(),
          duration: Date.now() - executionStart,
        };
      }
    } catch (error) {
      this.logger.error(`Webhook发送失败`, {
        notificationId: notification.id,
        url: channelConfig.url,
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
   * 测试Webhook配置
   */
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
      // 发送测试请求
      const testPayload = {
        test: true,
        message: "Webhook配置测试",
        timestamp: new Date().toISOString(),
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(config.url, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NotificationService/1.0 (Test)',
            ...config.headers || {},
          },
          timeout: OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
        }),
      );

      this.logger.log('Webhook配置测试完成', {
        url: config.url,
        status: response.status,
      });

      return response.status >= 200 && response.status < 400;
    } catch (error) {
      this.logger.warn(`Webhook测试连接失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证Webhook配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push("Webhook URL是必填项");
    } else if (typeof config.url !== "string") {
      errors.push("Webhook URL必须是字符串");
    } else {
      try {
        new URL(config.url);

        // 添加SSRF防护验证
        const urlValidation = URLSecurityValidator.validateURL(config.url);
        if (!urlValidation.valid) {
          errors.push(`URL安全检查失败: ${urlValidation.error}`);
        }
      } catch {
        errors.push("URL格式无效");
      }
    }

    if (
      config.timeout &&
      (typeof config.timeout !== "number" || config.timeout <= 0)
    ) {
      errors.push("超时时间必须是正数");
    }

    if (config.headers && typeof config.headers !== "object") {
      errors.push("请求头必须是对象类型");
    } else if (
      config.headers &&
      Object.keys(config.headers).some(
        (h) => h.toLowerCase() === "authorization",
      )
    ) {
      errors.push("出于安全原因，配置中不允许包含 Authorization 头部");
    }

    // 验证HTTP方法
    if (config.method && !['GET', 'POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
      errors.push("HTTP方法必须是 GET, POST, PUT 或 PATCH");
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
      required: ["url"],
      properties: {
        url: {
          type: "string",
          format: "uri",
          description: "Webhook接收地址",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH"],
          default: "POST",
          description: "HTTP请求方法",
        },
        headers: {
          type: "object",
          description: "自定义请求头",
          additionalProperties: {
            type: "string",
          },
        },
        timeout: {
          type: "number",
          description: "请求超时时间(毫秒)",
          minimum: 1000,
          maximum: 60000,
          default: 30000,
        },
        retryOnFailure: {
          type: "boolean",
          description: "失败时是否重试",
          default: true,
        },
        verifySSL: {
          type: "boolean",
          description: "是否验证SSL证书",
          default: true,
        },
      },
    };
  }

  /**
   * 构建Webhook载荷
   * @private
   */
  private buildWebhookPayload(
    notification: Notification,
    config: Record<string, any>
  ): Record<string, any> {
    const basePayload = {
      notification: {
        id: notification.id,
        alertId: notification.alertId,
        title: notification.title,
        content: notification.content,
        priority: notification.priority,
        status: notification.status,
        recipient: notification.recipient,
        createdAt: notification.createdAt,
      },
      channel: {
        id: notification.channelId,
        type: notification.channelType,
      },
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    // 如果配置中有自定义模板，使用自定义格式
    if (config.customPayload) {
      return {
        ...basePayload,
        ...config.customPayload,
      };
    }

    return basePayload;
  }
}