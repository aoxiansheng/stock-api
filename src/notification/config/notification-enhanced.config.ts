/**
 * Notification Enhanced Configuration
 * 🎯 基于四层配置体系标准的增强型通知配置
 * 
 * @description 集中管理通知系统的所有可调优配置参数
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 */

import { registerAs } from '@nestjs/config';
import { 
  IsNumber, 
  IsBoolean, 
  IsString, 
  Min, 
  Max,
  validateSync 
} from 'class-validator';
import { plainToClass } from 'class-transformer';

export class NotificationEnhancedConfig {
  
  // ================================
  // 批处理配置 (从constants迁移)
  // ================================
  
  @IsNumber() @Min(1) @Max(100)
  defaultBatchSize: number = parseInt(process.env.NOTIFICATION_DEFAULT_BATCH_SIZE, 10) || 10;
  
  @IsNumber() @Min(1) @Max(500)
  maxBatchSize: number = parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE, 10) || 100;
  
  @IsNumber() @Min(1) @Max(50)
  maxConcurrency: number = parseInt(process.env.NOTIFICATION_MAX_CONCURRENCY, 10) || 5;
  
  @IsNumber() @Min(1000) @Max(300000)
  batchTimeout: number = parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT, 10) || 60000;

  // ================================
  // 超时配置 (从constants迁移，支持环境差异化)
  // ================================
  
  @IsNumber() @Min(1000) @Max(120000)
  emailTimeout: number = parseInt(process.env.NOTIFICATION_EMAIL_TIMEOUT, 10) || 30000;
  
  @IsNumber() @Min(1000) @Max(30000)
  smsTimeout: number = parseInt(process.env.NOTIFICATION_SMS_TIMEOUT, 10) || 5000;
  
  @IsNumber() @Min(1000) @Max(60000)
  webhookTimeout: number = parseInt(process.env.NOTIFICATION_WEBHOOK_TIMEOUT, 10) || 10000;
  
  @IsNumber() @Min(1000) @Max(60000)
  slackTimeout: number = parseInt(process.env.NOTIFICATION_SLACK_TIMEOUT, 10) || 15000;
  
  @IsNumber() @Min(1000) @Max(60000)
  dingtalkTimeout: number = parseInt(process.env.NOTIFICATION_DINGTALK_TIMEOUT, 10) || 10000;
  
  @IsNumber() @Min(1000) @Max(120000)
  defaultTimeout: number = parseInt(process.env.NOTIFICATION_DEFAULT_TIMEOUT, 10) || 15000;

  // ================================
  // 重试配置 (从constants迁移，性能调优参数)
  // ================================
  
  @IsNumber() @Min(1) @Max(10)
  maxRetryAttempts: number = parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS, 10) || 3;
  
  @IsNumber() @Min(100) @Max(10000)
  initialRetryDelay: number = parseInt(process.env.NOTIFICATION_INITIAL_RETRY_DELAY, 10) || 1000;
  
  @IsNumber() @Min(1) @Max(5)
  retryBackoffMultiplier: number = parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER) || 2;
  
  @IsNumber() @Min(1000) @Max(300000)
  maxRetryDelay: number = parseInt(process.env.NOTIFICATION_MAX_RETRY_DELAY, 10) || 30000;
  
  @IsNumber() @Min(0) @Max(1)
  jitterFactor: number = parseFloat(process.env.NOTIFICATION_JITTER_FACTOR) || 0.1;

  // ================================
  // 优先级权重配置 (从constants迁移，业务权重可调整)
  // ================================
  
  @IsNumber() @Min(1) @Max(200)
  criticalPriorityWeight: number = parseInt(process.env.NOTIFICATION_CRITICAL_PRIORITY_WEIGHT, 10) || 100;
  
  @IsNumber() @Min(1) @Max(150)
  urgentPriorityWeight: number = parseInt(process.env.NOTIFICATION_URGENT_PRIORITY_WEIGHT, 10) || 80;
  
  @IsNumber() @Min(1) @Max(100)
  highPriorityWeight: number = parseInt(process.env.NOTIFICATION_HIGH_PRIORITY_WEIGHT, 10) || 60;
  
  @IsNumber() @Min(1) @Max(80)
  normalPriorityWeight: number = parseInt(process.env.NOTIFICATION_NORMAL_PRIORITY_WEIGHT, 10) || 40;
  
  @IsNumber() @Min(1) @Max(50)
  lowPriorityWeight: number = parseInt(process.env.NOTIFICATION_LOW_PRIORITY_WEIGHT, 10) || 20;

  // ================================
  // 验证配置 (从constants迁移，业务规则可调整)
  // ================================
  
  @IsNumber() @Min(1) @Max(10)
  variableNameMinLength: number = parseInt(process.env.NOTIFICATION_VARIABLE_NAME_MIN_LENGTH, 10) || 1;
  
  @IsNumber() @Min(1) @Max(1000)
  variableNameMaxLength: number = parseInt(process.env.NOTIFICATION_VARIABLE_NAME_MAX_LENGTH, 10) || 50;
  
  @IsNumber() @Min(1) @Max(100)
  minTemplateLength: number = parseInt(process.env.NOTIFICATION_MIN_TEMPLATE_LENGTH, 10) || 1;
  
  @IsNumber() @Min(1) @Max(20000)
  maxTemplateLength: number = parseInt(process.env.NOTIFICATION_MAX_TEMPLATE_LENGTH, 10) || 10000;
  
  @IsNumber() @Min(1) @Max(5000)
  titleMaxLength: number = parseInt(process.env.NOTIFICATION_TITLE_MAX_LENGTH, 10) || 200;
  
  @IsNumber() @Min(1) @Max(20000)
  contentMaxLength: number = parseInt(process.env.NOTIFICATION_CONTENT_MAX_LENGTH, 10) || 2000;

  // ================================
  // 功能开关配置 (运行时可控制)
  // ================================
  
  @IsBoolean()
  enableBatchProcessing: boolean = process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING !== 'false';
  
  @IsBoolean()
  enableRetryMechanism: boolean = process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM !== 'false';
  
  @IsBoolean()
  enablePriorityQueue: boolean = process.env.NOTIFICATION_ENABLE_PRIORITY_QUEUE !== 'false';
  
  @IsBoolean()
  enableMetricsCollection: boolean = process.env.NOTIFICATION_ENABLE_METRICS_COLLECTION !== 'false';

  // ================================
  // 模板配置 (从现有config迁移)
  // ================================
  
  @IsString()
  defaultTemplate: string = process.env.NOTIFICATION_DEFAULT_TEMPLATE || 'alert_fired';
  
  @IsString()
  emailSubjectTemplate: string = process.env.NOTIFICATION_EMAIL_SUBJECT_TEMPLATE || '[{severity}] {ruleName} - {status}';

  // ================================
  // 辅助方法：根据渠道类型获取超时配置
  // ================================
  
  getChannelTimeout(channelType: string): number {
    const channelTimeouts = {
      'email': this.emailTimeout,
      'sms': this.smsTimeout,
      'webhook': this.webhookTimeout,
      'slack': this.slackTimeout,
      'dingtalk': this.dingtalkTimeout,
    };
    return channelTimeouts[channelType.toLowerCase()] || this.defaultTimeout;
  }
  
  // ================================
  // 辅助方法：根据优先级获取权重
  // ================================
  
  getPriorityWeight(priority: string): number {
    const priorityWeights = {
      'critical': this.criticalPriorityWeight,
      'urgent': this.urgentPriorityWeight,
      'high': this.highPriorityWeight,
      'normal': this.normalPriorityWeight,
      'low': this.lowPriorityWeight,
    };
    return priorityWeights[priority.toLowerCase()] || this.normalPriorityWeight;
  }
}

