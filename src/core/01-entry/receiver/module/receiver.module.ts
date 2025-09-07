import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
//import { CacheModule } from "../../../../cache/module/cache.module";
import { ProvidersModule } from "../../../../providers/module/providers-sg.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { SmartCacheModule } from "../../../05-caching/smart-cache/module/smart-cache.module";
import { SymbolMapperModule } from "../../../00-prepare/symbol-mapper/module/symbol-mapper.module";
import { SymbolTransformerModule } from "../../../02-processing/symbol-transformer/module/symbol-transformer.module";
import { DataFetcherModule } from "../../../03-fetching/data-fetcher/module/data-fetcher.module";
import { TransformerModule } from "../../../02-processing/transformer/module/data-transformer.module";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module";

import { ReceiverController } from "../controller/receiver.controller";
import { ReceiverService } from "../services/receiver.service";

@Module({
  imports: [
    AuthModule,
    SymbolMapperModule,
    SymbolTransformerModule, // 🔥 新增SymbolTransformer模块
    DataFetcherModule, // 🔥 新增DataFetcher模块
    TransformerModule,
    StorageModule,
    SmartCacheModule, // 🔑 关键: 导入SmartCacheModule，支持智能缓存编排器
    ProvidersModule,
    // CacheModule,
    SharedServicesModule,
    MonitoringModule, // ✅ 导入监控模块
  ],
  controllers: [ReceiverController],
  providers: [ReceiverService],
  exports: [ReceiverService],
})
export class ReceiverModule {}
