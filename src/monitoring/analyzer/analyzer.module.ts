/**
 * 🎯 数据分析模块
 * 
 * 负责分析和计算监控指标：
 * - 性能分析
 * - 健康评分
 * - 趋势分析
 * - 优化建议
 */

import { Module } from '@nestjs/common';
import { CollectorModule } from '../collector/collector.module';
import { AnalyzerService } from './analyzer.service';
import { HealthAnalyzerService } from './analyzer-health.service';
import { TrendAnalyzerService } from './analyzer-trend.service';
import { AnalyzerHealthScoreCalculator } from './analyzer-score.service';
import { AnalyzerMetricsCalculator } from './analyzer-metrics.service';
import { MonitoringCacheService } from '../cache/monitoring-cache.service';
import { CacheModule } from '@cache/module/cache.module';

@Module({
  imports: [
    CollectorModule,
    CacheModule, // 添加对CacheModule的导入，因为MonitoringCacheService依赖它
  ],
  providers: [
    AnalyzerService,
    HealthAnalyzerService, 
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
    MonitoringCacheService, // 在这里添加MonitoringCacheService
  ],
  exports: [
    AnalyzerService,
    HealthAnalyzerService,
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
  ],
})
export class AnalyzerModule {}