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
import { AnalyzerService } from './services/analyzer.service';
import { HealthAnalyzerService } from './services/analyzer-health.service';
import { TrendAnalyzerService } from './services/analyzer-trend.service';
import { AnalyzerHealthScoreCalculator } from './calculators/analyzer-health-score.calculator';
import { AnalyzerMetricsCalculator } from './calculators/analyzer-metrics.calculator';
import { AnalyzerCacheService } from './cache/analyzer-cache.service';

@Module({
  imports: [CollectorModule],
  providers: [
    AnalyzerService,
    HealthAnalyzerService, 
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
    AnalyzerCacheService,
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