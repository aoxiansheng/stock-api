import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { CacheModule } from "../../../../cache/module/cache.module";
import { ProvidersModule } from "../../../../providers/module/providers.module";
import { SharedServicesModule } from "../../../public/shared/module/shared-services.module";
import { SymbolMapperModule } from "../../../public/symbol-mapper/module/symbol-mapper.module";
import { DataFetcherModule } from "../../../restapi/data-fetcher/module/data-fetcher.module";
import { TransformerModule } from "../../../public/transformer/module/transformer.module";
import { StorageModule } from "../../../public/storage/module/storage.module";

import { ReceiverController } from "../controller/receiver.controller";
import { ReceiverService } from "../services/receiver.service";

@Module({
  imports: [
    AuthModule,
    SymbolMapperModule,
    DataFetcherModule, // 🔥 新增DataFetcher模块
    TransformerModule,
    StorageModule,
    ProvidersModule,
    CacheModule,
    SharedServicesModule,
  ],
  controllers: [ReceiverController],
  providers: [ReceiverService],
  exports: [ReceiverService],
})
export class ReceiverModule {}
