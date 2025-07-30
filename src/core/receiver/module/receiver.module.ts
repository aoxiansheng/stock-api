import { Module } from "@nestjs/common";

import { AuthModule } from "../../../auth/module/auth.module";
import { CacheModule } from "../../../cache/module/cache.module";
import { ProvidersModule } from "../../../providers/module/providers.module";
import { SharedServicesModule } from "../../shared/module/shared-services.module";
import { SymbolMapperModule } from "../../symbol-mapper/module/symbol-mapper.module";

import { ReceiverController } from "../controller/receiver.controller";
import { ReceiverService } from "../services/receiver.service";

@Module({
  imports: [
    AuthModule,
    SymbolMapperModule,
    ProvidersModule,
    CacheModule,
    SharedServicesModule,
  ],
  controllers: [ReceiverController],
  providers: [ReceiverService],
  exports: [ReceiverService],
})
export class ReceiverModule {}
