import { Injectable, Inject } from '@nestjs/common';
import authConfig from '../../config/auth-configuration';

/**
 * Auth配置服务
 * 提供类型安全的配置访问
 * 
 * @description
 * 封装配置访问逻辑，提供便捷的方法获取认证和安全相关配置
 * 遵循NestJS依赖注入最佳实践
 */
@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ReturnType<typeof authConfig>,
  ) {}

  /**
   * 获取安全配置
   */
  get securityConfig() {
    return this.authConfiguration.security;
  }

  /**
   * 获取频率限制配置
   */
  get rateLimitConfig() {
    return this.authConfiguration.rateLimit;
  }

  /**
   * 获取策略配置
   */
  get strategiesConfig() {
    return this.authConfiguration.strategies;
  }

  /**
   * 安全限制相关方法
   */
  getMaxPayloadSizeBytes(): number {
    return this.securityConfig.maxPayloadSizeBytes;
  }

  getMaxPayloadSizeString(): string {
    return this.securityConfig.maxPayloadSizeString;
  }

  getMaxStringLengthSanitize(): number {
    return this.securityConfig.maxStringLengthSanitize;
  }

  getMaxObjectDepthComplexity(): number {
    return this.securityConfig.maxObjectDepthComplexity;
  }

  getMaxObjectFieldsComplexity(): number {
    return this.securityConfig.maxObjectFieldsComplexity;
  }

  getMaxStringLengthComplexity(): number {
    return this.securityConfig.maxStringLengthComplexity;
  }

  getFindLongStringThreshold(): number {
    return this.securityConfig.findLongStringThreshold;
  }

  getMaxQueryParams(): number {
    return this.securityConfig.maxQueryParams;
  }

  getMaxRecursionDepth(): number {
    return this.securityConfig.maxRecursionDepth;
  }

  /**
   * 频率限制相关方法
   */
  getGlobalThrottleConfig() {
    return this.rateLimitConfig.globalThrottle;
  }

  getRedisConfig() {
    return this.rateLimitConfig.redis;
  }

  getIpRateLimitConfig() {
    return this.rateLimitConfig.ipRateLimit;
  }

  /**
   * 策略相关方法
   */
  getRateLimitStrategies() {
    return this.strategiesConfig;
  }

  /**
   * 便捷方法：检查是否启用IP限制
   */
  isIpRateLimitEnabled(): boolean {
    return this.rateLimitConfig.ipRateLimit.enabled;
  }

  /**
   * 便捷方法：获取全局限制TTL
   */
  getGlobalThrottleTtl(): number {
    return this.rateLimitConfig.globalThrottle.ttl;
  }

  /**
   * 便捷方法：获取全局限制次数
   */
  getGlobalThrottleLimit(): number {
    return this.rateLimitConfig.globalThrottle.limit;
  }
}