/**
 * 通知系统领域常量
 * 🎯 领域层 - 通知系统相关的业务常量
 * 📢 基于核心层构建，专注于通知业务逻辑
 */

import { CORE_LIMITS } from '../core/limits.constants';
import { CORE_PATTERNS } from '../core/patterns.constants';
import { CORE_TIMEOUTS } from '../core/timeouts.constants';
import { deepFreeze } from "../../../common/utils/object-immutability.util";

/**
 * 通知系统常量
 */
export const NOTIFICATION_CONSTANTS = Object.freeze({
  /**
   * 通知验证规则
   */
  VALIDATION: {
    // 变量名验证
    VARIABLE_NAME_PATTERN: CORE_PATTERNS.TEXT.VARIABLE_NAME,
    VARIABLE_NAME_PATTERN_SOURCE: CORE_PATTERNS.TEXT.VARIABLE_NAME.source,
    VARIABLE_NAME_PATTERN_FLAGS: CORE_PATTERNS.TEXT.VARIABLE_NAME.flags,
    VARIABLE_NAME_MIN_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,     // 1
    VARIABLE_NAME_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.TAG_MAX,        // 50
    
    // 模板验证
    TEMPLATE_MIN_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,          // 1
    TEMPLATE_MAX_LENGTH: CORE_LIMITS.STRING_LENGTH.TEMPLATE_MAX,        // 2000
    MIN_TEMPLATE_LENGTH: CORE_LIMITS.STRING_LENGTH.MIN_LENGTH,          // 1
    MAX_TEMPLATE_LENGTH: CORE_LIMITS.STRING_LENGTH.TEMPLATE_MAX,        // 2000
    
    // 网络验证
    EMAIL_PATTERN: CORE_PATTERNS.NETWORK.EMAIL,
    EMAIL_PATTERN_SOURCE: CORE_PATTERNS.NETWORK.EMAIL.source,
    EMAIL_PATTERN_FLAGS: CORE_PATTERNS.NETWORK.EMAIL.flags,
    URL_PATTERN: CORE_PATTERNS.NETWORK.URL,
    URL_PATTERN_SOURCE: CORE_PATTERNS.NETWORK.URL.source,
    URL_PATTERN_FLAGS: CORE_PATTERNS.NETWORK.URL.flags,
  },

  /**
   * 模板相关配置
   */
  TEMPLATE: {
    // 变量替换模式
    VARIABLE_PATTERN: CORE_PATTERNS.TEMPLATE.VARIABLE_SUBSTITUTION,     // /\{\{(\w+)\}\}/g
    
    // 核心模板变量
    VARIABLES: {
      // 告警基础信息
      ALERT_ID: "alertId",
      RULE_NAME: "ruleName", 
      METRIC: "metric",
      VALUE: "value",
      THRESHOLD: "threshold",
      SEVERITY: "severity",
      STATUS: "status",
      MESSAGE: "message",
      
      // 时间相关
      START_TIME: "startTime",
      END_TIME: "endTime",
      DURATION: "duration",
      
      // 额外信息
      TAGS: "tags",
      RULE_ID: "ruleId",
      RULE_DESCRIPTION: "ruleDescription"
    },
  },

  /**
   * 通知重试配置
   */
  RETRY: {
    MAX_RETRIES: CORE_LIMITS.RETRY_LIMITS.NOTIFICATION_MAX_RETRIES,     // 5
    INITIAL_DELAY_MS: CORE_TIMEOUTS.RETRY_TIMING.INITIAL_DELAY_MS,      // 1000ms
    MAX_DELAY_MS: CORE_TIMEOUTS.RETRY_TIMING.MAX_DELAY_MS,              // 10000ms
    BACKOFF_MULTIPLIER: CORE_TIMEOUTS.RETRY_TIMING.BACKOFF_MULTIPLIER,  // 2
    JITTER_FACTOR: CORE_TIMEOUTS.RETRY_TIMING.JITTER_FACTOR,            // 0.1
  },

  /**
   * 通知超时配置
   */
  TIMEOUTS: {
    SEND_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.NOTIFICATION_SEND,      // 30000ms
    BATCH_TIMEOUT_MS: CORE_TIMEOUTS.OPERATION_TIMEOUTS_MS.NOTIFICATION_BATCH,   // 60000ms
    DEFAULT_TIMEOUT_SECONDS: CORE_TIMEOUTS.BASIC_SECONDS.DEFAULT,               // 30秒
  },
});

