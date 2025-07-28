import { Module } from "@nestjs/common";

import { AuthModule } from "../../../auth/auth.module";
import { SharedServicesModule } from "../../shared/module/shared-services.module";
import { StorageModule } from "../../storage/module/storage.module";

import { QueryController } from "../controller/query.controller";
import { QueryService } from "../service/query.service";
import { QueryResultProcessorService } from "../service/query-result-processor.service";
import { QueryStatisticsService } from "../service/query-statistics.service";

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
