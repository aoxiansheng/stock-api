/**
 * Notification Configuration Service
 * 🎯 通知系统配置访问和业务逻辑辅助服务
 *
 * @description 提供统一的配置访问接口，消除硬编码配置
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
 */

import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationUnifiedConfig,
  NotificationBatchConfig,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
} from "../config/notification-unified.config";
import {
  NotificationChannelType,
  NotificationPriority,
} from "../types/notification.types";

@Injectable()
export class NotificationConfigService {
  private readonly config: NotificationUnifiedConfig;

  constructor(private readonly configService: ConfigService) {
    this.config =
      this.configService.get<NotificationUnifiedConfig>("notification");
    if (!this.config) {
      throw new Error("Notification configuration not found");
    }
  }

  // ========================= 批处理配置访问方法 =========================

  /**
   * 获取默认批处理大小
   */
  getDefaultBatchSize(): number {
    return this.config.batch.defaultBatchSize;
  }

  /**
   * 获取最大批处理大小
   */
  getMaxBatchSize(): number {
    return this.config.batch.maxBatchSize;
  }

  /**
   * 获取最大并发数
   */
  getMaxConcurrency(): number {
    return this.config.batch.maxConcurrency;
  }

  /**
   * 获取批处理超时时间
   */
  getBatchTimeout(): number {
    return this.config.batch.batchTimeout;
  }

  /**
   * 获取批处理配置对象
   */
  getBatchConfig(): NotificationBatchConfig {
    return this.config.batch;
  }

  // ========================= 超时配置访问方法 =========================

  /**
   * 获取默认超时时间
   */
  getDefaultTimeout(): number {
    return this.config.timeouts.defaultTimeout;
  }

  /**
   * 获取邮件超时时间
   */
  getEmailTimeout(): number {
    return this.config.timeouts.emailTimeout;
  }

  /**
   * 获取短信超时时间
   */
  getSmsTimeout(): number {
    return this.config.timeouts.smsTimeout;
  }

  /**
   * 获取Webhook超时时间
   */
  getWebhookTimeout(): number {
    return this.config.timeouts.webhookTimeout;
  }

  /**
   * 获取超时配置对象
   */
  getTimeoutConfig(): NotificationTimeoutConfig {
    return this.config.timeouts;
  }

  // ========================= 重试配置访问方法 =========================

  /**
   * 获取最大重试次数
   */
  getMaxRetryAttempts(): number {
    return this.config.retry.maxRetryAttempts;
  }

  /**
   * 获取初始重试延迟
   */
  getInitialRetryDelay(): number {
    return this.config.retry.initialRetryDelay;
  }

  /**
   * 获取重试退避倍数
   */
  getRetryBackoffMultiplier(): number {
    return this.config.retry.retryBackoffMultiplier;
  }

  /**
   * 获取最大重试延迟
   */
  getMaxRetryDelay(): number {
    return this.config.retry.maxRetryDelay;
  }

  /**
   * 获取抖动因子
   */
  getJitterFactor(): number {
    return this.config.retry.jitterFactor;
  }

  /**
   * 获取重试配置对象
   */
  getRetryConfig(): NotificationRetryConfig {
    return this.config.retry;
  }

  // ========================= 验证配置访问方法 =========================

  /**
   * 获取变量名最小长度
   */
  getVariableNameMinLength(): number {
    return this.config.validation.variableNameMinLength;
  }

  /**
   * 获取变量名最大长度
   */
  getVariableNameMaxLength(): number {
    return this.config.validation.variableNameMaxLength;
  }

  /**
   * 获取模板最小长度
   */
  getMinTemplateLength(): number {
    return this.config.validation.minTemplateLength;
  }

  /**
   * 获取模板最大长度
   */
  getMaxTemplateLength(): number {
    return this.config.validation.maxTemplateLength;
  }

  /**
   * 获取标题最大长度
   */
  getTitleMaxLength(): number {
    return this.config.validation.titleMaxLength;
  }

  /**
   * 获取内容最大长度
   */
  getContentMaxLength(): number {
    return this.config.validation.contentMaxLength;
  }

  /**
   * 获取验证配置对象
   */
  getValidationConfig(): NotificationValidationConfig {
    return this.config.validation;
  }

  // ========================= 功能开关配置访问方法 =========================

  /**
   * 是否启用批处理
   */
  isBatchProcessingEnabled(): boolean {
    return this.config.features.enableBatchProcessing;
  }

  /**
   * 是否启用重试机制
   */
  isRetryMechanismEnabled(): boolean {
    return this.config.features.enableRetryMechanism;
  }

  /**
   * 是否启用优先级队列
   */
  isPriorityQueueEnabled(): boolean {
    return this.config.features.enablePriorityQueue;
  }

  /**
   * 是否启用指标收集
   */
  isMetricsCollectionEnabled(): boolean {
    return this.config.features.enableMetricsCollection;
  }

