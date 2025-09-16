/**
 * Alert性能配置类
 * 🎯 Alert模块性能相关配置管理
 * 📊 支持环境差异化配置和类型验证
 * 
 * @author Alert配置优化任务
 * @created 2025-01-10
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Alert性能配置类
 * 包含所有可配置的性能参数
 */
export class AlertPerformanceConfig {
  /**
   * 最大并发数
   * 控制Alert系统最大并发处理能力
   */
  @IsNumber() @Min(1) @Max(50)
  maxConcurrency: number = parseInt(process.env.ALERT_MAX_CONCURRENCY, 10) || 5;
  
  /**
   * 队列大小限制
   * Alert任务队列的最大容量
   */
  @IsNumber() @Min(10) @Max(1000)
  queueSizeLimit: number = parseInt(process.env.ALERT_QUEUE_SIZE_LIMIT, 10) || 100;
  
  /**
   * 每分钟速率限制
   * Alert处理的每分钟最大数量
   */
  @IsNumber() @Min(1) @Max(1000)
  rateLimitPerMinute: number = parseInt(process.env.ALERT_RATE_LIMIT_PER_MINUTE, 10) || 100;
  
  /**
   * 批处理大小
   * 批量处理Alert的单次处理数量
   */
  @IsNumber() @Min(1) @Max(1000)
  batchSize: number = parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100;
  
  /**
   * 连接池大小
   * Alert系统数据库连接池大小
   */
  @IsNumber() @Min(1) @Max(50)
  connectionPoolSize: number = parseInt(process.env.ALERT_CONNECTION_POOL_SIZE, 10) || 10;
}

/**
 * Alert性能配置注册
 * 创建并验证配置实例
 */
export default registerAs('alertPerformance', (): AlertPerformanceConfig => {
  const rawConfig = {
    maxConcurrency: parseInt(process.env.ALERT_MAX_CONCURRENCY, 10) || 5,
    queueSizeLimit: parseInt(process.env.ALERT_QUEUE_SIZE_LIMIT, 10) || 100,
    rateLimitPerMinute: parseInt(process.env.ALERT_RATE_LIMIT_PER_MINUTE, 10) || 100,
    batchSize: parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100,
    connectionPoolSize: parseInt(process.env.ALERT_CONNECTION_POOL_SIZE, 10) || 10,
  };

  const config = plainToClass(AlertPerformanceConfig, rawConfig);
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    throw new Error(`Alert performance configuration validation failed: ${errors.map(e => Object.values(e.constraints).join(', ')).join('; ')}`);
  }

  return config;
});