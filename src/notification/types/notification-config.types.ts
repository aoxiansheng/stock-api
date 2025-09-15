/**
 * Notification Configuration Types
 * 🎯 通知系统配置接口定义
 */

// 配置接口类型，匹配registerAs返回的对象结构
export interface NotificationConfig {
  // 批处理配置
  defaultBatchSize: number;
  maxBatchSize: number;
  maxConcurrency: number;
  batchTimeout: number;

  // 超时配置
  emailTimeout: number;
  smsTimeout: number;
  webhookTimeout: number;
  slackTimeout: number;
  dingtalkTimeout: number;
  defaultTimeout: number;

  // 重试配置
  maxRetryAttempts: number;
  initialRetryDelay: number;
  retryBackoffMultiplier: number;
  maxRetryDelay: number;
  jitterFactor: number;

  // 优先级权重配置
  criticalPriorityWeight: number;
  urgentPriorityWeight: number;
  highPriorityWeight: number;
  normalPriorityWeight: number;
  lowPriorityWeight: number;

  // 验证配置
  variableNameMinLength: number;
  variableNameMaxLength: number;
  minTemplateLength: number;
  maxTemplateLength: number;
  titleMaxLength: number;
  contentMaxLength: number;

  // 功能开关配置
  enableBatchProcessing: boolean;
  enableRetryMechanism: boolean;
  enablePriorityQueue: boolean;
  enableMetricsCollection: boolean;

  // 模板配置
  defaultTemplate: string;
  emailSubjectTemplate: string;

  // 辅助方法
  getChannelTimeout(channelType: string): number;
  getPriorityWeight(priority: string): number;
}