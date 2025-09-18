/**
 * Notification模块常量定义
 * 🎯 通知相关的所有常量定义
 *
 * @description 从Alert模块拆分出来的通知相关常量
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

// 直接从核心常量导出，避免重复包装
export {
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_VALIDATION_PATTERNS,
  NOTIFICATION_TEMPLATE_VARIABLES,
  NOTIFICATION_ERROR_TEMPLATES,
} from "./notification-core.constants";

// 注意：NOTIFICATION_VALIDATION_LIMITS 由 validation-limits.constants.ts 定义和导出

/**
 * 通知验证常量
 * 🎯 提供通知验证相关的常量，使用通用常量避免重复
 */
import { NOTIFICATION_VALIDATION_LIMITS } from './validation-limits.constants';

export const NOTIFICATION_VALIDATION = Object.freeze({
  // ✅ 使用通用验证限制常量
  LIMITS: {
    // 基础字符串长度限制（从通用常量获取）
    TITLE_MAX_LENGTH: NOTIFICATION_VALIDATION_LIMITS.TITLE_MAX_LENGTH,
    CONTENT_MAX_LENGTH: NOTIFICATION_VALIDATION_LIMITS.CONTENT_MAX_LENGTH_EXTENDED, // 使用扩展版本保持兼容
    URL_MAX_LENGTH: NOTIFICATION_VALIDATION_LIMITS.WEBHOOK_URL_MAX_LENGTH,
    EMAIL_MAX_LENGTH: NOTIFICATION_VALIDATION_LIMITS.EMAIL_MAX_LENGTH,
    PHONE_MAX_LENGTH: NOTIFICATION_VALIDATION_LIMITS.PHONE_MAX_LENGTH,
    // 数组大小限制（从通用常量获取）
    MAX_RECIPIENTS: NOTIFICATION_VALIDATION_LIMITS.MAX_RECIPIENTS,
    MAX_TAGS: NOTIFICATION_VALIDATION_LIMITS.MAX_TAGS,
    // 批量操作限制（从通用常量获取）
    MAX_BATCH_SIZE: NOTIFICATION_VALIDATION_LIMITS.MAX_BATCH_SIZE,
  },

  // ❌ 验证模式已移除 - 直接在验证器装饰器中使用
  // @IsValidEmail, @IsValidUrl, @IsValidPhoneNumber 装饰器已提供相同功能

  // 模板变量定义（保留，这是通知模块特有的业务逻辑）
  VARIABLES: {
    ALERT_ID: "alertId",
    RULE_NAME: "ruleName",
    METRIC: "metric",
    VALUE: "value",
    THRESHOLD: "threshold",
    SEVERITY: "severity",
    STATUS: "status",
    MESSAGE: "message",
    START_TIME: "startTime",
    END_TIME: "endTime",
    DURATION: "duration",
    TAGS: "tags",
  },
});

/**
 * 统一默认文本模板（Handlebars风格）
 * 单一事实来源，供 app 配置与服务使用
 */
export const DEFAULT_TEXT_TEMPLATE = `
告警详情:
- 规则名称: {{ruleName}}
- 监控指标: {{metric}}
- 当前值: {{value}}
- 阈值: {{threshold}}
- 严重级别: {{severity}}
- 状态: {{status}}
- 开始时间: {{startTime}}
- 持续时间: {{duration}}秒
- 告警消息: {{message}}

{{#if tags}}
标签: {{{tags}}}
{{/if}}
`.trim();

/**
 * 统一默认邮件主题模板（Handlebars风格）
 */
export const DEFAULT_EMAIL_SUBJECT_TEMPLATE = `[{{severity}}] {{ruleName}} - {{status}}`;

/**
 * 默认通知模板
 * 🎯 各种通知类型的默认模板
 */
export const DEFAULT_NOTIFICATION_TEMPLATES = Object.freeze({
  ALERT_FIRED: {
    EMAIL: {
      TITLE: "[{severity}] {ruleName} 警告触发",
      CONTENT: `
警告规则: {ruleName}
严重程度: {severity}
触发时间: {startTime}
当前值: {value}
阈值: {threshold}
监控指标: {metric}
描述: {message}

请及时处理此警告。
      `.trim(),
    },
    SMS: {
      CONTENT: "{ruleName} 警告触发，当前值: {value}，阈值: {threshold}",
    },
    WEBHOOK: {
      PAYLOAD: {
        alert: {
          id: "{alertId}",
          ruleName: "{ruleName}",
          severity: "{severity}",
          status: "{status}",
          value: "{value}",
          threshold: "{threshold}",
          metric: "{metric}",
          startTime: "{startTime}",
          message: "{message}",
        },
      },
    },
  },

  ALERT_RESOLVED: {
    EMAIL: {
      TITLE: "[已解决] {ruleName} 警告已恢复",
      CONTENT: `
警告规则: {ruleName}
解决时间: {endTime}
持续时间: {duration}
解决人: {resolvedBy}

此警告已恢复正常。
      `.trim(),
    },
    SMS: {
      CONTENT: "{ruleName} 警告已恢复正常",
    },
  },

  ALERT_ACKNOWLEDGED: {
    EMAIL: {
      TITLE: "[已确认] {ruleName} 警告已确认",
      CONTENT: `
警告规则: {ruleName}
确认人: {acknowledgedBy}
确认时间: {acknowledgedAt}

此警告已被确认，正在处理中。
      `.trim(),
    },
  },
});

/**
 * 通知渠道默认配置
 * 🎯 各通知渠道的默认配置模板
 */
export const DEFAULT_CHANNEL_CONFIGS = Object.freeze({
  EMAIL: {
    smtp: {
      host: "",
      port: 587,
      secure: false,
      auth: {
        user: "",
        pass: "",
      },
    },
    from: "",
    // timeout配置已迁移到NotificationUnifiedConfig
  },

  SMS: {
    provider: "aliyun", // aliyun, tencent, etc.
    accessKeyId: "",
    accessKeySecret: "",
    signName: "",
    templateCode: "",
    // timeout配置已迁移到NotificationUnifiedConfig
  },

  WEBHOOK: {
    url: "",
    method: "POST",
    headers: {},
    // timeout配置已迁移到NotificationUnifiedConfig
    verifySSL: true,
  },

  SLACK: {
    token: "",
    channel: "",
    username: "AlertBot",
    iconEmoji: ":warning:",
    // timeout配置已迁移到NotificationUnifiedConfig
  },

  DINGTALK: {
    webhook: "",
    secret: "",
    // timeout配置已迁移到NotificationUnifiedConfig
  },
});
