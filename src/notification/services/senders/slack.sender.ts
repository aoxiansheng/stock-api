/**
 * Slack通知发送器
 * 🎯 负责Slack通知的发送和验证
 *
 * @description 从Alert模块迁移的Slack发送器，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { HttpService } from "@nestjs/axios";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";
import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";
import { NotificationConfigService } from "../notification-config.service";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";
import { NOTIFICATION_ERROR_CODES } from "../../constants/notification-error-codes.constants";

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationResult,
  NotificationSender,
  Notification,
  NotificationPriority,
} from "../../types/notification.types";

// 使用独立类型，避免Alert模块依赖
import {
  NotificationSeverity,
  NotificationAlertTypeUtil,
} from "../../types/notification-alert.types";

@Injectable()
export class SlackSender implements NotificationSender {
  type = NotificationChannelType.SLACK;
  private readonly logger = createLogger(SlackSender.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: NotificationConfigService,
  ) {}

  /**
   * 发送Slack通知
   */
  async send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    // SSRF防护检查 - 失败时直接抛出异常，不被catch捕获
    const urlValidation = URLSecurityValidator.validateURL(
      channelConfig.webhook_url,
    );
    if (!urlValidation.valid) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Slack Webhook URL security validation failed: ${urlValidation.error}`,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'sendSlackNotification',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          url: channelConfig.webhook_url,
          validationError: urlValidation.error,
          customErrorCode: NOTIFICATION_ERROR_CODES.INVALID_CHANNEL_CONFIG,
          reason: 'slack_url_security_validation_failed'
        },
        retryable: false
      });
    }

    try {
      // 构建Slack消息格式
      const payload = this.buildSlackPayload(notification, channelConfig);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(channelConfig.webhook_url, payload, {
          timeout:
            channelConfig.timeout || this.configService.getDefaultTimeout(),
        }),
      );

      // 与其他Sender保持一致：非200状态时success为false，但不包含error字段
      if (response.status === 200) {
        this.logger.log(`Slack通知发送成功`, {
          notificationId: notification.id,
          channel: channelConfig.channel,
          duration: Date.now() - startTime,
        });

        return {
          success: true,
          channelId: notification.channelId,
          channelType: this.type,
          message: "Slack 消息发送成功",
          sentAt: new Date(),
          duration: Date.now() - startTime,
          deliveryId: `slack_${Date.now()}`,
        };
      } else {
        this.logger.warn(`Slack API返回非成功状态码`, {
          notificationId: notification.id,
          status: response.status,
          statusText: response.statusText,
        });

        return {
          success: false,
          channelId: notification.channelId,
          channelType: this.type,
          message: `Slack API 返回状态码: ${response.status}`,
          sentAt: new Date(),
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      this.logger.error(`Slack发送失败`, {
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
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 测试Slack配置
   */
  async test(config: Record<string, any>): Promise<boolean> {
    // SSRF防护检查 - 失败时抛出异常
    const urlValidation = URLSecurityValidator.validateURL(config.webhook_url);
    if (!urlValidation.valid) {
      this.logger.warn(`Slack测试URL安全检查失败: ${urlValidation.error}`);
      throw UniversalExceptionFactory.createBusinessException({
        message: `Slack Webhook URL security validation failed: ${urlValidation.error}`,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'testSlackConnection',
        component: ComponentIdentifier.NOTIFICATION,
        context: {
          url: config.webhook_url,
          validationError: urlValidation.error,
          customErrorCode: NOTIFICATION_ERROR_CODES.INVALID_CHANNEL_CONFIG,
          reason: 'slack_url_security_validation_failed'
        },
        retryable: false
      });
    }

    try {
      const testPayload = {
        channel: config.channel,
        username: config.username || "NotificationBot",
        icon_emoji: config.icon_emoji || ":bell:",
        text: "🔔 通知配置测试",
        attachments: [
          {
            color: "good",
            text: "如果您收到此消息，说明Slack通知配置正常工作。",
            footer: "NotificationService Test",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(config.webhook_url, testPayload, {
          timeout: this.configService.getDefaultTimeout(),
        }),
      );

      this.logger.log("Slack配置测试完成", {
        channel: config.channel,
        status: response.status,
      });

      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Slack测试连接失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证Slack配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.webhook_url) {
      errors.push("Slack Webhook URL是必填项");
    } else if (typeof config.webhook_url !== "string") {
      errors.push("Webhook URL必须是字符串");
    } else if (!config.webhook_url.startsWith("https://hooks.slack.com/")) {
      errors.push("Webhook URL必须是有效的Slack webhook地址");
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
      errors.push("Slack频道是必填项");
    } else if (typeof config.channel !== "string") {
      errors.push("频道名称必须是字符串");
    } else if (
      !config.channel.startsWith("#") &&
      !config.channel.startsWith("@")
    ) {
      errors.push("频道名称必须以 # 或 @ 开头");
    }

    if (config.username && typeof config.username !== "string") {
      errors.push("用户名必须是字符串");
    }

    if (config.icon_emoji && typeof config.icon_emoji !== "string") {
      errors.push("图标表情必须是字符串");
    }

    if (
      config.timeout &&
      (typeof config.timeout !== "number" || config.timeout <= 0)
    ) {
      errors.push("超时时间必须是正数");
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
      required: ["webhook_url", "channel"],
      properties: {
        webhook_url: {
          type: "string",
          format: "uri",
          pattern: "^https://hooks\\.slack\\.com/",
          description: "Slack Webhook URL",
        },
        channel: {
          type: "string",
          pattern: "^[#@]",
          description: "Slack频道或用户名（以#或@开头）",
        },
        username: {
          type: "string",
          description: "机器人用户名",
          default: "NotificationBot",
        },
        icon_emoji: {
          type: "string",
          description: "机器人图标表情",
          default: ":bell:",
        },
        timeout: {
          type: "number",
          description: "请求超时时间(毫秒)",
          minimum: 1000,
          maximum: 30000,
          default: 15000,
        },
      },
    };
  }

  /**
   * 构建Slack消息载荷
   * @private
   */
  private buildSlackPayload(
    notification: Notification,
    config: Record<string, any>,
  ): Record<string, any> {
    const basePayload = {
      channel: config.channel,
      username: config.username || "NotificationBot",
      icon_emoji: config.icon_emoji || ":bell:",
      text: `*${notification.title}*`,
    };

    // 构建附件信息
    const attachments = [
      {
        color: this.getPriorityColor(notification.priority),
        text: notification.content,
        fields: [
          { title: "通知ID", value: notification.id, short: true },
          { title: "警告ID", value: notification.alertId, short: true },
          {
            title: "优先级",
            value: notification.priority.toUpperCase(),
            short: true,
          },
          {
            title: "状态",
            value: notification.status.toUpperCase(),
            short: true,
          },
          { title: "接收者", value: notification.recipient, short: true },
        ],
        footer: "NotificationService",
        ts: Math.floor(notification.createdAt.getTime() / 1000),
      },
    ];

    // 如果有扩展元数据，添加到字段中
    if (notification.metadata) {
      const metadataFields = Object.entries(notification.metadata)
        .slice(0, 5) // 限制显示的元数据字段数量
        .map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        }));

      attachments[0].fields.push(...metadataFields);
    }

    return {
      ...basePayload,
      attachments,
    };
  }

  /**
   * 获取优先级对应的颜色
   * @private
   */
  private getPriorityColor(priority: NotificationPriority): string {
    const colors = {
      [NotificationPriority.CRITICAL]: "danger",
      [NotificationPriority.URGENT]: "danger",
      [NotificationPriority.HIGH]: "warning",
      [NotificationPriority.NORMAL]: "good",
      [NotificationPriority.LOW]: "good",
    };
    return colors[priority] || "warning";
  }
}
