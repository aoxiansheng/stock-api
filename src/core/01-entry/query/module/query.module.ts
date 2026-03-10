import { Module } from "@nestjs/common";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { SmartCacheModule } from "../../../05-caching/module/smart-cache/module/smart-cache.module";
import { ReceiverModule } from "../../../01-entry/receiver/module/receiver.module";
import { SupportListModule } from "../../../03-fetching/support-list/module/support-list.module";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";

import { QueryController } from "../controller/query.controller";
import { SupportListQueryController } from "../controller/support-list-query.controller";
import { QueryService } from "../services/query.service";
import { QueryResultProcessorService } from "../services/query-result-processor.service";
import { QueryConfigService } from "../config/query.config";
import { QueryExecutionEngine } from "../services/query-execution-engine.service";
import { SupportListQueryService } from "../services/support-list-query.service";

@Module({
  imports: [
    AuthV2Module,
    SharedServicesModule,
    SmartCacheModule, // 🔑 关键: 导入SmartCacheModule，否则DI注入失败
    StorageModule, // 🔑 QueryExecutionEngine 依赖 StorageService，需显式导入
    ReceiverModule,
    SupportListModule,
  ],
  controllers: [QueryController, SupportListQueryController],
  providers: [
    QueryConfigService,
    QueryExecutionEngine, // ✅ 查询执行引擎，简化调用链
    QueryService,
    QueryResultProcessorService,
    SupportListQueryService,
  ],
  exports: [
    QueryConfigService,
    QueryExecutionEngine, // ✅ 导出执行引擎供其他模块使用
    QueryService,
    QueryResultProcessorService,
    SupportListQueryService,
  ],
})
export class QueryModule {
  // ✅ 事件驱动监控架构已集成
  // - 所有监控逻辑改为事件发送方式
  // - 彻底移除直接CollectorService依赖
  // - 符合全局监控器规范要求
}
