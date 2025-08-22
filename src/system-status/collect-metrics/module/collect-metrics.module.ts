import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PerformanceMetricsRepository } from "../repositories/performance-metrics.repository";
import { MetricsHealthService } from "../services/metrics-health.service";
import { MetricsPerformanceService } from "../services/metrics-performance.service";

@Module({
  imports: [
    ConfigModule, 
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot()
  ],
  providers: [
    MetricsPerformanceService,
    PerformanceMetricsRepository,
    MetricsHealthService,
  ],
  exports: [
    MetricsPerformanceService,
    PerformanceMetricsRepository,
    MetricsHealthService,
  ],
})
export class CollectMetricsModule {}
