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
export class LogSender implements NotificationSender {
  type = NotificationType.LOG;
  private readonly logger = createLogger("AlertLog");

  async send(
    alert: Alert,
    rule: AlertRule,
    config: Record<string, any>,
  ): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      const logMessage = `[ALERT] ${rule.name}: ${alert.message}`;
      const logData = {
        alertId: alert.id,
        ruleId: rule.id,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        severity: alert.severity,
        status: alert.status,
      };

      switch (config.level) {
        case "error":
          this.logger.error(logData, logMessage);
          break;
        case "warn":
          this.logger.warn(logData, logMessage);
          break;
        case "debug":
          this.logger.debug(logData, logMessage);
          break;
        default:
          this.logger.log(logData, logMessage);
      }

      return {
        success: true,
        channelId: config.id || "log",
        channelType: this.type,
        message: "日志记录成功",
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error({ error: error.stack }, "日志发送失败");
      return {
        success: false,
        channelId: config.id || "log",
        channelType: this.type,
        error: error.message,
        sentAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  async test(config: Record<string, any>): Promise<boolean> {
    return ["error", "warn", "info", "debug", "log"].includes(config.level);
  }

  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const validLevels = ["error", "warn", "info", "debug", "log"];

    if (!config.level) {
      errors.push("Log level is required");
    } else if (typeof config.level !== "string") {
      errors.push("Log level must be a string");
    } else if (!validLevels.includes(config.level)) {
      errors.push(`Log level must be one of: ${validLevels.join(", ")}`);
    }

    if (config.id && typeof config.id !== "string") {
      errors.push("Channel ID must be a string");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
