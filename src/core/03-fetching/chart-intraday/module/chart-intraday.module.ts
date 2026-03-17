import { Module } from "@nestjs/common";

import { StreamReceiverModule } from "@core/01-entry/stream-receiver/module/stream-receiver.module";
import { SymbolTransformerModule } from "@core/02-processing/symbol-transformer/module/symbol-transformer.module";
import { DataFetcherModule } from "@core/03-fetching/data-fetcher/module/data-fetcher.module";
import { StreamDataFetcherModule } from "@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";
import { BasicCacheModule } from "@core/05-caching/module/basic-cache";
import { SharedServicesModule } from "@core/shared/module/shared-services.module";
import { ProvidersV2Module } from "@providersv2";

import { ChartIntradayCursorModule } from "./chart-intraday-cursor.module";
import { ChartIntradaySessionModule } from "./chart-intraday-session.module";
import { ChartIntradayFrozenSnapshotService } from "../services/chart-intraday-frozen-snapshot.service";
import { ChartIntradayReadService } from "../services/chart-intraday-read.service";
import { ChartIntradayRuntimeOrchestratorService } from "../services/chart-intraday-runtime-orchestrator.service";
import { ChartIntradaySessionPolicyService } from "../services/chart-intraday-session-policy.service";
import { ChartIntradayStreamSubscriptionService } from "../services/chart-intraday-stream-subscription.service";

@Module({
  imports: [
    StreamReceiverModule,
    ProvidersV2Module,
    DataFetcherModule,
    SymbolTransformerModule,
    StreamDataFetcherModule,
    BasicCacheModule,
    SharedServicesModule,
    ChartIntradayCursorModule,
    ChartIntradaySessionModule,
  ],
  providers: [
    ChartIntradayReadService,
    ChartIntradaySessionPolicyService,
    ChartIntradayFrozenSnapshotService,
    ChartIntradayRuntimeOrchestratorService,
  ],
  exports: [ChartIntradayReadService, ChartIntradayStreamSubscriptionService],
})
export class ChartIntradayModule {}