/**
 * 通知操作常量
 */
export const NOTIFICATION_OPERATIONS = deepFreeze({
  SEND_NOTIFICATION: "sendNotification",
  SEND_BATCH_NOTIFICATIONS: "sendBatchNotifications",
  TEST_CHANNEL: "testChannel",
  GENERATE_TEMPLATE: "generateTemplate",
  INITIALIZE_SENDERS: "initializeSenders",
  FORMAT_STRING: "formatString",
  VALIDATE_CHANNEL_CONFIG: "validateChannelConfig",
  GET_SENDER_STATUS: "getSenderStatus",
  PROCESS_NOTIFICATION_RESULT: "processNotificationResult",
  HANDLE_NOTIFICATION_ERROR: "handleNotificationError",
});

/**
 * 通知消息常量
 */
export const NOTIFICATION_MESSAGES = deepFreeze({
  // 成功消息
  NOTIFICATION_SENT: "通知发送成功",
  BATCH_NOTIFICATIONS_COMPLETED: "批量通知发送完成",
  CHANNEL_TEST_PASSED: "通知渠道测试通过",
  TEMPLATE_GENERATED: "通知模板生成成功",
  SENDERS_INITIALIZED: "通知发送器初始化完成",
  NOTIFICATION_PROCESSING_STARTED: "开始处理通知",
  BATCH_PROCESSING_STARTED: "开始批量处理通知",
  TEMPLATE_GENERATION_STARTED: "开始生成通知模板",
  CHANNEL_TEST_STARTED: "开始测试通知渠道",

  // 错误消息
  UNSUPPORTED_NOTIFICATION_TYPE: "不支持的通知类型",
  BATCH_NOTIFICATION_FAILED: "批量发送中单个通知执行失败",
  SEND_FAILED: "发送失败",
  CHANNEL_TEST_FAILED: "通知渠道测试失败",
  TEMPLATE_GENERATION_FAILED: "通知模板生成失败",
  SENDER_INITIALIZATION_FAILED: "通知发送器初始化失败",
  NOTIFICATION_PROCESSING_FAILED: "通知处理失败",
  INVALID_CHANNEL_CONFIG: "无效的通知渠道配置",
  SENDER_NOT_AVAILABLE: "通知发送器不可用",

  // 警告消息
  NO_ENABLED_CHANNELS: "没有启用的通知渠道",
  PARTIAL_BATCH_SUCCESS: "批量通知部分成功",
  TEMPLATE_VARIABLE_MISSING: "模板变量缺失",
  CHANNEL_CONFIG_INCOMPLETE: "通知渠道配置不完整",
  SENDER_PERFORMANCE_DEGRADED: "通知发送器性能下降",

  // 信息消息
  NOTIFICATION_QUEUED: "通知已加入队列",
  BATCH_PROCESSING_PROGRESS: "批量处理进度更新",
  TEMPLATE_VARIABLES_EXTRACTED: "模板变量提取完成",
  CHANNEL_STATUS_CHECKED: "通知渠道状态检查完成",
  SENDER_HEALTH_CHECK: "发送器健康检查完成",
});

/**
 * 通知错误模板常量
 */