export default registerAs('notificationEnhanced', (): NotificationEnhancedConfig => {
  const rawConfig = {
    defaultBatchSize: parseInt(process.env.NOTIFICATION_DEFAULT_BATCH_SIZE, 10) || 10,
    maxBatchSize: parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE, 10) || 100,
    maxConcurrency: parseInt(process.env.NOTIFICATION_MAX_CONCURRENCY, 10) || 5,
    batchTimeout: parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT, 10) || 60000,
    emailTimeout: parseInt(process.env.NOTIFICATION_EMAIL_TIMEOUT, 10) || 30000,
    smsTimeout: parseInt(process.env.NOTIFICATION_SMS_TIMEOUT, 10) || 5000,
    webhookTimeout: parseInt(process.env.NOTIFICATION_WEBHOOK_TIMEOUT, 10) || 10000,
    slackTimeout: parseInt(process.env.NOTIFICATION_SLACK_TIMEOUT, 10) || 15000,
    dingtalkTimeout: parseInt(process.env.NOTIFICATION_DINGTALK_TIMEOUT, 10) || 10000,
    defaultTimeout: parseInt(process.env.NOTIFICATION_DEFAULT_TIMEOUT, 10) || 15000,
    maxRetryAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS, 10) || 3,
    initialRetryDelay: parseInt(process.env.NOTIFICATION_INITIAL_RETRY_DELAY, 10) || 1000,
    retryBackoffMultiplier: parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER) || 2,
    maxRetryDelay: parseInt(process.env.NOTIFICATION_MAX_RETRY_DELAY, 10) || 30000,
    jitterFactor: parseFloat(process.env.NOTIFICATION_JITTER_FACTOR) || 0.1,
    criticalPriorityWeight: parseInt(process.env.NOTIFICATION_CRITICAL_PRIORITY_WEIGHT, 10) || 100,
    urgentPriorityWeight: parseInt(process.env.NOTIFICATION_URGENT_PRIORITY_WEIGHT, 10) || 80,
    highPriorityWeight: parseInt(process.env.NOTIFICATION_HIGH_PRIORITY_WEIGHT, 10) || 60,
    normalPriorityWeight: parseInt(process.env.NOTIFICATION_NORMAL_PRIORITY_WEIGHT, 10) || 40,
    lowPriorityWeight: parseInt(process.env.NOTIFICATION_LOW_PRIORITY_WEIGHT, 10) || 20,
    variableNameMinLength: parseInt(process.env.NOTIFICATION_VARIABLE_NAME_MIN_LENGTH, 10) || 1,
    variableNameMaxLength: parseInt(process.env.NOTIFICATION_VARIABLE_NAME_MAX_LENGTH, 10) || 50,
    minTemplateLength: parseInt(process.env.NOTIFICATION_MIN_TEMPLATE_LENGTH, 10) || 1,
    maxTemplateLength: parseInt(process.env.NOTIFICATION_MAX_TEMPLATE_LENGTH, 10) || 10000,
    titleMaxLength: parseInt(process.env.NOTIFICATION_TITLE_MAX_LENGTH, 10) || 200,
    contentMaxLength: parseInt(process.env.NOTIFICATION_CONTENT_MAX_LENGTH, 10) || 2000,
    enableBatchProcessing: process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING !== 'false',
    enableRetryMechanism: process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM !== 'false',
    enablePriorityQueue: process.env.NOTIFICATION_ENABLE_PRIORITY_QUEUE !== 'false',
    enableMetricsCollection: process.env.NOTIFICATION_ENABLE_METRICS_COLLECTION !== 'false',
    defaultTemplate: process.env.NOTIFICATION_DEFAULT_TEMPLATE || 'alert_fired',
    emailSubjectTemplate: process.env.NOTIFICATION_EMAIL_SUBJECT_TEMPLATE || '[{severity}] {ruleName} - {status}',
  };

  const config = plainToClass(NotificationEnhancedConfig, rawConfig);
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    throw new Error(`Notification configuration validation failed: ${errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ')}`);
  }

  return config;
});

export type NotificationConfig = NotificationEnhancedConfig;