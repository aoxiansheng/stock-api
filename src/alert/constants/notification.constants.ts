/**
 * 通知服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

// 📝 操作名称常量
export const NOTIFICATION_OPERATIONS = Object.freeze({
  SEND_NOTIFICATION: 'sendNotification',
  SEND_BATCH_NOTIFICATIONS: 'sendBatchNotifications',
  TEST_CHANNEL: 'testChannel',
  GENERATE_TEMPLATE: 'generateTemplate',
  INITIALIZE_SENDERS: 'initializeSenders',
  FORMAT_STRING: 'formatString',
  VALIDATE_CHANNEL_CONFIG: 'validateChannelConfig',
  GET_SENDER_STATUS: 'getSenderStatus',
  PROCESS_NOTIFICATION_RESULT: 'processNotificationResult',
  HANDLE_NOTIFICATION_ERROR: 'handleNotificationError',
});

// 📢 消息常量
export const NOTIFICATION_MESSAGES = Object.freeze({
  // 成功消息
  NOTIFICATION_SENT: '通知发送成功',
  BATCH_NOTIFICATIONS_COMPLETED: '批量通知发送完成',
  CHANNEL_TEST_PASSED: '通知渠道测试通过',
  TEMPLATE_GENERATED: '通知模板生成成功',
  SENDERS_INITIALIZED: '通知发送器初始化完成',
  NOTIFICATION_PROCESSING_STARTED: '开始处理通知',
  BATCH_PROCESSING_STARTED: '开始批量处理通知',
  TEMPLATE_GENERATION_STARTED: '开始生成通知模板',
  CHANNEL_TEST_STARTED: '开始测试通知渠道',
  
  // 错误消息
  UNSUPPORTED_NOTIFICATION_TYPE: '不支持的通知类型',
  BATCH_NOTIFICATION_FAILED: '批量发送中单个通知执行失败',
  SEND_FAILED: '发送失败',
  CHANNEL_TEST_FAILED: '通知渠道测试失败',
  TEMPLATE_GENERATION_FAILED: '通知模板生成失败',
  SENDER_INITIALIZATION_FAILED: '通知发送器初始化失败',
  NOTIFICATION_PROCESSING_FAILED: '通知处理失败',
  INVALID_CHANNEL_CONFIG: '无效的通知渠道配置',
  SENDER_NOT_AVAILABLE: '通知发送器不可用',
  
  // 警告消息
  NO_ENABLED_CHANNELS: '没有启用的通知渠道',
  PARTIAL_BATCH_SUCCESS: '批量通知部分成功',
  TEMPLATE_VARIABLE_MISSING: '模板变量缺失',
  CHANNEL_CONFIG_INCOMPLETE: '通知渠道配置不完整',
  SENDER_PERFORMANCE_DEGRADED: '通知发送器性能下降',
  
  // 信息消息
  NOTIFICATION_QUEUED: '通知已加入队列',
  BATCH_PROCESSING_PROGRESS: '批量处理进度更新',
  TEMPLATE_VARIABLES_EXTRACTED: '模板变量提取完成',
  CHANNEL_STATUS_CHECKED: '通知渠道状态检查完成',
  SENDER_HEALTH_CHECK: '发送器健康检查完成',
});

// 🎯 错误消息模板常量
export const NOTIFICATION_ERROR_TEMPLATES = Object.freeze({
  UNSUPPORTED_TYPE: '不支持的通知类型: {channelType}',
  SEND_FAILED_WITH_REASON: '发送失败: {error}',
  CHANNEL_TEST_FAILED_WITH_REASON: '通知渠道测试失败: {reason}',
  TEMPLATE_GENERATION_ERROR: '模板生成失败: {error}',
  BATCH_PROCESSING_ERROR: '批量处理失败: 成功 {successful}/{total}，失败 {failed}',
  SENDER_INITIALIZATION_ERROR: '发送器 {senderType} 初始化失败: {error}',
  INVALID_CONFIG: '无效配置: {field} 字段 {issue}',
  TIMEOUT_ERROR: '操作超时: {operation} 耗时超过 {timeout}ms',
});

// 📋 模板变量常量
export const NOTIFICATION_TEMPLATE_VARIABLES = Object.freeze({
  ALERT_ID: 'alertId',
  RULE_NAME: 'ruleName',
  METRIC: 'metric',
  VALUE: 'value',
  THRESHOLD: 'threshold',
  SEVERITY: 'severity',
  STATUS: 'status',
  MESSAGE: 'message',
  START_TIME: 'startTime',
  END_TIME: 'endTime',
  DURATION: 'duration',
  TAGS: 'tags',
  RULE_ID: 'ruleId',
  RULE_DESCRIPTION: 'ruleDescription',
  ALERT_URL: 'alertUrl',
  DASHBOARD_URL: 'dashboardUrl',
});

// 🎨 模板格式化常量
export const NOTIFICATION_TEMPLATE_PATTERNS = Object.freeze({
  VARIABLE_PATTERN: /\{\{(\w+)\}\}/g,
  IF_BLOCK_PATTERN: /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
  UNLESS_BLOCK_PATTERN: /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
  EACH_BLOCK_PATTERN: /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
  COMMENT_PATTERN: /\{\{!--[\s\S]*?--\}\}/g,
});

// 🔧 通知配置常量
export const NOTIFICATION_CONFIG = Object.freeze({
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  BATCH_SIZE_LIMIT: 100,
  TEMPLATE_CACHE_TTL_MS: 300000, // 5分钟
  SENDER_HEALTH_CHECK_INTERVAL_MS: 60000, // 1分钟
  MAX_TEMPLATE_SIZE_BYTES: 10240, // 10KB
  MAX_VARIABLE_COUNT: 50,
});

// 📊 通知类型优先级常量
export const NOTIFICATION_TYPE_PRIORITY = Object.freeze({
  EMAIL: 1,
  SLACK: 2,
  WEBHOOK: 3,
  DINGTALK: 4,
  LOG: 5,
});

// 📈 通知指标常量
export const NOTIFICATION_METRICS = Object.freeze({
  NOTIFICATION_SENT_COUNT: 'notification_sent_count',
  NOTIFICATION_FAILED_COUNT: 'notification_failed_count',
  BATCH_PROCESSING_COUNT: 'notification_batch_processing_count',
  TEMPLATE_GENERATION_COUNT: 'notification_template_generation_count',
  CHANNEL_TEST_COUNT: 'notification_channel_test_count',
  AVERAGE_SEND_DURATION: 'notification_avg_send_duration',
  AVERAGE_BATCH_DURATION: 'notification_avg_batch_duration',
  SENDER_AVAILABILITY: 'notification_sender_availability',
  TEMPLATE_CACHE_HIT_RATE: 'notification_template_cache_hit_rate',
});

// 🔍 验证规则常量
export const NOTIFICATION_VALIDATION_RULES = Object.freeze({
  MIN_TEMPLATE_LENGTH: 1,
  MAX_TEMPLATE_LENGTH: 10000,
  MIN_VARIABLE_NAME_LENGTH: 1,
  MAX_VARIABLE_NAME_LENGTH: 50,
  VARIABLE_NAME_PATTERN: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL_PATTERN: /^https?:\/\/.+/,
});

// ⏰ 时间配置常量
export const NOTIFICATION_TIME_CONFIG = Object.freeze({
  DEFAULT_SEND_TIMEOUT_MS: 10000,
  BATCH_PROCESSING_TIMEOUT_MS: 60000,
  TEMPLATE_GENERATION_TIMEOUT_MS: 5000,
  CHANNEL_TEST_TIMEOUT_MS: 15000,
  SENDER_INITIALIZATION_TIMEOUT_MS: 30000,
  HEALTH_CHECK_TIMEOUT_MS: 5000,
});

// 🚨 告警阈值常量
export const NOTIFICATION_ALERT_THRESHOLDS = Object.freeze({
  MAX_FAILED_PERCENTAGE: 10,
  MAX_RESPONSE_TIME_MS: 5000,
  MIN_SUCCESS_RATE: 0.95,
  MAX_QUEUE_SIZE: 1000,
  MAX_PROCESSING_TIME_MS: 30000,
});

// 🔄 重试配置常量
export const NOTIFICATION_RETRY_CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 10000,
  JITTER_FACTOR: 0.1,
});

/**
 * 通知模板工具函数
 */
