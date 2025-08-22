import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsCacheService } from './analytics-cache.service';
import { ANALYTICS_EVENTS, ANALYTICS_CACHE_CONFIG } from '../constants';

/**
 * 缓存失效协调器服务
 * 负责协调不同Analytics服务之间的缓存失效策略
 * 监听系统级事件并触发全局缓存失效
 */
@Injectable()
export class CacheInvalidationCoordinatorService implements OnModuleInit {
  private readonly logger = new Logger(CacheInvalidationCoordinatorService.name);

  constructor(
    private readonly cacheService: AnalyticsCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.setupGlobalCacheInvalidationListeners();
    this.logger.log('缓存失效协调器已初始化');
  }

  /**
   * 设置全局缓存失效事件监听器
   */
  private setupGlobalCacheInvalidationListeners(): void {
    // 监听系统重启事件 - 全量失效所有缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.SYSTEM_RESTART_DETECTED, async (data) => {
      this.logger.warn('检测到系统重启，全量失效所有Analytics缓存', data);
      await this.invalidateAllCaches('system_restart');
    });

    // 监听数据源变化事件 - 失效相关数据缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.DATA_SOURCE_CHANGED, async (data) => {
      this.logger.log('数据源变化，失效相关缓存', data);
      await this.invalidateDataRelatedCaches(data.dataSource);
    });

    // 监听配置更新事件 - 失效配置相关缓存
    this.eventEmitter.on(ANALYTICS_EVENTS.CONFIGURATION_UPDATED, async (data) => {
      this.logger.log('配置更新，失效相关缓存', data);
      await this.invalidateConfigRelatedCaches(data.configType);
    });

    // 监听严重错误事件 - 立即失效所有缓存确保数据准确性
    this.eventEmitter.on(ANALYTICS_EVENTS.CRITICAL_ERROR_DETECTED, async (data) => {
      this.logger.error('检测到严重错误，紧急失效所有缓存', data);
      await this.invalidateAllCaches('critical_error');
    });

    // 监听监控数据过期事件
    this.eventEmitter.on(ANALYTICS_EVENTS.MONITORING_DATA_STALE, async (data) => {
      this.logger.debug('监控数据过期，失效监控相关缓存', data);
      await this.invalidateMonitoringCaches();
    });

    // 监听Redis连接丢失事件
    this.eventEmitter.on(ANALYTICS_EVENTS.REDIS_CONNECTION_LOST, async (data) => {
      this.logger.error('Redis连接丢失，标记缓存为不可用', data);
      await this.handleRedisConnectionLoss();
    });

    // 监听数据库连接丢失事件
    this.eventEmitter.on(ANALYTICS_EVENTS.DATABASE_CONNECTION_LOST, async (data) => {
      this.logger.error('数据库连接丢失，失效相关缓存', data);
      await this.invalidateDataRelatedCaches('database');
    });

    this.logger.log('全局缓存失效事件监听器已设置');
  }

  /**
   * 全量失效所有Analytics缓存
   */
  private async invalidateAllCaches(reason: string): Promise<void> {
    try {
      const patterns = [
        ANALYTICS_CACHE_CONFIG.KEY_PREFIX.PERFORMANCE,
        ANALYTICS_CACHE_CONFIG.KEY_PREFIX.HEALTH,
        ANALYTICS_CACHE_CONFIG.KEY_PREFIX.TRENDS,
        ANALYTICS_CACHE_CONFIG.KEY_PREFIX.OPTIMIZATION,
      ];

      for (const pattern of patterns) {
        await this.cacheService.invalidatePattern(pattern);
      }

      // 发射全局缓存失效事件
      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: 'analytics:all',
        timestamp: new Date().toISOString(),
        reason,
        service: 'CacheInvalidationCoordinatorService'
      });

      this.logger.log('全量缓存失效完成', { reason, patterns: patterns.length });
    } catch (error) {
      this.logger.error('全量缓存失效失败', { reason, error: error.message });
    }
  }

  /**
   * 失效数据相关缓存
   */
  private async invalidateDataRelatedCaches(dataSource?: string): Promise<void> {
    try {
      const patterns = [
        `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.PERFORMANCE}*`,
        `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.HEALTH}*`,
      ];

      for (const pattern of patterns) {
        await this.cacheService.invalidatePattern(pattern);
      }

      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: 'analytics:data_related',
        timestamp: new Date().toISOString(),
        dataSource,
        service: 'CacheInvalidationCoordinatorService'
      });

      this.logger.log('数据相关缓存失效完成', { dataSource });
    } catch (error) {
      this.logger.error('数据相关缓存失效失败', { dataSource, error: error.message });
    }
  }

  /**
   * 失效配置相关缓存
   */
  private async invalidateConfigRelatedCaches(configType?: string): Promise<void> {
    try {
      // 配置变化主要影响优化建议和趋势分析
      const patterns = [
        `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.OPTIMIZATION}*`,
        `${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.TRENDS}*`,
      ];

      for (const pattern of patterns) {
        await this.cacheService.invalidatePattern(pattern);
      }

      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: 'analytics:config_related',
        timestamp: new Date().toISOString(),
        configType,
        service: 'CacheInvalidationCoordinatorService'
      });

      this.logger.log('配置相关缓存失效完成', { configType });
    } catch (error) {
      this.logger.error('配置相关缓存失效失败', { configType, error: error.message });
    }
  }

  /**
   * 失效监控相关缓存
   */
  private async invalidateMonitoringCaches(): Promise<void> {
    try {
      await this.cacheService.invalidatePattern(`${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.PERFORMANCE}*`);
      await this.cacheService.invalidatePattern(`${ANALYTICS_CACHE_CONFIG.KEY_PREFIX.HEALTH}*`);

      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: 'analytics:monitoring',
        timestamp: new Date().toISOString(),
        service: 'CacheInvalidationCoordinatorService'
      });

      this.logger.log('监控相关缓存失效完成');
    } catch (error) {
      this.logger.error('监控相关缓存失效失败', { error: error.message });
    }
  }

  /**
   * 处理Redis连接丢失情况
   */
  private async handleRedisConnectionLoss(): Promise<void> {
    try {
      // 记录连接丢失事件
      this.logger.error('Redis连接丢失，Analytics缓存功能可能受到影响');
      
      // 发射连接丢失事件，让其他服务知道缓存不可用
      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern: 'redis:connection_lost',
        timestamp: new Date().toISOString(),
        service: 'CacheInvalidationCoordinatorService',
        critical: true
      });

    } catch (error) {
      this.logger.error('处理Redis连接丢失失败', { error: error.message });
    }
  }

  /**
   * 手动触发缓存失效（用于管理和测试）
   */
  async triggerManualInvalidation(pattern: string, reason: string): Promise<void> {
    try {
      this.logger.log('手动触发缓存失效', { pattern, reason });
      
      await this.cacheService.invalidatePattern(pattern);
      
      this.eventEmitter.emit(ANALYTICS_EVENTS.CACHE_INVALIDATED, {
        pattern,
        timestamp: new Date().toISOString(),
        reason: `manual_${reason}`,
        service: 'CacheInvalidationCoordinatorService'
      });
    } catch (error) {
      this.logger.error('手动缓存失效失败', { 
        pattern, 
        reason, 
        error: error.message 
      });
      // 不重新抛出错误，保持服务稳定性
    }
  }

  /**
   * 获取缓存失效统计信息
   */
  getCacheInvalidationStats(): {
    listenersActive: boolean;
    supportedEvents: string[];
    lastInvalidation?: string;
  } {
    return {
      listenersActive: true,
      supportedEvents: Object.values(ANALYTICS_EVENTS),
      lastInvalidation: new Date().toISOString(),
    };
  }
}