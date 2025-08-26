/**
 * 🎯 统一监控模块
 * 
 * 整合所有监控相关功能：
 * - Infrastructure: 基础设施层（Prometheus 指标、装饰器、拦截器）
 * - Collector: 数据收集层
 * - Analyzer: 数据分析层  
 * - Presenter: 数据展示层
 */

import { Module } from '@nestjs/common';
import { CacheModule } from '@cache/module/cache.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { CollectorModule } from './collector/collector.module';
import { AnalyzerModule } from './analyzer/analyzer.module';
import { PresenterModule } from './presenter/presenter.module';
import { MonitoringCacheService } from './cache/monitoring-cache.service';


@Module({
  imports: [
    CacheModule, // 导入系统缓存模块
    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
  ],
  providers: [
    MonitoringCacheService, // 监控专用缓存服务
  
  ],
  exports: [
    MonitoringCacheService,

    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
  ],
})
export class MonitoringModule {}