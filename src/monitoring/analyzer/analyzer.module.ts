/**
 * 🎯 数据分析模块
 *
 * 负责分析和计算监控指标：
 * - 性能分析
 * - 健康评分
 * - 趋势分析
 * - 优化建议
 */

import { Module } from "@nestjs/common";
import { CollectorModule } from "../collector/collector.module";
import { MonitoringCacheModule } from "../cache/monitoring-cache.module";
import { AnalyzerService } from "./analyzer.service";
import { HealthAnalyzerService } from "./analyzer-health.service";
import { TrendAnalyzerService } from "./analyzer-trend.service";
import { AnalyzerHealthScoreCalculator } from "./analyzer-score.service";
import { AnalyzerMetricsCalculator } from "./analyzer-metrics.service";

@Module({
  imports: [
    CollectorModule,
    MonitoringCacheModule, // 导入独立的缓存模块，不再直接声明服务
  ],
  providers: [
    AnalyzerService,
    HealthAnalyzerService,
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
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
