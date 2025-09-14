import { Injectable, Inject } from '@nestjs/common';
import type { CacheTtlConfig } from '../config/cache-ttl.config';

/**
 * 缓存TTL Provider
 * 🎯 提供统一的TTL配置访问接口，替换分散在各模块中的TTL常量定义
 * 
 * NestJS最佳实践：
 * - 使用依赖注入获取配置
 * - 提供语义化的TTL访问方法
 * - 支持策略驱动的TTL选择
 */
@Injectable()
export class CacheTtlProvider {
  constructor(
    @Inject('cacheTtl') private readonly ttlConfig: CacheTtlConfig,
  ) {}

  /**
   * 获取基础TTL配置
   * @param type TTL类型
   * @returns TTL值（秒）
   */
  getTtl(type: 'default' | 'strong' | 'realtime' | 'monitoring' | 'auth' | 'transformer' | 'suggestion' | 'longTerm' = 'default'): number {
    switch (type) {
      case 'default':
        return this.ttlConfig.defaultTtl;
      case 'strong':
        return this.ttlConfig.strongTimelinessTtl;
      case 'realtime':
        return this.ttlConfig.realtimeTtl;
      case 'monitoring':
        return this.ttlConfig.monitoringTtl;
      case 'auth':
        return this.ttlConfig.authTtl;
      case 'transformer':
        return this.ttlConfig.transformerTtl;
      case 'suggestion':
        return this.ttlConfig.suggestionTtl;
      case 'longTerm':
        return this.ttlConfig.longTermTtl;
      default:
        return this.ttlConfig.defaultTtl;
    }
  }

  /**
   * 根据数据类型获取推荐TTL
   * @param dataType 数据类型
   * @returns TTL值（秒）
   */
  getTtlByDataType(dataType: 'quote' | 'market' | 'config' | 'cache' | 'monitoring' | 'auth'): number {
    switch (dataType) {
      case 'quote':
        return this.ttlConfig.strongTimelinessTtl; // 价格数据需要强时效性
      case 'market':
        return this.ttlConfig.realtimeTtl; // 市场数据实时更新
      case 'config':
        return this.ttlConfig.longTermTtl; // 配置数据变化较少
      case 'cache':
        return this.ttlConfig.defaultTtl; // 通用缓存数据
      case 'monitoring':
        return this.ttlConfig.monitoringTtl; // 监控数据
      case 'auth':
        return this.ttlConfig.authTtl; // 认证数据
      default:
        return this.ttlConfig.defaultTtl;
    }
  }

  /**
   * 根据时效性需求获取TTL
   * @param timeliness 时效性需求
   * @returns TTL值（秒）
   */
  getTtlByTimeliness(timeliness: 'strong' | 'moderate' | 'weak'): number {
    switch (timeliness) {
      case 'strong':
        return this.ttlConfig.strongTimelinessTtl; // 强时效性：5秒
      case 'moderate':
        return this.ttlConfig.realtimeTtl; // 中等时效性：30秒
      case 'weak':
        return this.ttlConfig.defaultTtl; // 弱时效性：300秒
      default:
        return this.ttlConfig.defaultTtl;
    }
  }

  /**
   * 获取所有TTL配置
   * @returns 完整的TTL配置对象
   */
  getAllTtls(): CacheTtlConfig {
    return { ...this.ttlConfig };
  }

  /**
   * 验证TTL值是否合理
   * @param ttl TTL值（秒）
   * @param type TTL类型
   * @returns 是否有效
   */
  validateTtl(ttl: number, type: 'short' | 'medium' | 'long' = 'medium'): boolean {
    if (ttl <= 0) return false;

    switch (type) {
      case 'short':
        return ttl >= 1 && ttl <= 60; // 1秒到1分钟
      case 'medium':
        return ttl >= 60 && ttl <= 3600; // 1分钟到1小时
      case 'long':
        return ttl >= 3600 && ttl <= 86400; // 1小时到24小时
      default:
        return ttl >= 1 && ttl <= 86400;
    }
  }

  /**
   * 获取配置摘要（用于日志和调试）
   * @returns 配置摘要字符串
   */
  getConfigSummary(): string {
    return [
      `默认TTL: ${this.ttlConfig.defaultTtl}s`,
      `强时效性TTL: ${this.ttlConfig.strongTimelinessTtl}s`,
      `实时TTL: ${this.ttlConfig.realtimeTtl}s`,
      `监控TTL: ${this.ttlConfig.monitoringTtl}s`,
      `认证TTL: ${this.ttlConfig.authTtl}s`,
      `长期TTL: ${this.ttlConfig.longTermTtl}s`,
    ].join(', ');
  }

  /**
   * 计算动态TTL（基于时间和负载）
   * @param baseType 基础TTL类型
   * @param factor 调整因子（0.1-10.0）
   * @returns 调整后的TTL值（秒）
   */
  calculateDynamicTtl(baseType: 'default' | 'strong' | 'realtime' = 'default', factor: number = 1.0): number {
    const baseTtl = this.getTtl(baseType);
    const adjustedTtl = Math.round(baseTtl * Math.max(0.1, Math.min(10.0, factor)));
    
    // 确保调整后的值在合理范围内
    return Math.max(1, Math.min(86400, adjustedTtl));
  }
}