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
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CollectorModule } from "../collector/collector.module";
import { CacheModule } from "@cache/module/cache.module";
import { AnalyzerService } from "./analyzer.service";
import { HealthAnalyzerService } from "./analyzer-health.service";
import { TrendAnalyzerService } from "./analyzer-trend.service";
import { AnalyzerHealthScoreCalculator } from "./analyzer-score.service";
import { AnalyzerMetricsCalculator } from "./analyzer-metrics.service";
import { MonitoringUnifiedTtl } from "../config/unified/monitoring-unified-ttl.config";

@Module({
  imports: [
    CollectorModule,
    CacheModule, // 导入通用缓存模块替代MonitoringCacheModule
    ConfigModule.forFeature(MonitoringUnifiedTtl),
  ],
  providers: [
    AnalyzerService,
    HealthAnalyzerService,
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
    {
      provide: "monitoringUnifiedTtl",
      useFactory: (configService: ConfigService) =>
        configService.get("monitoringUnifiedTtl"),
      inject: [ConfigService],
    },
  ],
  exports: [
    AnalyzerService,
    HealthAnalyzerService,
    TrendAnalyzerService,
    AnalyzerHealthScoreCalculator,
    AnalyzerMetricsCalculator,
    "monitoringUnifiedTtl",
  ],
})
export class AnalyzerModule {}
