import { Module } from "@nestjs/common";

import { AuthModule } from "../../auth/auth.module";
import { SharedServicesModule } from "../shared/shared-services.module";
import { StorageModule } from "../storage/storage.module";

import { QueryController } from "./query.controller";
import { QueryService } from "./query.service";
import { QueryResultProcessorService } from "./services/query-result-processor.service";
import { QueryStatisticsService } from "./services/query-statistics.service";

@Module({
  imports: [AuthModule, StorageModule, SharedServicesModule],
  controllers: [QueryController],
  providers: [
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
  ],
  exports: [QueryService, QueryStatisticsService, QueryResultProcessorService],
})
export class QueryModule {}
