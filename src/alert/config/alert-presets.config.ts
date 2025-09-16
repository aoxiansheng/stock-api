/**
 * Alert预设配置类
 * 🎯 Alert模块预设配置管理
 * 📊 支持规则预设、通知预设和性能预设配置
 * 
 * @author Alert配置优化任务
 * @created 2025-01-10
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Alert规则预设配置
 * 不同复杂度规则的预设参数
 */
export class AlertRulePresets {
  /**
   * 快速规则持续时间
   * 适用于简单告警规则
   */
  @IsNumber() @Min(10) @Max(300)
  quickDuration: number = parseInt(process.env.ALERT_PRESET_QUICK_DURATION, 10) || 30;
  
  /**
   * 标准规则持续时间
   * 适用于常规告警规则
   */
  @IsNumber() @Min(30) @Max(600) 
  standardDuration: number = parseInt(process.env.ALERT_PRESET_STANDARD_DURATION, 10) || 60;
  
  /**
   * 复杂规则持续时间
   * 适用于复杂告警规则
   */
  @IsNumber() @Min(60) @Max(1800)
  complexDuration: number = parseInt(process.env.ALERT_PRESET_COMPLEX_DURATION, 10) || 120;
  
  /**
   * 复杂规则冷却期
   * 复杂规则的特殊冷却时间
   */
  @IsNumber() @Min(300) @Max(7200)
  complexCooldown: number = parseInt(process.env.ALERT_PRESET_COMPLEX_COOLDOWN, 10) || 600;
}

/**
 * Alert通知预设配置
 * 不同优先级通知的预设参数
 */
export class AlertNotificationPresets {
  /**
   * 即时通知超时时间
   * 高优先级通知的超时设置
   */
  @IsNumber() @Min(1000) @Max(30000)
  instantTimeout: number = parseInt(process.env.ALERT_PRESET_INSTANT_TIMEOUT, 10) || 5000;
  
  /**
   * 即时通知重试次数
   * 高优先级通知的重试设置
   */
  @IsNumber() @Min(1) @Max(10)
  instantRetries: number = parseInt(process.env.ALERT_PRESET_INSTANT_RETRIES, 10) || 5;
  
  /**
   * 标准通知超时时间
   * 普通优先级通知的超时设置
   */
  @IsNumber() @Min(5000) @Max(60000)
  standardTimeout: number = parseInt(process.env.ALERT_PRESET_STANDARD_TIMEOUT, 10) || 30000;
  
  /**
   * 标准通知重试次数
   * 普通优先级通知的重试设置
   */
  @IsNumber() @Min(1) @Max(5)
  standardRetries: number = parseInt(process.env.ALERT_PRESET_STANDARD_RETRIES, 10) || 3;
  
  /**
   * 批量通知批次大小
   * 批量处理通知的大小限制
   */
  @IsNumber() @Min(10) @Max(200)
  batchSize: number = parseInt(process.env.ALERT_PRESET_BATCH_SIZE, 10) || 50;
}

/**
 * Alert性能预设配置
 * 不同性能级别的预设参数
 */
export class AlertPerformancePresets {
  /**
   * 高性能并发数
   * 高性能模式的最大并发数
   */
  @IsNumber() @Min(10) @Max(50)
  highPerformanceConcurrency: number = parseInt(process.env.ALERT_PRESET_HIGH_CONCURRENCY, 10) || 20;
  
  /**
   * 高性能批处理大小
   * 高性能模式的批处理大小
   */
  @IsNumber() @Min(500) @Max(2000)
  highPerformanceBatchSize: number = parseInt(process.env.ALERT_PRESET_HIGH_BATCH_SIZE, 10) || 1000;
  
  /**
   * 平衡模式并发数
   * 平衡模式的并发设置
   */
  @IsNumber() @Min(3) @Max(20)
  balancedConcurrency: number = parseInt(process.env.ALERT_PRESET_BALANCED_CONCURRENCY, 10) || 5;
  
  /**
   * 平衡模式批处理大小
   * 平衡模式的批处理大小
   */
  @IsNumber() @Min(50) @Max(500)
  balancedBatchSize: number = parseInt(process.env.ALERT_PRESET_BALANCED_BATCH_SIZE, 10) || 100;
  
  /**
   * 保守模式并发数
   * 资源节约模式的并发设置
   */
  @IsNumber() @Min(1) @Max(10)
  conservativeConcurrency: number = parseInt(process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY, 10) || 3;
  
  /**
   * 保守模式批处理大小
   * 资源节约模式的批处理大小
   */
  @IsNumber() @Min(10) @Max(100)
  conservativeBatchSize: number = parseInt(process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE, 10) || 50;
}

/**
 * Alert预设配置主类
 * 包含所有预设配置的组合
 */
export class AlertPresetsConfig {
  /**
   * 规则预设配置
   */
  @ValidateNested()
  @Type(() => AlertRulePresets)
  rulePresets: AlertRulePresets = new AlertRulePresets();
  
  /**
   * 通知预设配置
   */
  @ValidateNested()
  @Type(() => AlertNotificationPresets)
  notificationPresets: AlertNotificationPresets = new AlertNotificationPresets();
  
  /**
   * 性能预设配置
   */
  @ValidateNested()
  @Type(() => AlertPerformancePresets)
  performancePresets: AlertPerformancePresets = new AlertPerformancePresets();
}

/**
 * Alert预设配置注册
 * 创建并验证配置实例
 */
export default registerAs('alertPresets', () => new AlertPresetsConfig());