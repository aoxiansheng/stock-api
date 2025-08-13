import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { ProvidersModule } from "../../../../providers/module/providers.module";
import { SharedServicesModule } from "../../../public/shared/module/shared-services.module";
import { StorageModule } from "../../../public/storage/module/storage.module";

import { QueryController } from "../controller/query.controller";
import { QueryService } from "../services/query.service";
import { QueryResultProcessorService } from "../services/query-result-processor.service";
import { QueryStatisticsService } from "../services/query-statistics.service";
import { DataFetchingService } from "../../../public/shared/services/data-fetching.service";

@Module({
  imports: [AuthModule, StorageModule, SharedServicesModule, ProvidersModule],
  controllers: [QueryController],
  providers: [
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
    DataFetchingService, // 在这里提供DataFetchingService
  ],
  exports: [QueryService, QueryStatisticsService, QueryResultProcessorService, DataFetchingService],
})
export class QueryModule {}
