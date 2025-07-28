import { Module } from "@nestjs/common";

import { AuthModule } from "../../../auth/auth.module";
import { CacheModule } from "../../../cache/cache.module";
import { ProvidersModule } from "../../../providers/providers.module";
import { SharedServicesModule } from "../../shared/module/shared-services.module";
import { SymbolMapperModule } from "../../symbol-mapper/module/symbol-mapper.module";

import { ReceiverController } from "../controller/receiver.controller";
import { ReceiverService } from "../service/receiver.service";

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
