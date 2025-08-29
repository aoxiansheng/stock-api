import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { SmartCacheOrchestratorConfig } from '../interfaces/smart-cache-config.interface';
import { CacheStrategy } from '../interfaces/smart-cache-orchestrator.interface';

/**
 * SmartCache配置工厂类
 * 
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - CPU核心数感知的智能默认值计算
 * - 完整的配置验证和类型安全
 * - 12-Factor App配置外部化最佳实践
 * 
 * 支持的环境变量：
 * - SMART_CACHE_*: 基础配置参数
 * - CACHE_STRONG_*: 强时效性策略配置
 * - CACHE_WEAK_*: 弱时效性策略配置
 * - CACHE_MARKET_*: 市场感知策略配置
 * - CACHE_ADAPTIVE_*: 自适应策略配置
 * 
 * 使用场景：
 * - Docker容器环境配置
 * - Kubernetes ConfigMap/Secret集成
 * - 开发/测试/生产环境差异化配置
 */
@Injectable()
export class SmartCacheConfigFactory {
  private static readonly logger = new Logger(SmartCacheConfigFactory.name);

  /**
   * 创建SmartCache配置实例
   * 基于环境变量和系统资源生成优化的配置
   */
  static createConfig(): SmartCacheOrchestratorConfig {
    const cpuCores = os.cpus().length;
    const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
    
    this.logger.log(`Creating SmartCache config - CPU cores: ${cpuCores}, Total memory: ${totalMemoryMB}MB`);
    
    const config: SmartCacheOrchestratorConfig = {
      // 基础配置 - 支持环境变量覆盖
      defaultMinUpdateInterval: this.parseIntEnv(
        'SMART_CACHE_MIN_UPDATE_INTERVAL', 
        30000 // 默认30秒，沿用Query现网值
      ),
      
      maxConcurrentUpdates: this.parseIntEnv(
        'SMART_CACHE_MAX_CONCURRENT',
        // 智能默认值：基于CPU核心数，最小2，最大16
        Math.min(Math.max(2, cpuCores), 16)
      ),
      
      gracefulShutdownTimeout: this.parseIntEnv(
        'SMART_CACHE_SHUTDOWN_TIMEOUT',
        30000 // 30秒，与QueryService保持一致
      ),
      
      enableBackgroundUpdate: this.parseBoolEnv(
        'SMART_CACHE_ENABLE_BACKGROUND_UPDATE',
        true
      ),
      
      enableDataChangeDetection: this.parseBoolEnv(
        'SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION',
        true
      ),
      
      enableMetrics: this.parseBoolEnv(
        'SMART_CACHE_ENABLE_METRICS',
        true
      ),
      
      // 策略配置映射
      strategies: {
        // 强时效性策略 - Receiver场景
        [CacheStrategy.STRONG_TIMELINESS]: {
          ttl: this.parseIntEnv('CACHE_STRONG_TTL', 60), // 1分钟
          enableBackgroundUpdate: this.parseBoolEnv('CACHE_STRONG_BACKGROUND_UPDATE', true),
          updateThresholdRatio: this.parseFloatEnv('CACHE_STRONG_THRESHOLD', 0.3), // 30%
          forceRefreshInterval: this.parseIntEnv('CACHE_STRONG_REFRESH_INTERVAL', 300), // 5分钟
          enableDataChangeDetection: this.parseBoolEnv('CACHE_STRONG_DATA_CHANGE_DETECTION', true),
        },
        
        // 弱时效性策略 - Query场景
        [CacheStrategy.WEAK_TIMELINESS]: {
          ttl: this.parseIntEnv('CACHE_WEAK_TTL', 300), // 5分钟
          enableBackgroundUpdate: this.parseBoolEnv('CACHE_WEAK_BACKGROUND_UPDATE', true),
          updateThresholdRatio: this.parseFloatEnv('CACHE_WEAK_THRESHOLD', 0.2), // 20%
          minUpdateInterval: this.parseIntEnv('CACHE_WEAK_MIN_UPDATE', 60), // 1分钟
          enableDataChangeDetection: this.parseBoolEnv('CACHE_WEAK_DATA_CHANGE_DETECTION', true),
        },
        
        // 市场感知策略 - 股票交易场景
        [CacheStrategy.MARKET_AWARE]: {
          openMarketTtl: this.parseIntEnv('CACHE_MARKET_OPEN_TTL', 30), // 开市30秒
          closedMarketTtl: this.parseIntEnv('CACHE_MARKET_CLOSED_TTL', 1800), // 闭市30分钟
          enableBackgroundUpdate: this.parseBoolEnv('CACHE_MARKET_BACKGROUND_UPDATE', true),
          marketStatusCheckInterval: this.parseIntEnv('CACHE_MARKET_CHECK_INTERVAL', 300), // 5分钟
          openMarketUpdateThresholdRatio: this.parseFloatEnv('CACHE_MARKET_OPEN_THRESHOLD', 0.3),
          closedMarketUpdateThresholdRatio: this.parseFloatEnv('CACHE_MARKET_CLOSED_THRESHOLD', 0.1),
          enableDataChangeDetection: this.parseBoolEnv('CACHE_MARKET_DATA_CHANGE_DETECTION', true),
        },
        
        // 无缓存策略
        [CacheStrategy.NO_CACHE]: {
          bypassCache: this.parseBoolEnv('CACHE_NO_CACHE_BYPASS', true),
          enableMetrics: this.parseBoolEnv('CACHE_NO_CACHE_METRICS', true),
        },
        
        // 自适应策略 - 智能调整
        [CacheStrategy.ADAPTIVE]: {
          baseTtl: this.parseIntEnv('CACHE_ADAPTIVE_BASE_TTL', 180), // 3分钟
          minTtl: this.parseIntEnv('CACHE_ADAPTIVE_MIN_TTL', 30), // 30秒
          maxTtl: this.parseIntEnv('CACHE_ADAPTIVE_MAX_TTL', 3600), // 1小时
          adaptationFactor: this.parseFloatEnv('CACHE_ADAPTIVE_FACTOR', 1.5),
          enableBackgroundUpdate: this.parseBoolEnv('CACHE_ADAPTIVE_BACKGROUND_UPDATE', true),
          changeDetectionWindow: this.parseIntEnv('CACHE_ADAPTIVE_DETECTION_WINDOW', 3600), // 1小时
          enableDataChangeDetection: this.parseBoolEnv('CACHE_ADAPTIVE_DATA_CHANGE_DETECTION', true),
        },
      },
    };

    // 配置验证
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      this.logger.error(`SmartCache configuration validation failed:`, validationErrors);
      throw new Error(`SmartCache configuration validation failed: ${validationErrors.join(', ')}`);
    }