export class NotificationTemplateUtil {
  /**
   * 替换错误消息模板中的占位符
   * @param template 模板字符串
   * @param params 参数对象
   * @returns 替换后的字符串
   */
  static replaceErrorTemplate(
    template: string,
    params: Record<string, any>
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 生成错误消息
   * @param templateKey 模板键名
   * @param params 参数对象
   * @returns 错误消息字符串
   */
  static generateErrorMessage(
    templateKey: keyof typeof NOTIFICATION_ERROR_TEMPLATES,
    params: Record<string, any>
  ): string {
    const template = NOTIFICATION_ERROR_TEMPLATES[templateKey];
    return this.replaceErrorTemplate(template, params);
  }

  /**
   * 格式化模板字符串
   * @param template 模板字符串
   * @param variables 变量对象
   * @returns 格式化后的字符串
   */
  static formatTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    // 处理注释
    result = result.replace(NOTIFICATION_TEMPLATE_PATTERNS.COMMENT_PATTERN, '');

    // 处理变量替换
    result = result.replace(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });

    // 处理 if 块
    result = result.replace(NOTIFICATION_TEMPLATE_PATTERNS.IF_BLOCK_PATTERN, (match, key, content) => {
      return variables[key] ? content : '';
    });

    // 处理 unless 块
    result = result.replace(NOTIFICATION_TEMPLATE_PATTERNS.UNLESS_BLOCK_PATTERN, (match, key, content) => {
      return !variables[key] ? content : '';
    });