  /**
   * 获取功能配置对象
   */
  getFeatureConfig(): NotificationFeatureConfig {
    return this.config.features;
  }

  // ========================= 模板配置访问方法 =========================

  /**
   * 获取默认文本模板
   */
  getDefaultTextTemplate(): string {
    return this.config.templates.defaultTextTemplate;
  }

  /**
   * 获取默认邮件主题模板
   */
  getDefaultEmailSubjectTemplate(): string {
    return this.config.templates.defaultEmailSubjectTemplate;
  }

  /**
   * 获取模板配置对象
   */
  getTemplateConfig(): NotificationTemplateConfig {
    return this.config.templates;
  }

  // ========================= 业务逻辑辅助方法 =========================

  /**
   * 根据渠道类型获取对应的超时时间
   * @param channelType 通知渠道类型
   * @returns 超时时间（毫秒）
   */
  getChannelTimeout(channelType: NotificationChannelType): number {
    switch (channelType) {
      case "email":
        return this.getEmailTimeout();
      case "sms":
        return this.getSmsTimeout();
      case "webhook":
        return this.getWebhookTimeout();
      case "slack":
      case "dingtalk":
      case "log":
      default:
        return this.getDefaultTimeout();
    }
  }

  /**
   * 计算重试延迟时间
   * @param attemptNumber 重试次数（从1开始）
   * @returns 延迟时间（毫秒）
   */
  calculateRetryDelay(attemptNumber: number): number {
    if (attemptNumber <= 0) {
      return 0;
    }

    const {
      initialRetryDelay,
      retryBackoffMultiplier,
      maxRetryDelay,
      jitterFactor,
    } = this.config.retry;

    // 计算指数退避延迟
    const baseDelay =
      initialRetryDelay * Math.pow(retryBackoffMultiplier, attemptNumber - 1);

    // 限制最大延迟
    const cappedDelay = Math.min(baseDelay, maxRetryDelay);

    // 添加抖动以避免雷群效应
    const jitter = cappedDelay * jitterFactor * (Math.random() - 0.5);
    const finalDelay = Math.max(0, cappedDelay + jitter);

    return Math.round(finalDelay);
  }

  /**
   * 验证批处理大小是否有效
   * @param batchSize 批处理大小
   * @returns 是否有效
   */
  isValidBatchSize(batchSize: number): boolean {
    return batchSize > 0 && batchSize <= this.getMaxBatchSize();
  }

  /**
   * 验证并发数是否有效
   * @param concurrency 并发数
   * @returns 是否有效
   */
  isValidConcurrency(concurrency: number): boolean {
    return concurrency > 0 && concurrency <= this.getMaxConcurrency();
  }

  /**
   * 验证重试次数是否有效
   * @param retryCount 重试次数
   * @returns 是否有效
   */
  isValidRetryCount(retryCount: number): boolean {
    return retryCount >= 0 && retryCount <= this.getMaxRetryAttempts();
  }

  /**
   * 验证变量名是否符合长度要求
   * @param variableName 变量名
   * @returns 是否有效
   */
  isValidVariableName(variableName: string): boolean {
    const length = variableName.length;
    return (
      length >= this.getVariableNameMinLength() &&
      length <= this.getVariableNameMaxLength()
    );
  }

  /**
   * 验证模板内容是否符合长度要求
   * @param template 模板内容
   * @returns 是否有效
   */
  isValidTemplate(template: string): boolean {
    const length = template.length;
    return (
      length >= this.getMinTemplateLength() &&
      length <= this.getMaxTemplateLength()
    );
  }

  /**
   * 验证标题是否符合长度要求
   * @param title 标题
   * @returns 是否有效
   */
  isValidTitle(title: string): boolean {
    return title.length <= this.getTitleMaxLength();
  }

  /**
   * 验证内容是否符合长度要求
   * @param content 内容
   * @returns 是否有效
   */
  isValidContent(content: string): boolean {
    return content.length <= this.getContentMaxLength();
  }

  /**
   * 获取安全的批处理大小（确保不超过最大值）
   * @param requestedSize 请求的批处理大小
   * @returns 安全的批处理大小
   */
  getSafeBatchSize(requestedSize?: number): number {
    if (!requestedSize || requestedSize <= 0) {
      return this.getDefaultBatchSize();
    }
    return Math.min(requestedSize, this.getMaxBatchSize());
  }

  /**
   * 获取安全的并发数（确保不超过最大值）
   * @param requestedConcurrency 请求的并发数
   * @returns 安全的并发数
   */
  getSafeConcurrency(requestedConcurrency?: number): number {
    if (!requestedConcurrency || requestedConcurrency <= 0) {
      return this.getMaxConcurrency();
    }
    return Math.min(requestedConcurrency, this.getMaxConcurrency());
  }

  /**
   * 获取完整的配置对象（用于调试和监控）
   */
  getAllConfig(): NotificationUnifiedConfig {
    return this.config;
  }
}
