import { Injectable } from '@nestjs/common';
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

  /** 是否启用严格模式（禁用所有Legacy代码路径，默认: true） */
  strictMode: boolean;

  /** 特性开关验证模式（development|production，默认: production） */
  validationMode: 'development' | 'production';

  /** 监控WebSocket架构健康状态的间隔（毫秒，默认: 30000） */
  healthCheckInterval: number;

  /** Gateway不可用时的最大等待时间（毫秒，默认: 5000） */
  gatewayFailoverTimeout: number;

  /** 自动回滚触发条件配置 */
  autoRollbackConditions: {
    /** 客户端断连激增阈值（5分钟内超过20%） */
    clientDisconnectionSpike: number;
    /** Gateway错误率阈值（1分钟内超过5%） */
    gatewayErrorRate: number;
    /** 应急回退触发频率阈值（每小时超过10次） */
    emergencyFallbackTriggers: number;
  };
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

  // 自动回滚监控状态
  private rollbackMetrics = {
    clientDisconnections: { count: 0, windowStart: Date.now() },
    gatewayErrors: { count: 0, windowStart: Date.now() },
    emergencyFallbackTriggers: { count: 0, windowStart: Date.now() }
  };

  // 应急Legacy回退状态（仅用于紧急情况）
  private emergencyLegacyFallbackEnabled = false;

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
   * 检查是否允许Legacy回退（仅限应急情况）
   */
  isLegacyFallbackAllowed(): boolean {
    return this.emergencyLegacyFallbackEnabled;
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

    this.emergencyLegacyFallbackEnabled = true;

    this.logger.warn('🚨 紧急启用Legacy回退模式', {
      reason,
      timestamp: new Date().toISOString(),
      previousState: {
        gatewayOnlyMode: this.config.gatewayOnlyMode,
        emergencyLegacyFallback: false
      },
      newState: {
        gatewayOnlyMode: this.config.gatewayOnlyMode,
        emergencyLegacyFallback: true
      }
    });

    return true;
  }

  /**
   * 记录客户端断连事件
   * @param disconnectionCount 断连数量
   * @param totalConnections 总连接数
   */
  recordClientDisconnection(disconnectionCount: number, totalConnections: number): void {
    this.resetMetricWindowIfNeeded('clientDisconnections', 5 * 60 * 1000); // 5分钟窗口
    this.rollbackMetrics.clientDisconnections.count += disconnectionCount;

    const disconnectionRate = (disconnectionCount / Math.max(totalConnections, 1)) * 100;
    if (disconnectionRate > this.config.autoRollbackConditions.clientDisconnectionSpike) {
      this.checkAndTriggerAutoRollback('client_disconnection_spike',
        `客户端断连激增: ${disconnectionRate.toFixed(1)}% > ${this.config.autoRollbackConditions.clientDisconnectionSpike}%`);
    }
  }

  /**
   * 记录Gateway错误事件
   * @param errorCount 错误数量
   * @param totalRequests 总请求数
   */
  recordGatewayError(errorCount: number, totalRequests: number): void {
    this.resetMetricWindowIfNeeded('gatewayErrors', 60 * 1000); // 1分钟窗口
    this.rollbackMetrics.gatewayErrors.count += errorCount;

    const errorRate = (errorCount / Math.max(totalRequests, 1)) * 100;
    if (errorRate > this.config.autoRollbackConditions.gatewayErrorRate) {
      this.checkAndTriggerAutoRollback('gateway_error_rate_high',
        `Gateway错误率过高: ${errorRate.toFixed(1)}% > ${this.config.autoRollbackConditions.gatewayErrorRate}%`);
    }
  }

  /**
   * 记录应急回退触发事件
   */
  recordEmergencyFallbackTrigger(): void {
    this.resetMetricWindowIfNeeded('emergencyFallbackTriggers', 60 * 60 * 1000); // 1小时窗口
    this.rollbackMetrics.emergencyFallbackTriggers.count++;

    if (this.rollbackMetrics.emergencyFallbackTriggers.count > this.config.autoRollbackConditions.emergencyFallbackTriggers) {
      this.checkAndTriggerAutoRollback('emergency_fallback_frequent',
        `应急回退触发过于频繁: ${this.rollbackMetrics.emergencyFallbackTriggers.count}次 > ${this.config.autoRollbackConditions.emergencyFallbackTriggers}次/小时`);
    }
  }

  /**
   * 检查并触发自动回滚
   * @private
   */
  private checkAndTriggerAutoRollback(triggerType: string, reason: string): void {
    if (this.emergencyLegacyFallbackEnabled) {
      this.logger.warn('自动回滚条件触发，但Emergency Legacy回退已启用', {
        triggerType,
        reason,
        currentState: this.emergencyLegacyFallbackEnabled
      });
      return;
    }

    // 在严格模式下，不允许自动回滚
    if (this.config.strictMode) {
      this.logger.error('🚨 自动回滚条件触发，但严格模式阻止回滚', {
        triggerType,
        reason,
        strictMode: this.config.strictMode,
        autoRollbackBlocked: true
      });
      return;
    }

    // 触发自动回滚
    const rollbackSuccess = this.emergencyEnableLegacyFallback(`自动回滚触发: ${reason}`);

    this.logger.warn('🔄 自动回滚已触发', {
      triggerType,
      reason,
      rollbackSuccess,
      timestamp: new Date().toISOString(),
      metrics: this.rollbackMetrics
    });
  }

  /**
   * 重置监控窗口（如果需要）
   * @private
   */
  private resetMetricWindowIfNeeded(metricType: keyof typeof this.rollbackMetrics, windowSizeMs: number): void {
    const now = Date.now();
    const metric = this.rollbackMetrics[metricType];

    if (now - metric.windowStart > windowSizeMs) {
      metric.count = 0;
      metric.windowStart = now;
    }
  }

  /**
   * 获取自动回滚监控状态
   */
  getAutoRollbackMetrics() {
    return {
      clientDisconnections: { ...this.rollbackMetrics.clientDisconnections },
      gatewayErrors: { ...this.rollbackMetrics.gatewayErrors },
      emergencyFallbackTriggers: { ...this.rollbackMetrics.emergencyFallbackTriggers },
      thresholds: this.config.autoRollbackConditions,
      strictModeEnabled: this.config.strictMode,
      currentEmergencyFallbackState: this.emergencyLegacyFallbackEnabled
    };
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
    if (this.config.gatewayOnlyMode && this.emergencyLegacyFallbackEnabled) {
      status = 'degraded';
      recommendations.push('Gateway-only模式下启用Emergency Legacy回退可能导致架构不一致');
    }

    // 检查严格模式与回退模式的冲突
    if (this.config.strictMode && this.emergencyLegacyFallbackEnabled) {
      status = 'critical';
      recommendations.push('严格模式与Emergency Legacy回退模式冲突，需要立即解决');
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

    if (this.emergencyLegacyFallbackEnabled && this.config.strictMode) {
      return {
        ready: false,
        reason: '配置冲突：严格模式与Emergency Legacy回退不能同时启用',
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
      strictMode: this.getEnvBoolean('WS_STRICT_MODE', true),
      validationMode: this.getEnvString('WS_VALIDATION_MODE', 'production') as 'development' | 'production',
      healthCheckInterval: this.getEnvNumber('WS_HEALTH_CHECK_INTERVAL', 30000),
      gatewayFailoverTimeout: this.getEnvNumber('WS_GATEWAY_FAILOVER_TIMEOUT', 5000),
      autoRollbackConditions: {
        clientDisconnectionSpike: this.getEnvNumber('WS_AUTO_ROLLBACK_CLIENT_DISCONNECT_THRESHOLD', 20), // 20%
        gatewayErrorRate: this.getEnvNumber('WS_AUTO_ROLLBACK_GATEWAY_ERROR_THRESHOLD', 5), // 5%
        emergencyFallbackTriggers: this.getEnvNumber('WS_AUTO_ROLLBACK_EMERGENCY_TRIGGER_THRESHOLD', 10) // 10次/小时
      }
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

    // 验证逻辑一致性检查已通过Private字段处理

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
    if (this.emergencyLegacyFallbackEnabled) {
      this.logger.warn('⚠️ Emergency Legacy回退模式已启用，建议仅在索急情况下使用');
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
        emergencyLegacyFallback: this.emergencyLegacyFallbackEnabled,
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
  // WS_ALLOW_LEGACY_FALLBACK: 'false',     // 已移除 - 改用emergencyEnableLegacyFallback()方法
  WS_STRICT_MODE: 'true',                // 启用严格模式
  WS_VALIDATION_MODE: 'production',      // 生产验证模式
  WS_HEALTH_CHECK_INTERVAL: '30000',     // 30秒健康检查
  WS_GATEWAY_FAILOVER_TIMEOUT: '5000',   // 5秒故障转移超时

  // 自动回滚触发阈值
  WS_AUTO_ROLLBACK_CLIENT_DISCONNECT_THRESHOLD: '20',  // 客户端断连激增阈值：20%
  WS_AUTO_ROLLBACK_GATEWAY_ERROR_THRESHOLD: '5',       // Gateway错误率阈值：5%
  WS_AUTO_ROLLBACK_EMERGENCY_TRIGGER_THRESHOLD: '10'      // 应急回退触发频率阈值：10次/小时
} as const;
