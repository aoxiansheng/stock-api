/**
 * 🎯 统一监控模块
 * 
 * 整合所有监控相关功能：
 * - Infrastructure: 基础设施层（Prometheus 指标、装饰器、拦截器）
 * - Collector: 数据收集层
 * - Analyzer: 数据分析层  
 * - Presenter: 数据展示层
 * - Health: 扩展健康检查层（应用级健康检查）
 */

import { Module } from '@nestjs/common';
import { MonitoringCacheModule } from './cache/monitoring-cache.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { CollectorModule } from './collector/collector.module';
import { AnalyzerModule } from './analyzer/analyzer.module';
import { PresenterModule } from './presenter/presenter.module';
import { HealthModule } from './health/health.module';


@Module({
  imports: [
    MonitoringCacheModule, // 导入独立缓存模块
    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
    HealthModule, // 扩展健康检查模块
  ],
  exports: [
    MonitoringCacheModule, // 导出缓存模块供外部使用
    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
    HealthModule, // 导出健康检查模块
  ],
})
export class MonitoringModule {}