import { Module } from "@nestjs/common";

import { AlertModule } from "../../alert/module/alert.module";
import { AuthModule } from "../../auth/module/auth.module";
import { CacheModule } from "../../cache/module/cache.module";
import { MetricsModule } from "../../metrics/module/metrics.module";

import { MonitoringController } from "../controller/monitoring.controller";

@Module({
  imports: [AlertModule, AuthModule, CacheModule, MetricsModule],
  controllers: [MonitoringController],
  providers: [],
})
export class MonitoringModule {}
