import { Module } from "@nestjs/common";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { ReceiverModule } from "../../receiver/module/receiver.module";
import { StreamDataFetcherModule } from "../../../03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";

import { ChartIntradayController } from "../controller/chart-intraday.controller";
import { ChartIntradayService } from "../services/chart-intraday.service";

@Module({
  imports: [AuthV2Module, ReceiverModule, StreamDataFetcherModule],
  controllers: [ChartIntradayController],
  providers: [ChartIntradayService],
  exports: [ChartIntradayService],
})
export class ChartIntradayModule {}
