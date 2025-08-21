import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { SmartCacheModule } from "../../../05-caching/smart-cache/module/smart-cache.module";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";
import { ReceiverModule } from "../../../01-entry/receiver/module/receiver.module";

import { QueryController } from "../controller/query.controller";
import { QueryService } from "../services/query.service";
import { QueryResultProcessorService } from "../services/query-result-processor.service";
import { QueryStatisticsService } from "../services/query-statistics.service";

@Module({
  imports: [
    AuthModule, 
    StorageModule, 
    SharedServicesModule,
    SmartCacheModule,    // 🔑 关键: 导入SmartCacheModule，否则DI注入失败
    ReceiverModule,
  ],
  controllers: [QueryController],
  providers: [
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
  ],
  exports: [
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
  ],
})
export class QueryModule {}
