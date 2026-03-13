import { Module } from "@nestjs/common";

import { StreamReceiverModule } from "@core/01-entry/stream-receiver/module/stream-receiver.module";
import { SymbolTransformerModule } from "@core/02-processing/symbol-transformer/module/symbol-transformer.module";
import { DataFetcherModule } from "@core/03-fetching/data-fetcher/module/data-fetcher.module";
import { StreamDataFetcherModule } from "@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";
import { ProvidersV2Module } from "@providersv2";

import { ChartIntradayCursorModule } from "./chart-intraday-cursor.module";
import { ChartIntradayReadService } from "../services/chart-intraday-read.service";
import { ChartIntradayStreamSubscriptionService } from "../services/chart-intraday-stream-subscription.service";

@Module({
  imports: [
    StreamReceiverModule,
    ProvidersV2Module,
    DataFetcherModule,
    SymbolTransformerModule,
    StreamDataFetcherModule,
    ChartIntradayCursorModule,
  ],
  providers: [ChartIntradayReadService, ChartIntradayStreamSubscriptionService],
  exports: [ChartIntradayReadService, ChartIntradayStreamSubscriptionService],
})
export class ChartIntradayModule {}
