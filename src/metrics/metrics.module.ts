import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { PerformanceMetricsRepository } from "./repositories/performance-metrics.repository";
import { MetricsHealthService } from "./services/metrics-health.service";
import { PerformanceMonitorService } from "./services/performance-monitor.service";

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    PerformanceMonitorService,
    PerformanceMetricsRepository,
    MetricsHealthService,
  ],
  exports: [
    PerformanceMonitorService,
    PerformanceMetricsRepository,
    MetricsHealthService,
  ],
})
export class MetricsModule {}
