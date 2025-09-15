/**
 * Notification Enhanced Configuration
 * 🎯 基于四层配置体系标准的增强型通知配置
 * 
 * @description 集中管理通知系统的所有可调优配置参数
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 */

import { registerAs } from '@nestjs/config';

// 移除装饰器验证类，直接使用registerAs函数进行配置注册

export default registerAs('notification', () => {
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
    defaultTemplate: process.env.NOTIFICATION_DEFAULT_TEMPLATE || 'Default notification: {message}',
    emailSubjectTemplate: process.env.NOTIFICATION_EMAIL_SUBJECT_TEMPLATE || '[Alert] {title}',
    
    // 添加辅助方法
    getChannelTimeout(channelType: string): number {
      const channelTimeouts = {
        'email': rawConfig.emailTimeout,
        'sms': rawConfig.smsTimeout,
        'webhook': rawConfig.webhookTimeout,
        'slack': rawConfig.slackTimeout,
        'dingtalk': rawConfig.dingtalkTimeout,
      };
      return channelTimeouts[channelType.toLowerCase()] || rawConfig.defaultTimeout;
    },
    
    getPriorityWeight(priority: string): number {
      const priorityWeights = {
        'critical': rawConfig.criticalPriorityWeight,
        'urgent': rawConfig.urgentPriorityWeight,
        'high': rawConfig.highPriorityWeight,
        'normal': rawConfig.normalPriorityWeight,
        'low': rawConfig.lowPriorityWeight,
      };
      return priorityWeights[priority.toLowerCase()] || rawConfig.normalPriorityWeight;
    }
  };

  // 简单的基础验证
  if (!rawConfig.defaultBatchSize || rawConfig.defaultBatchSize <= 0) {
    throw new Error('Invalid defaultBatchSize configuration');
  }
  
  if (!rawConfig.getChannelTimeout || typeof rawConfig.getChannelTimeout !== 'function') {
    throw new Error('Missing getChannelTimeout helper method');
  }

  return rawConfig;
});