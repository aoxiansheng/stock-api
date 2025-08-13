import { Module } from "@nestjs/common";

import { AlertModule } from "../../alert/module/alert.module";
import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { MetricsModule } from "../../metrics/module/metrics.module";
import { SharedServicesModule } from "../../core/public/shared/module/shared-services.module";

import { MonitoringController } from "../controller/monitoring.controller";
import { MetricsInitializerService } from "../metrics/metrics-initializer.service";
import { MetricsRegistryService } from "../metrics/metrics-registry.service";

@Module({
  imports: [AlertModule, AuthModule, CacheModule, MetricsModule, SharedServicesModule],
  controllers: [MonitoringController],
  providers: [MetricsInitializerService, MetricsRegistryService],
  exports: [MetricsInitializerService, MetricsRegistryService],
})
export class MonitoringModule {}