    return result;
  }

  /**
   * 验证模板变量名称
   * @param variableName 变量名称
   * @returns 是否有效
   */
  static isValidVariableName(variableName: string): boolean {
    return (
      NOTIFICATION_VALIDATION_RULES.VARIABLE_NAME_PATTERN.test(variableName) &&
      variableName.length >= NOTIFICATION_VALIDATION_RULES.MIN_VARIABLE_NAME_LENGTH &&
      variableName.length <= NOTIFICATION_VALIDATION_RULES.MAX_VARIABLE_NAME_LENGTH
    );
  }

  /**
   * 验证模板长度
   * @param template 模板字符串
   * @returns 是否有效
   */
  static isValidTemplateLength(template: string): boolean {
    return (
      template.length >= NOTIFICATION_VALIDATION_RULES.MIN_TEMPLATE_LENGTH &&
      template.length <= NOTIFICATION_VALIDATION_RULES.MAX_TEMPLATE_LENGTH
    );
  }

  /**
   * 提取模板中的变量
   * @param template 模板字符串
   * @returns 变量名称数组
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const matches = template.matchAll(NOTIFICATION_TEMPLATE_PATTERNS.VARIABLE_PATTERN);
    
    for (const match of matches) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }
    
    return Array.from(variables);
  }

  /**
   * 验证邮箱地址
   * @param email 邮箱地址
   * @returns 是否有效
   */
  static isValidEmail(email: string): boolean {
    return NOTIFICATION_VALIDATION_RULES.EMAIL_PATTERN.test(email);
  }

  /**
   * 验证URL
   * @param url URL地址
   * @returns 是否有效
   */
  static isValidUrl(url: string): boolean {
    return NOTIFICATION_VALIDATION_RULES.URL_PATTERN.test(url);
  }

  /**
   * 计算重试延迟
   * @param attempt 重试次数
   * @returns 延迟毫秒数
   */
  static calculateRetryDelay(attempt: number): number {
    const { INITIAL_DELAY_MS, BACKOFF_MULTIPLIER, MAX_DELAY_MS, JITTER_FACTOR } = NOTIFICATION_RETRY_CONFIG;
    
    const baseDelay = Math.min(
      INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
      MAX_DELAY_MS
    );
    
    // 添加抖动
    const jitter = baseDelay * JITTER_FACTOR * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  /**
   * 生成通知模板变量
   * @param alert 告警对象
   * @param rule 规则对象
   * @returns 模板变量对象
   */
  static generateTemplateVariables(alert: any, rule: any): Record<string, any> {
    return {
      [NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID]: alert.id,
      [NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME]: rule.name,
      [NOTIFICATION_TEMPLATE_VARIABLES.METRIC]: alert.metric,
      [NOTIFICATION_TEMPLATE_VARIABLES.VALUE]: alert.value,
      [NOTIFICATION_TEMPLATE_VARIABLES.THRESHOLD]: alert.threshold,
      [NOTIFICATION_TEMPLATE_VARIABLES.SEVERITY]: alert.severity,
      [NOTIFICATION_TEMPLATE_VARIABLES.STATUS]: alert.status,
      [NOTIFICATION_TEMPLATE_VARIABLES.MESSAGE]: alert.message,
      [NOTIFICATION_TEMPLATE_VARIABLES.START_TIME]: alert.startTime?.toLocaleString(),
      [NOTIFICATION_TEMPLATE_VARIABLES.END_TIME]: alert.endTime?.toLocaleString(),
      [NOTIFICATION_TEMPLATE_VARIABLES.DURATION]: alert.endTime
        ? Math.round((alert.endTime.getTime() - alert.startTime.getTime()) / 1000)
        : Math.round((Date.now() - alert.startTime.getTime()) / 1000),
      [NOTIFICATION_TEMPLATE_VARIABLES.TAGS]: alert.tags ? JSON.stringify(alert.tags, null, 2) : undefined,
      [NOTIFICATION_TEMPLATE_VARIABLES.RULE_ID]: rule.id,
      [NOTIFICATION_TEMPLATE_VARIABLES.RULE_DESCRIPTION]: rule.description,
    };
  }
}