    // 记录关键配置信息
    this.logger.log(`SmartCache configuration created successfully:`, {
      maxConcurrentUpdates: config.maxConcurrentUpdates,
      enableBackgroundUpdate: config.enableBackgroundUpdate,
      enableMetrics: config.enableMetrics,
      strongTtl: config.strategies[CacheStrategy.STRONG_TIMELINESS].ttl,
      weakTtl: config.strategies[CacheStrategy.WEAK_TIMELINESS].ttl,
    });

    return config;
  }

  /**
   * 解析整数型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @param min 最小值（可选）
   * @param max 最大值（可选）
   */
  private static parseIntEnv(key: string, defaultValue: number, min?: number, max?: number): number {
    const value = process.env[key];
    if (!value) {
      this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.logger.warn(`Invalid integer value for ${key}: '${value}', using default: ${defaultValue}`);
      return defaultValue;
    }

    // 边界检查
    if (min !== undefined && parsed < min) {
      this.logger.warn(`Value for ${key} (${parsed}) below minimum (${min}), using minimum`);
      return min;
    }
    if (max !== undefined && parsed > max) {
      this.logger.warn(`Value for ${key} (${parsed}) above maximum (${max}), using maximum`);
      return max;
    }

    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析浮点数型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @param min 最小值（可选）
   * @param max 最大值（可选）
   */
  private static parseFloatEnv(key: string, defaultValue: number, min?: number, max?: number): number {
    const value = process.env[key];
    if (!value) {
      this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      return defaultValue;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      this.logger.warn(`Invalid float value for ${key}: '${value}', using default: ${defaultValue}`);
      return defaultValue;
    }

    // 边界检查
    if (min !== undefined && parsed < min) {
      this.logger.warn(`Value for ${key} (${parsed}) below minimum (${min}), using minimum`);
      return min;
    }
    if (max !== undefined && parsed > max) {
      this.logger.warn(`Value for ${key} (${parsed}) above maximum (${max}), using maximum`);
      return max;
    }

    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析布尔型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   */
  private static parseBoolEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      return defaultValue;
    }

    const lowerValue = value.toLowerCase();
    const parsedValue = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
    
    this.logger.debug(`Parsed ${key}: ${parsedValue}`);
    return parsedValue;
  }

  /**
   * 配置验证
   * @param config 配置对象
   * @returns 验证错误数组
   */
  private static validateConfig(config: SmartCacheOrchestratorConfig): string[] {
    const errors: string[] = [];

    // 基础配置验证
    if (config.defaultMinUpdateInterval <= 0) {
      errors.push('defaultMinUpdateInterval must be positive');
    }

    if (config.maxConcurrentUpdates <= 0) {
      errors.push('maxConcurrentUpdates must be positive');
    }

    if (config.maxConcurrentUpdates > 32) {
      errors.push('maxConcurrentUpdates should not exceed 32 for performance reasons');
    }

    if (config.gracefulShutdownTimeout <= 0) {
      errors.push('gracefulShutdownTimeout must be positive');
    }

    // 策略配置验证
    const strategies = config.strategies;

    // 强时效性策略验证
    const strongConfig = strategies[CacheStrategy.STRONG_TIMELINESS];
    if (strongConfig.ttl <= 0) {
      errors.push('STRONG_TIMELINESS: ttl must be positive');
    }
    if (strongConfig.updateThresholdRatio < 0 || strongConfig.updateThresholdRatio > 1) {
      errors.push('STRONG_TIMELINESS: updateThresholdRatio must be between 0 and 1');
    }
    if (strongConfig.forceRefreshInterval <= strongConfig.ttl) {
      errors.push('STRONG_TIMELINESS: forceRefreshInterval should be greater than ttl');
    }

    // 弱时效性策略验证
    const weakConfig = strategies[CacheStrategy.WEAK_TIMELINESS];
    if (weakConfig.ttl <= 0) {
      errors.push('WEAK_TIMELINESS: ttl must be positive');
    }
    if (weakConfig.minUpdateInterval <= 0) {
      errors.push('WEAK_TIMELINESS: minUpdateInterval must be positive');
    }
    if (weakConfig.updateThresholdRatio < 0 || weakConfig.updateThresholdRatio > 1) {
      errors.push('WEAK_TIMELINESS: updateThresholdRatio must be between 0 and 1');
    }

    // 市场感知策略验证
    const marketConfig = strategies[CacheStrategy.MARKET_AWARE];
    if (marketConfig.openMarketTtl <= 0 || marketConfig.closedMarketTtl <= 0) {
      errors.push('MARKET_AWARE: TTL values must be positive');
    }
    if (marketConfig.marketStatusCheckInterval <= 0) {
      errors.push('MARKET_AWARE: marketStatusCheckInterval must be positive');
    }
    if (marketConfig.openMarketUpdateThresholdRatio < 0 || marketConfig.openMarketUpdateThresholdRatio > 1) {
      errors.push('MARKET_AWARE: openMarketUpdateThresholdRatio must be between 0 and 1');
    }
    if (marketConfig.closedMarketUpdateThresholdRatio < 0 || marketConfig.closedMarketUpdateThresholdRatio > 1) {
      errors.push('MARKET_AWARE: closedMarketUpdateThresholdRatio must be between 0 and 1');
    }

    // 自适应策略验证
    const adaptiveConfig = strategies[CacheStrategy.ADAPTIVE];
    if (adaptiveConfig.minTtl >= adaptiveConfig.maxTtl) {
      errors.push('ADAPTIVE: minTtl must be less than maxTtl');
    }
    if (adaptiveConfig.adaptationFactor <= 0) {
      errors.push('ADAPTIVE: adaptationFactor must be positive');
    }
    if (adaptiveConfig.baseTtl < adaptiveConfig.minTtl || adaptiveConfig.baseTtl > adaptiveConfig.maxTtl) {
      errors.push('ADAPTIVE: baseTtl must be between minTtl and maxTtl');
    }
    if (adaptiveConfig.changeDetectionWindow <= 0) {
      errors.push('ADAPTIVE: changeDetectionWindow must be positive');
    }

    return errors;
  }

  /**
   * 获取系统环境信息
   * 用于诊断和监控
   */
  static getSystemInfo() {
    return {
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
    };
  }

  /**
   * 获取当前生效的环境变量
   * 用于调试和配置检查
   */
  static getCurrentEnvVars(): Record<string, string | undefined> {
    const envKeys = [
      // 基础配置
      'SMART_CACHE_MIN_UPDATE_INTERVAL',
      'SMART_CACHE_MAX_CONCURRENT',
      'SMART_CACHE_SHUTDOWN_TIMEOUT',
      'SMART_CACHE_ENABLE_BACKGROUND_UPDATE',
      'SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION',
      'SMART_CACHE_ENABLE_METRICS',
      
      // 强时效性策略
      'CACHE_STRONG_TTL',
      'CACHE_STRONG_BACKGROUND_UPDATE',
      'CACHE_STRONG_THRESHOLD',
      'CACHE_STRONG_REFRESH_INTERVAL',
      'CACHE_STRONG_DATA_CHANGE_DETECTION',
      
      // 弱时效性策略
      'CACHE_WEAK_TTL',
      'CACHE_WEAK_BACKGROUND_UPDATE',
      'CACHE_WEAK_THRESHOLD',
      'CACHE_WEAK_MIN_UPDATE',
      'CACHE_WEAK_DATA_CHANGE_DETECTION',
      
      // 市场感知策略
      'CACHE_MARKET_OPEN_TTL',
      'CACHE_MARKET_CLOSED_TTL',
      'CACHE_MARKET_BACKGROUND_UPDATE',
      'CACHE_MARKET_CHECK_INTERVAL',
      'CACHE_MARKET_OPEN_THRESHOLD',
      'CACHE_MARKET_CLOSED_THRESHOLD',
      'CACHE_MARKET_DATA_CHANGE_DETECTION',
      
      // 自适应策略
      'CACHE_ADAPTIVE_BASE_TTL',
      'CACHE_ADAPTIVE_MIN_TTL',
      'CACHE_ADAPTIVE_MAX_TTL',
      'CACHE_ADAPTIVE_FACTOR',
      'CACHE_ADAPTIVE_BACKGROUND_UPDATE',
      'CACHE_ADAPTIVE_DETECTION_WINDOW',
      'CACHE_ADAPTIVE_DATA_CHANGE_DETECTION',
    ];

    const result: Record<string, string | undefined> = {};
    envKeys.forEach(key => {
      result[key] = process.env[key];
    });

    return result;
  }
}