import { Module } from "@nestjs/common";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { ChartIntradayModule } from "@core/03-fetching/chart-intraday/module/chart-intraday.module";

import { ReceiverChartIntradayController } from "../controller/receiver-chart-intraday.controller";
import { ReceiverChartIntradayService } from "../services/receiver-chart-intraday.service";

@Module({
  imports: [AuthV2Module, ChartIntradayModule],
  controllers: [ReceiverChartIntradayController],
  providers: [ReceiverChartIntradayService],
})
export class ReceiverChartIntradayModule {}
