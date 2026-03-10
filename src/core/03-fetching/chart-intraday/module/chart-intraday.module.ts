import { Module } from "@nestjs/common";

import { SymbolTransformerModule } from "@core/02-processing/symbol-transformer/module/symbol-transformer.module";
import { DataFetcherModule } from "@core/03-fetching/data-fetcher/module/data-fetcher.module";
import { StreamDataFetcherModule } from "@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";
import { ProvidersV2Module } from "@providersv2";

import { ChartIntradayCursorModule } from "./chart-intraday-cursor.module";
import { ChartIntradayReadService } from "../services/chart-intraday-read.service";

@Module({
  imports: [
    ProvidersV2Module,
    DataFetcherModule,
    SymbolTransformerModule,
    StreamDataFetcherModule,
    ChartIntradayCursorModule,
  ],
  providers: [ChartIntradayReadService],
  exports: [ChartIntradayReadService],
})
export class ChartIntradayModule {}
