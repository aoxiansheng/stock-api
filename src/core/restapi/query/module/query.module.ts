import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { SharedServicesModule } from "../../../public/shared/module/shared-services.module";
import { SymbolSmartCacheModule } from "../../../public/symbol-smart-cache/module/symbol-smart-cache.module";
import { StorageModule } from "../../../public/storage/module/storage.module";
import { ReceiverModule } from "../../../restapi/receiver/module/receiver.module";

import { QueryController } from "../controller/query.controller";
import { QueryService } from "../services/query.service";
import { QueryResultProcessorService } from "../services/query-result-processor.service";
import { QueryStatisticsService } from "../services/query-statistics.service";

@Module({
  imports: [
    AuthModule, 
    StorageModule, 
    SharedServicesModule,
    SymbolSmartCacheModule,    // 🔑 关键: 导入SymbolSmartCacheModule，否则DI注入失败
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
