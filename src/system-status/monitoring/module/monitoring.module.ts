import { Module } from "@nestjs/common";

import { AlertModule } from "../../../alert/module/alert.module";
import { AuthModule } from "../../../auth/module/auth.module";
import { CacheModule } from "../../../cache/module/cache.module";
import { CollectMetricsModule } from "../../collect-metrics/module/collect-metrics.module";
import { SharedServicesModule } from "../../../core/shared/module/shared-services.module";
import { AnalyticsModule } from "../../analytics/module/analytics.module";

import { MonitoringController } from "../controller/monitoring.controller";
import { MonitoringInitializerService } from "../services/monitoring-initializer.service";
import { MonitoringRegistryService } from "../services/monitoring-registry.service";

@Module({
  imports: [
    AlertModule, 
    AuthModule, 
    CacheModule, 
    CollectMetricsModule, 
    SharedServicesModule,
    AnalyticsModule, // 添加Analytics模块
  ],
  controllers: [MonitoringController],
  providers: [MonitoringInitializerService, MonitoringRegistryService],
  exports: [MonitoringInitializerService, MonitoringRegistryService],
})
export class MonitoringModule {}
