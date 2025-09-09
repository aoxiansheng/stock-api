/**
 * Alert 消息常量
 * 🎯 从 common/constants/domain/alert-domain.constants.ts 剥离的消息模板
 * 专用于 Alert 模块的消息定义
 */

/**
 * 告警消息模板
 * 🎯 统一告警消息格式
 */
export const ALERT_MESSAGES = Object.freeze({
  // 成功消息
  SUCCESS: {
    RULE_CREATED: "告警规则创建成功",
    RULE_UPDATED: "告警规则更新成功",
    RULE_DELETED: "告警规则删除成功",
    ALERT_RESOLVED: "告警已解决",
    ALERT_DISMISSED: "告警已忽略",
  },

  // 错误消息
  ERRORS: {
    RULE_NOT_FOUND: "告警规则不存在",
    INVALID_THRESHOLD: "阈值设置无效",
    INVALID_CONDITION: "告警条件无效",
    NOTIFICATION_FAILED: "通知发送失败",
    EVALUATION_FAILED: "告警评估失败",
  },

  // 状态消息
  STATUS: {
    PROCESSING: "处理中...",
    EVALUATING: "评估中...",
    TRIGGERING: "触发中...",
    NOTIFYING: "发送通知中...",
  },

  // 频率限制消息
  RATE_LIMIT: {
    TRIGGER_RATE_EXCEEDED: "手动触发告警评估频率超出限制，请稍后再试",
    NOTIFICATION_RATE_EXCEEDED: "通知发送频率超出限制，请稍后再试",
  },

  // 验证消息
  VALIDATION: {
    RULE_NAME_REQUIRED: "告警规则名称不能为空",
    RULE_NAME_TOO_LONG: "告警规则名称长度不能超过100字符",
    THRESHOLD_REQUIRED: "阈值不能为空",
    THRESHOLD_INVALID: "阈值必须是有效数字",
    INTERVAL_TOO_SHORT: "时间间隔不能小于30秒",
    INTERVAL_TOO_LONG: "时间间隔不能超过24小时",
  },
});

/**
 * 告警通知消息模板
 * 🎯 统一通知内容格式
 */
export const ALERT_NOTIFICATION_TEMPLATES = Object.freeze({
  // 邮件模板
  EMAIL: {
    SUBJECT_TEMPLATE: "[{severity}] {ruleName} 告警触发",
    BODY_TEMPLATE: `
告警规则: {ruleName}
严重程度: {severity}
触发时间: {timestamp}
当前值: {currentValue}
阈值: {threshold}
描述: {description}
    `.trim(),
  },

  // 短信模板
  SMS: {
    TEMPLATE: "{ruleName} 告警触发，当前值: {currentValue}，阈值: {threshold}",
  },

  // Webhook 模板
  WEBHOOK: {
    PAYLOAD_TEMPLATE: {
      alert: {
        ruleName: "{ruleName}",
        severity: "{severity}",
        status: "{status}",
        currentValue: "{currentValue}",
        threshold: "{threshold}",
        timestamp: "{timestamp}",
        description: "{description}",
      },
    },
  },

  // 推送通知模板
  PUSH: {
    TITLE_TEMPLATE: "{severity} 告警",
    BODY_TEMPLATE: "{ruleName}: {currentValue} (阈值: {threshold})",
  },

  // 应用内通知模板
  IN_APP: {
    TITLE_TEMPLATE: "{ruleName} 告警触发",
    CONTENT_TEMPLATE: "当前值 {currentValue} 超过阈值 {threshold}",
  },
});

/**
 * 告警历史消息
 * 🎯 告警历史记录相关消息
 */
export const ALERT_HISTORY_MESSAGES = Object.freeze({
  ACTIONS: {
    CREATED: "告警创建",
    TRIGGERED: "告警触发",
    RESOLVED: "告警解决",
    DISMISSED: "告警忽略",
    ESCALATED: "告警升级",
    NOTIFICATION_SENT: "通知已发送",
  },

  COMMENTS: {
    AUTO_RESOLVED: "系统自动解决",
    MANUAL_RESOLVED: "用户手动解决",
    AUTO_TRIGGERED: "系统自动触发",
    THRESHOLD_EXCEEDED: "超过阈值触发",
  },
});

/**
 * 消息工具类
 * 🎯 提供消息格式化功能
 */
export class AlertMessageUtil {
  /**
   * 格式化消息模板
   */
  static formatMessage(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 格式化通知消息
   */
  static formatNotification(
    channel: 'email' | 'sms' | 'webhook' | 'push' | 'in_app',
    type: string,
    variables: Record<string, any>
  ): string {
    const templates = ALERT_NOTIFICATION_TEMPLATES[channel.toUpperCase() as keyof typeof ALERT_NOTIFICATION_TEMPLATES];
    const template = (templates as any)[type.toUpperCase()];
    
    if (typeof template === 'string') {
      return this.formatMessage(template, variables);
    }
    
    if (typeof template === 'object') {
      return JSON.stringify(template).replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? String(variables[key]) : match;
      });
    }
    
    return '';
  }

  /**
   * 获取严重程度对应的颜色
   */
  static getSeverityColor(severity: string): string {
    const colorMap = {
      low: '#28a745',      // 绿色
      medium: '#ffc107',   // 黄色
      high: '#fd7e14',     // 橙色
      critical: '#dc3545', // 红色
      emergency: '#6f42c1', // 紫色
    };
    
    return colorMap[severity.toLowerCase() as keyof typeof colorMap] || '#6c757d';
  }

  /**
   * 获取严重程度对应的图标
   */
  static getSeverityIcon(severity: string): string {
    const iconMap = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '❌',
      emergency: '🚨',
    };
    
    return iconMap[severity.toLowerCase() as keyof typeof iconMap] || '📢';
  }
}