export const NOTIFICATION_ERROR_TEMPLATES = deepFreeze({
  UNSUPPORTED_TYPE: "不支持的通知类型: {channelType}",
  SEND_FAILED_WITH_REASON: "发送失败: {error}",
  CHANNEL_TEST_FAILED_WITH_REASON: "通知渠道测试失败: {reason}",
  TEMPLATE_GENERATION_ERROR: "模板生成失败: {error}",
  BATCH_PROCESSING_ERROR: "批量处理失败: 成功 {successful}/{total}，失败 {failed}",
  SENDER_INITIALIZATION_ERROR: "发送器 {senderType} 初始化失败: {error}",
  INVALID_CONFIG: "无效配置: {field} 字段 {issue}",
  TIMEOUT_ERROR: "操作超时: {operation} 耗时超过 {timeout}ms",
});

/**
 * 通知工具类
 */
export class NotificationUtil {
  /**
   * 验证变量名格式
   */
  static isValidVariableName(variableName: string): boolean {
    if (typeof variableName !== 'string' || variableName.trim() === '') return false;
    return (
      NOTIFICATION_CONSTANTS.VALIDATION.VARIABLE_NAME_PATTERN.test(variableName) &&
      variableName.length >= NOTIFICATION_CONSTANTS.VALIDATION.VARIABLE_NAME_MIN_LENGTH &&
      variableName.length <= NOTIFICATION_CONSTANTS.VALIDATION.VARIABLE_NAME_MAX_LENGTH
    );
  }

  /**
   * 验证模板长度
   */
  static isValidTemplateLength(template: string): boolean {
    if (typeof template !== 'string') return false;
    return (
      template.length >= NOTIFICATION_CONSTANTS.VALIDATION.TEMPLATE_MIN_LENGTH &&
      template.length <= NOTIFICATION_CONSTANTS.VALIDATION.TEMPLATE_MAX_LENGTH
    );
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    return NOTIFICATION_CONSTANTS.VALIDATION.EMAIL_PATTERN.test(email);
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    return NOTIFICATION_CONSTANTS.VALIDATION.URL_PATTERN.test(url);
  }

  /**
   * 从模板中提取变量
   */
  static extractVariables(template: string): string[] {
    const variables: string[] = [];
    const matches = Array.from(template.matchAll(NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLE_PATTERN));
    
    for (const match of matches) {
      if (match[1] && !variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  /**
   * 替换模板变量
   */
  static replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    return template.replace(NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLE_PATTERN, (match, variableName) => {
      const value = variables[variableName];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成错误消息
   */
  static generateErrorMessage(templateKey: keyof typeof NOTIFICATION_ERROR_TEMPLATES, params: Record<string, any>): string {
    const template = NOTIFICATION_ERROR_TEMPLATES[templateKey];
    return this.replaceTemplateVariables(template, params);
  }

  /**
   * 验证通知配置完整性
   */
  static validateNotificationConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必要字段
    if (!config.enabled && config.enabled !== false) {
      errors.push('缺少 enabled 字段');
    }

    if (typeof config.retryCount !== 'number' || config.retryCount < 0) {
      errors.push('retryCount 必须是非负整数');
    }

    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('timeout 必须是正数');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 计算重试延迟时间
   */
  static calculateRetryDelay(attempt: number): number {
    const { INITIAL_DELAY_MS, MAX_DELAY_MS, BACKOFF_MULTIPLIER, JITTER_FACTOR } = NOTIFICATION_CONSTANTS.RETRY;
    
    // 指数退避
    const delay = Math.min(INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt), MAX_DELAY_MS);
    
    // 添加抖动
    const jitter = delay * JITTER_FACTOR * Math.random();
    
    return Math.floor(delay + jitter);
  }

  /**
   * 检查是否应该重试
   */
  static shouldRetry(attempt: number): boolean {
    return attempt < NOTIFICATION_CONSTANTS.RETRY.MAX_RETRIES;
  }
}

/**
 * 类型定义
 */
export type NotificationConstants = typeof NOTIFICATION_CONSTANTS;
export type NotificationVariable = keyof typeof NOTIFICATION_CONSTANTS.TEMPLATE.VARIABLES;