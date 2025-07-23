import { Injectable, BadRequestException, OnModuleInit } from "@nestjs/common";

import { createLogger } from "@common/config/logger.config";

import { notificationConfig } from "../../common/config/notification.config";
// 更新导入路径，从utils导入NotificationTemplateUtil
import {
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
} from "../constants/notification.constants";

// 从工具文件导入NotificationTemplateUtil
import { NotificationTemplateUtil } from "../utils/notification.utils";

//import { IAlert, IAlertRule } from '../interfaces/alert.interface';
import {
  NotificationSender,
  NotificationResult,
  BatchNotificationResult,
  NotificationTemplate,
  NotificationChannel,
  NotificationChannelType,
  Alert,
  AlertRule,
} from "../types/alert.types";

// 🎯 引入新配置和 Senders

import {
  EmailSender,
  WebhookSender,
  SlackSender,
  LogSender,
  DingTalkSender,
} from "./notification-senders";

// 🎯 引入通知服务常量

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = createLogger(NotificationService.name);
  private readonly senders = new Map<NotificationChannelType, NotificationSender>();

  constructor(
    private readonly emailSender: EmailSender,
    private readonly webhookSender: WebhookSender,
    private readonly slackSender: SlackSender,
    private readonly logSender: LogSender,
    private readonly dingtalkSender: DingTalkSender,
  ) {}

  onModuleInit() {
    this.logger.debug(NOTIFICATION_MESSAGES.SENDERS_INITIALIZED);
    this.initializeSenders();
  }

  /**
   * 发送单个通知
   */
  async sendNotification(
    alert: Alert,
    rule: AlertRule,
    channelConfig: NotificationChannel,
  ): Promise<NotificationResult> {
    const operation = NOTIFICATION_OPERATIONS.SEND_NOTIFICATION;
    const channelType = channelConfig.type as NotificationChannelType;

    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED, {
      operation,
      channelType,
      alertId: alert.id,
      ruleId: rule.id,
    });

    const sender = this.senders.get(channelType);

    if (!sender) {
      const errorMsg = NotificationTemplateUtil.generateErrorMessage(
        "UNSUPPORTED_TYPE",
        { channelType },
      );
      this.logger.warn(errorMsg, { operation, channelType });
      // 🎯 修复: 抛出标准异常，而不是返回错误对象
      throw new BadRequestException(errorMsg);
    }

    // 🎯 修复: 直接调用 sender，让异常自然抛出。
    // sender.send() 在成功时会返回 INotificationResult，失败时应抛出异常。
    // 这将由调用方 (sendBatchNotifications) 捕获。
    const result = await sender.send(alert, rule, channelConfig.config);

    this.logger.debug(NOTIFICATION_MESSAGES.NOTIFICATION_SENT, {
      operation,
      channelType,
      alertId: alert.id,
      success: result.success,
    });

    return result;
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(
    alert: Alert,
    rule: AlertRule,
  ): Promise<BatchNotificationResult> {
    const operation = NOTIFICATION_OPERATIONS.SEND_BATCH_NOTIFICATIONS;
    const startTime = Date.now();
    const results: NotificationResult[] = [];

    this.logger.debug(NOTIFICATION_MESSAGES.BATCH_PROCESSING_STARTED, {
      operation,
      alertId: alert.id,
      ruleId: rule.id,
      channelCount: rule.channels?.length || 0,
      enabledChannelCount:
        rule.channels?.filter((channel) => channel.enabled).length || 0,
    });

    // 🎯 修复: 改造 promise 创建过程，以便在失败时能捕获到对应的渠道信息
    const notificationPromises = rule.channels
      .filter((channel) => channel.enabled)
      .map((channel) =>
        this.sendNotification(alert, rule, channel).catch((error) => {
          // 将渠道信息附加到错误上并重新抛出，以便 allSettled 能捕获
          error.channel = channel;
          throw error;
        }),
      );

    const settledResults = await Promise.allSettled(notificationPromises);

    settledResults.forEach((res) => {
      if (res.status === "fulfilled") {
        results.push(res.value);
      } else {
        // 🎯 修复: 从带有渠道信息的 reason 中安全地提取数据
        const reason = res.reason as Error & { channel: NotificationChannel };
        const failedChannel = reason.channel;

        this.logger.error(NOTIFICATION_MESSAGES.BATCH_NOTIFICATION_FAILED, {
          operation,
          channelType: failedChannel.type,
          channelId: failedChannel.id,
          error: reason.stack || reason.message,
        });

        results.push({
          success: false,
          channelId: failedChannel.id || "unknown",
          channelType: failedChannel.type as NotificationChannelType,
          error: NotificationTemplateUtil.generateErrorMessage(
            "SEND_FAILED_WITH_REASON",
            {
              error: reason.message,
            },
          ),
          sentAt: new Date(),
          duration: 0, // Duration is harder to calculate here, but we can accept this trade-off
        });
      }
    });

    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;
    const duration = Date.now() - startTime;

    this.logger.debug(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_COMPLETED, {
      operation,
      alertId: alert.id,
      total: results.length,
      successful,
      failed,
      duration,
    });

    return {
      total: results.length,
      successful,
      failed,
      results,
      duration,
    };
  }

  /**
   * 测试通知渠道
   */
  async testChannel(
    channelType: NotificationChannelType,
    config: Record<string, any>,
  ): Promise<boolean> {
    const operation = NOTIFICATION_OPERATIONS.TEST_CHANNEL;

    this.logger.debug(NOTIFICATION_MESSAGES.CHANNEL_TEST_STARTED, {
      operation,
      channelType,
    });

    const sender = this.senders.get(channelType);
    if (!sender) {
      throw new BadRequestException(
        NotificationTemplateUtil.generateErrorMessage("UNSUPPORTED_TYPE", {
          channelType,
        }),
      );
    }

    const result = await sender.test(config);

    this.logger.debug(
      result
        ? NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED
        : NOTIFICATION_MESSAGES.CHANNEL_TEST_FAILED,
      {
        operation,
        channelType,
        success: result,
      },
    );

    return result;
  }

  /**
   * 生成通知模板
   */
  generateTemplate(alert: Alert, rule: AlertRule): NotificationTemplate {
    const operation = NOTIFICATION_OPERATIONS.GENERATE_TEMPLATE;

    this.logger.debug(NOTIFICATION_MESSAGES.TEMPLATE_GENERATION_STARTED, {
      operation,
      alertId: alert.id,
      ruleId: rule.id,
    });

    // 使用工具类生成模板变量
    const variables = NotificationTemplateUtil.generateTemplateVariables(
      alert,
      rule,
    );

    // 使用工具类格式化模板
    const subject = NotificationTemplateUtil.formatTemplate(
      notificationConfig.emailSubjectTemplate,
      variables,
    );
    const body = NotificationTemplateUtil.formatTemplate(
      notificationConfig.defaultTemplate,
      variables,
    );

    this.logger.debug(NOTIFICATION_MESSAGES.TEMPLATE_GENERATED, {
      operation,
      alertId: alert.id,
      variableCount: Object.keys(variables).length,
    });

    return {
      subject,
      body,
      variables,
    };
  }

  /**
   * 初始化通知发送器
   */
  private initializeSenders(): void {
    const operation = NOTIFICATION_OPERATIONS.INITIALIZE_SENDERS;

    this.logger.debug(NOTIFICATION_MESSAGES.SENDERS_INITIALIZED, {
      operation,
    });

    const allSenders = [
      this.emailSender,
      this.webhookSender,
      this.slackSender,
      this.logSender,
      this.dingtalkSender,
    ];

    let initializedCount = 0;
    for (const sender of allSenders) {
      if (sender.type) {
        this.senders.set(sender.type, sender);
        initializedCount++;
      }
    }

    this.logger.debug(NOTIFICATION_MESSAGES.SENDERS_INITIALIZED, {
      operation,
      totalSenders: allSenders.length,
      initializedSenders: initializedCount,
      availableTypes: Array.from(this.senders.keys()),
    });
  }
}
