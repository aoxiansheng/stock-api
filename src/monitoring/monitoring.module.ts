import { Module } from "@nestjs/common";

import { AlertModule } from "../alert/alert.module";
import { AuthModule } from "../auth/auth.module";
import { CacheModule } from "../cache/cache.module";
import { MetricsModule } from "../metrics/metrics.module";

import { MonitoringController } from "./monitoring.controller";

@Module({
  imports: [AlertModule, AuthModule, CacheModule, MetricsModule],
  controllers: [MonitoringController],
  providers: [],
})
export class MonitoringModule {}
