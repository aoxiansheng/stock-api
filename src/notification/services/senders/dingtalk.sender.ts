/**
 * 钉钉通知发送器
 * 🎯 负责钉钉通知的发送和验证
 * 
 * @description 从Alert模块迁移的钉钉发送器，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import crypto from "crypto";

import { HttpService } from "@nestjs/axios";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";
import { BadRequestException, Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging";
import { URLSecurityValidator } from "@common/utils/url-security-validator.util";

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationResult,
  NotificationSender,
  Notification,
  NotificationPriority,
} from "../../types/notification.types";

@Injectable()
export class DingTalkSender implements NotificationSender {
  type = NotificationChannelType.DINGTALK;
  private readonly logger = createLogger(DingTalkSender.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * 发送钉钉通知
   */
  async send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    // SSRF防护检查
    const urlValidation = URLSecurityValidator.validateURL(channelConfig.webhook);
    if (!urlValidation.valid) {
      throw new BadRequestException(
        `钉钉 Webhook URL安全检查失败: ${urlValidation.error}`,
      );
    }

    try {
      // 构建钉钉消息格式
      const payload = this.buildDingTalkPayload(notification, channelConfig);
      
      // 如果配置了密钥，生成签名
      let url = channelConfig.webhook;
      if (channelConfig.secret) {
        url = this.generateSignedUrl(channelConfig.webhook, channelConfig.secret);
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: channelConfig.timeout || 10000,
        }),
      );

      if (response.status === 200 && response.data.errcode === 0) {
        this.logger.log(`钉钉通知发送成功`, {
          notificationId: notification.id,
          duration: Date.now() - startTime,
        });

        return {
          success: true,
          channelId: notification.channelId,
          channelType: this.type,
          message: "钉钉消息发送成功",
          sentAt: new Date(),
          duration: Date.now() - startTime,
          deliveryId: `dingtalk_${Date.now()}`,
        };
      } else {
        this.logger.warn(`钉钉API返回错误`, {
          notificationId: notification.id,
          errcode: response.data.errcode,
          errmsg: response.data.errmsg,
        });

        return {
          success: false,
          channelId: notification.channelId,
          channelType: this.type,
          message: `钉钉API错误: ${response.data.errmsg || '未知错误'}`,
          sentAt: new Date(),
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      this.logger.error(`钉钉发送失败`, {
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
   * 测试钉钉配置
   */
  async test(config: Record<string, any>): Promise<boolean> {
    // SSRF防护检查
    const urlValidation = URLSecurityValidator.validateURL(config.webhook);
    if (!urlValidation.valid) {
      this.logger.warn(`钉钉测试URL安全检查失败: ${urlValidation.error}`);
      throw new BadRequestException(
        `钉钉 Webhook URL安全检查失败: ${urlValidation.error}`,
      );
    }

    try {
      const testPayload = {
        msgtype: "text",
        text: {
          content: "📢 钉钉通知配置测试\n如果您收到此消息，说明钉钉通知配置正常工作。",
        },
      };

      let url = config.webhook;
      if (config.secret) {
        url = this.generateSignedUrl(config.webhook, config.secret);
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(url, testPayload, {
          timeout: 10000,
        }),
      );

      this.logger.log('钉钉配置测试完成', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
      });

      return response.status === 200 && response.data.errcode === 0;
    } catch (error) {
      this.logger.warn(`钉钉测试连接失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证钉钉配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.webhook) {
      errors.push("钉钉 Webhook URL是必填项");
    } else if (typeof config.webhook !== "string") {
      errors.push("Webhook URL必须是字符串");
    } else if (!config.webhook.startsWith("https://oapi.dingtalk.com/")) {
      errors.push("Webhook URL必须是有效的钉钉机器人地址");
    } else {
      // 添加SSRF防护验证
      const urlValidation = URLSecurityValidator.validateURL(config.webhook);
      if (!urlValidation.valid) {
        errors.push(`Webhook URL安全检查失败: ${urlValidation.error}`);
      }
    }

    if (config.secret && typeof config.secret !== "string") {
      errors.push("密钥必须是字符串");
    }

    if (config.timeout && (typeof config.timeout !== "number" || config.timeout <= 0)) {
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
      required: ["webhook"],
      properties: {
        webhook: {
          type: "string",
          format: "uri",
          pattern: "^https://oapi\\.dingtalk\\.com/",
          description: "钉钉机器人Webhook地址",
        },
        secret: {
          type: "string",
          description: "钉钉机器人签名密钥（可选）",
        },
        timeout: {
          type: "number",
          description: "请求超时时间(毫秒)",
          minimum: 1000,
          maximum: 30000,
          default: 10000,
        },
      },
    };
  }

  /**
   * 构建钉钉消息载荷
   * @private
   */
  private buildDingTalkPayload(
    notification: Notification,
    config: Record<string, any>
  ): Record<string, any> {
    // 钉钉支持多种消息类型，这里使用markdown格式
    const markdownContent = this.buildMarkdownContent(notification);

    return {
      msgtype: "markdown",
      markdown: {
        title: notification.title,
        text: markdownContent,
      },
    };
  }

  /**
   * 构建Markdown格式内容
   * @private
   */
  private buildMarkdownContent(notification: Notification): string {
    const priorityEmoji = this.getPriorityEmoji(notification.priority);
    
    let content = `## ${priorityEmoji} ${notification.title}\n\n`;
    content += `${notification.content}\n\n`;
    content += `---\n\n`;
    content += `**通知详情:**\n`;
    content += `- 通知ID: ${notification.id}\n`;
    content += `- 警告ID: ${notification.alertId}\n`;
    content += `- 优先级: ${notification.priority.toUpperCase()}\n`;
    content += `- 状态: ${notification.status.toUpperCase()}\n`;
    content += `- 接收者: ${notification.recipient}\n`;
    content += `- 创建时间: ${notification.createdAt.toLocaleString('zh-CN')}\n`;

    // 如果有扩展元数据，添加到内容中
    if (notification.metadata && Object.keys(notification.metadata).length > 0) {
      content += `\n**扩展信息:**\n`;
      Object.entries(notification.metadata).forEach(([key, value]) => {
        content += `- ${key}: ${value}\n`;
      });
    }

    return content;
  }

  /**
   * 获取优先级对应的表情符号
   * @private
   */
  private getPriorityEmoji(priority: NotificationPriority): string {
    const emojis = {
      [NotificationPriority.CRITICAL]: "🚨",
      [NotificationPriority.URGENT]: "⚠️",
      [NotificationPriority.HIGH]: "🔴",
      [NotificationPriority.NORMAL]: "🟡",
      [NotificationPriority.LOW]: "🟢",
    };
    return emojis[priority] || "📢";
  }

  /**
   * 生成带签名的URL
   * @private
   */
  private generateSignedUrl(webhook: string, secret: string): string {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${secret}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('base64');

    return `${webhook}&timestamp=${timestamp}&sign=${encodeURIComponent(signature)}`;
  }
}