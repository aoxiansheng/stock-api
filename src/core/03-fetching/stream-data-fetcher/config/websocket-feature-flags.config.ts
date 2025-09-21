import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { createLogger } from '@common/logging/index';

/**
 * WebSocket特性开关配置接口
 *
 * 🎯 目标：
 * - 提供Gateway-only模式的可控开关
 * - 支持紧急回退机制
 * - 生产环境安全部署控制
 */
export interface WebSocketFeatureFlagsConfig {
  /** 是否启用Gateway-only模式（默认: true） */
  gatewayOnlyMode: boolean;

  /** 是否允许Legacy模式回退（紧急情况，默认: false） */
  allowLegacyFallback: boolean;

  /** 是否启用严格模式（禁用所有Legacy代码路径，默认: true） */
  strictMode: boolean;

  /** 特性开关验证模式（development|production，默认: production） */
  validationMode: 'development' | 'production';

  /** 监控WebSocket架构健康状态的间隔（毫秒，默认: 30000） */
  healthCheckInterval: number;

  /** Gateway不可用时的最大等待时间（毫秒，默认: 5000） */
  gatewayFailoverTimeout: number;
}

/**
 * WebSocket特性开关服务
 *
 * 🚀 功能特点：
 * - 环境变量控制的特性开关
 * - 动态配置更新支持
 * - 生产环境安全防护
 * - 详细的开关状态日志
 */
