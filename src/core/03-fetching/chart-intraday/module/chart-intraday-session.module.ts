import { Module } from "@nestjs/common";
import { BasicCacheModule } from "@core/05-caching/module/basic-cache";

import { ChartIntradaySessionService } from "../services/chart-intraday-session.service";

@Module({
  imports: [BasicCacheModule],
  providers: [ChartIntradaySessionService],
  exports: [ChartIntradaySessionService],
})
export class ChartIntradaySessionModule {}
