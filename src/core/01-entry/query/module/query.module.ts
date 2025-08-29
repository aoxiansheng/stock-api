import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { SmartCacheModule } from "../../../05-caching/smart-cache/module/smart-cache.module";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";
import { ReceiverModule } from "../../../01-entry/receiver/module/receiver.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module";

import { QueryController } from "../controller/query.controller";
import { QueryService } from "../services/query.service";
import { QueryResultProcessorService } from "../services/query-result-processor.service";
import { QueryStatisticsService } from "../services/query-statistics.service";
import { QueryConfigService } from "../config/query.config";
import { QueryMemoryMonitorService } from "../services/query-memory-monitor.service";
import { QueryExecutorFactory } from "../factories/query-executor.factory";
import { SymbolQueryExecutor } from "../factories/executors/symbol-query.executor";
import { MarketQueryExecutor } from "../factories/executors/market-query.executor";

@Module({
  imports: [
    AuthModule, 
    StorageModule, 
    SharedServicesModule,
    SmartCacheModule,    // 🔑 关键: 导入SmartCacheModule，否则DI注入失败
    ReceiverModule,
    MonitoringModule, // ✅ 导入监控模块
  ],
  controllers: [QueryController],
  providers: [
    QueryConfigService,
    QueryMemoryMonitorService,
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
    // ✅ Phase 3.2: 查询执行器工厂模式
    QueryExecutorFactory,
    SymbolQueryExecutor,
    MarketQueryExecutor,
  ],
  exports: [
    QueryConfigService,
    QueryMemoryMonitorService,
    QueryService,
    QueryStatisticsService,
    QueryResultProcessorService,
    // ✅ Phase 3.2: 导出工厂以供其他模块使用
    QueryExecutorFactory,
  ],
})
export class QueryModule {}