@Injectable()
export class WebSocketFeatureFlagsService {
  private readonly logger = createLogger('WebSocketFeatureFlags');
  private config: WebSocketFeatureFlagsConfig;
  private lastHealthCheck: Date = new Date();

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadFeatureFlags();
    this.validateFeatureFlags();
    this.logFeatureFlagStatus();
  }

  /**
   * 获取当前特性开关配置
   */
  getFeatureFlags(): WebSocketFeatureFlagsConfig {
    return { ...this.config };
  }

  /**
   * 检查Gateway-only模式是否启用
   */
  isGatewayOnlyModeEnabled(): boolean {
    return this.config.gatewayOnlyMode;
  }

  /**
   * 检查是否允许Legacy回退
   */
  isLegacyFallbackAllowed(): boolean {
    return this.config.allowLegacyFallback;
  }

  /**
   * 检查是否为严格模式
   */
  isStrictModeEnabled(): boolean {
    return this.config.strictMode;
  }

  /**
   * 获取健康检查间隔
   */
  getHealthCheckInterval(): number {
    return this.config.healthCheckInterval;
  }

  /**
   * 获取Gateway故障转移超时时间
   */
  getGatewayFailoverTimeout(): number {
    return this.config.gatewayFailoverTimeout;
  }

  /**
   * 动态更新特性开关（仅开发环境）
   */
  updateFeatureFlags(updates: Partial<WebSocketFeatureFlagsConfig>): boolean {
    if (this.config.validationMode === 'production') {
      this.logger.warn('生产环境禁止动态更新特性开关', {
        attemptedUpdates: updates,
        currentMode: this.config.validationMode
      });
      return false;
    }

    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    this.validateFeatureFlags();

    this.logger.log('特性开关已更新', {
      oldConfig: this.sanitizeConfig(oldConfig),
      newConfig: this.sanitizeConfig(this.config),
      updatedFields: Object.keys(updates)
    });

    return true;
  }

  /**
   * 紧急启用Legacy回退模式
   * 仅在Gateway完全不可用时使用
   */
  emergencyEnableLegacyFallback(reason: string): boolean {
    if (this.config.strictMode) {
      this.logger.error('严格模式下禁止启用Legacy回退', {
        reason,
        strictMode: this.config.strictMode,
        emergency: true
      });
      return false;
    }

    this.config.allowLegacyFallback = true;

    this.logger.warn('🚨 紧急启用Legacy回退模式', {
      reason,
      timestamp: new Date().toISOString(),
      previousState: {
        gatewayOnlyMode: this.config.gatewayOnlyMode,
        allowLegacyFallback: false
      },
      newState: {
        gatewayOnlyMode: this.config.gatewayOnlyMode,
        allowLegacyFallback: true
      }
    });

    return true;
  }

  /**
   * 获取特性开关健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    flags: WebSocketFeatureFlagsConfig;
    lastCheck: Date;
    recommendations: string[];
  } {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastHealthCheck.getTime();
    const recommendations: string[] = [];

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // 检查配置一致性
    if (this.config.gatewayOnlyMode && this.config.allowLegacyFallback) {
      status = 'degraded';
      recommendations.push('Gateway-only模式下启用Legacy回退可能导致架构不一致');
    }

    // 检查严格模式与回退模式的冲突
    if (this.config.strictMode && this.config.allowLegacyFallback) {
      status = 'critical';
      recommendations.push('严格模式与Legacy回退模式冲突，需要立即解决');
    }

    // 检查健康检查间隔
    if (timeSinceLastCheck > this.config.healthCheckInterval * 2) {
      status = status === 'healthy' ? 'degraded' : status;
      recommendations.push('健康检查间隔过长，建议增加检查频率');
    }

    this.lastHealthCheck = now;

    return {
      status,
      flags: { ...this.config },
      lastCheck: this.lastHealthCheck,
      recommendations
    };
  }

  /**
   * 验证Gateway架构准备状态
   */
  validateGatewayReadiness(): {
    ready: boolean;
    reason?: string;
    canProceed: boolean;
  } {
    const health = this.getHealthStatus();

    if (health.status === 'critical') {
      return {
        ready: false,
        reason: `特性开关状态异常: ${health.recommendations.join(', ')}`,
        canProceed: false
      };
    }

    if (!this.config.gatewayOnlyMode) {
      return {
        ready: false,
        reason: 'Gateway-only模式未启用',
        canProceed: false
      };
    }

    if (this.config.allowLegacyFallback && this.config.strictMode) {
      return {
        ready: false,
        reason: '配置冲突：严格模式与Legacy回退不能同时启用',
        canProceed: false
      };
    }

    return {
      ready: true,
      canProceed: true
    };
  }

  /**
   * 从环境变量加载特性开关配置
   * @private
   */
  private loadFeatureFlags(): WebSocketFeatureFlagsConfig {
    return {
      gatewayOnlyMode: this.getEnvBoolean('WS_GATEWAY_ONLY_MODE', true),
      allowLegacyFallback: this.getEnvBoolean('WS_ALLOW_LEGACY_FALLBACK', false),
      strictMode: this.getEnvBoolean('WS_STRICT_MODE', true),
      validationMode: this.getEnvString('WS_VALIDATION_MODE', 'production') as 'development' | 'production',
      healthCheckInterval: this.getEnvNumber('WS_HEALTH_CHECK_INTERVAL', 30000),
      gatewayFailoverTimeout: this.getEnvNumber('WS_GATEWAY_FAILOVER_TIMEOUT', 5000)
    };
  }

  /**
   * 验证特性开关配置的有效性
   * @private
   */
  private validateFeatureFlags(): void {
    const errors: string[] = [];

    // 验证模式有效性
    if (!['development', 'production'].includes(this.config.validationMode)) {
      errors.push(`无效的验证模式: ${this.config.validationMode}`);
    }

    // 验证时间间隔
    if (this.config.healthCheckInterval <= 0) {
      errors.push('健康检查间隔必须大于0');
    }

    if (this.config.gatewayFailoverTimeout <= 0) {
      errors.push('Gateway故障转移超时时间必须大于0');
    }

    // 验证逻辑一致性
    if (this.config.strictMode && this.config.allowLegacyFallback) {
      errors.push('严格模式与Legacy回退模式不能同时启用');
    }

    if (errors.length > 0) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validateConfig',
        message: 'WebSocket feature flags configuration validation failed',
        context: {
          errors,
          configType: 'websocket_feature_flags'
        }
      });
    }
  }

  /**
   * 记录特性开关状态
   * @private
   */
  private logFeatureFlagStatus(): void {
    this.logger.log('WebSocket特性开关配置已加载', {
      config: this.sanitizeConfig(this.config),
      environment: process.env.NODE_ENV || 'development',
      loadTime: new Date().toISOString()
    });

    // 特殊配置警告
    if (this.config.allowLegacyFallback) {
      this.logger.warn('⚠️ Legacy回退模式已启用，建议仅在紧急情况下使用');
    }

    if (!this.config.strictMode) {
      this.logger.warn('⚠️ 非严格模式可能允许Legacy代码路径执行');
    }

    if (this.config.validationMode === 'development') {
      this.logger.log('🔧 开发模式：允许动态特性开关更新');
    }
  }

  /**
   * 获取环境变量布尔值
   * @private
   */
  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * 获取环境变量字符串值
   * @private
   */
  private getEnvString(key: string, defaultValue: string): string {
    return this.configService.get<string>(key) || defaultValue;
  }

  /**
   * 获取环境变量数字值
   * @private
   */
  private getEnvNumber(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 脱敏配置用于日志记录
   * @private
   */
  private sanitizeConfig(config: WebSocketFeatureFlagsConfig): any {
    return {
      ...config,
      _summary: {
        gatewayOnly: config.gatewayOnlyMode,
        legacyFallback: config.allowLegacyFallback,
        strict: config.strictMode,
        mode: config.validationMode
      }
    };
  }
}

/**
 * 特性开关环境变量默认值
 * 用于部署配置参考
 */
export const WS_FEATURE_FLAGS_DEFAULTS = {
  WS_GATEWAY_ONLY_MODE: 'true',          // 启用Gateway-only模式
  WS_ALLOW_LEGACY_FALLBACK: 'false',     // 禁用Legacy回退（生产环境）
  WS_STRICT_MODE: 'true',                // 启用严格模式
  WS_VALIDATION_MODE: 'production',      // 生产验证模式
  WS_HEALTH_CHECK_INTERVAL: '30000',     // 30秒健康检查
  WS_GATEWAY_FAILOVER_TIMEOUT: '5000'    // 5秒故障转移超时
} as const;