import { Module } from "@nestjs/common";

import { AuthModule } from "../../auth/auth.module";
import { CacheModule } from "../../cache/cache.module";
import { ProvidersModule } from "../../providers/providers.module";
import { SharedServicesModule } from "../shared/shared-services.module";
import { SymbolMapperModule } from "../symbol-mapper/symbol-mapper.module";

import { ReceiverController } from "./receiver.controller";
import { ReceiverService } from "./receiver.service";

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
