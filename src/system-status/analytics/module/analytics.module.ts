import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '../../../cache/module/cache.module';
import { CollectMetricsModule } from '../../collect-metrics/module/collect-metrics.module';
import {
  AnalyticsCacheService,
  PerformanceAnalyticsService,
  HealthAnalyticsService,
  MetricsCalculatorService,
  CacheInvalidationCoordinatorService
} from '../services';
import { HealthScoreCalculator } from '../utils/health-score-calculator.util';

/**
 * Analytics 模块
 * 提供性能分析、健康评估和缓存管理功能
 * 
 * 设计原则:
 * - 轻量级协调层：不重复实现现有功能，主要做协调和缓存
 * - 接口导向：使用依赖注入接口而非具体类
 * - 统一缓存：提供统一的缓存策略和失效管理
 * - 事件驱动：支持事件发射和监听
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    CacheModule,
    CollectMetricsModule, // 依赖现有的Metrics模块
  ],
  providers: [
    // 缓存服务
    AnalyticsCacheService,
    
    // 缓存失效协调器
    CacheInvalidationCoordinatorService,
    
    // 计算服务
    MetricsCalculatorService,
    
    // 工具类
    {
      provide: HealthScoreCalculator,
      useClass: HealthScoreCalculator,
    },
    
    // 分析服务实现 - 注意顺序，先注册健康分析服务，再注册性能分析服务
    {
      provide: HealthAnalyticsService,
      useClass: HealthAnalyticsService,
    },
    {
      provide: PerformanceAnalyticsService,
      useClass: PerformanceAnalyticsService,
    },
    
    // 依赖注入接口提供者
    {
      provide: 'IHealthAnalytics', 
      useExisting: HealthAnalyticsService,
    },
    {
      provide: 'IPerformanceAnalytics',
      useExisting: PerformanceAnalyticsService,
    },
    
    // 缓存服务提供者（供其他模块使用）
    {
      provide: 'ANALYTICS_CACHE_SERVICE',
      useClass: AnalyticsCacheService,
    },
  ],
  exports: [
    // 导出接口供其他模块使用
    'IPerformanceAnalytics',
    'IHealthAnalytics',
    
    // 导出具体服务（用于直接注入的场景）
    PerformanceAnalyticsService,
    HealthAnalyticsService,
    AnalyticsCacheService,
    MetricsCalculatorService,
    CacheInvalidationCoordinatorService,
    
    // 导出缓存服务
    'ANALYTICS_CACHE_SERVICE',
  ],
})
export class AnalyticsModule {}