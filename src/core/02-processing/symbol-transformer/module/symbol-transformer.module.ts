import { Module } from "@nestjs/common";
import { SymbolMapperCacheModule } from "../../../05-caching/module/symbol-mapper-cache/module/symbol-mapper-cache.module";
import { SymbolMapperModule } from "@core/00-prepare/symbol-mapper/module/symbol-mapper.module";
import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { SymbolTransformerService } from "../services/symbol-transformer.service";
import { SymbolTransformerController } from "../controller/symbol-transformer.controller";

@Module({
  imports: [
    SymbolMapperCacheModule,
    SymbolMapperModule,
    AuthV2Module,
  ],
  controllers: [SymbolTransformerController],
  providers: [SymbolTransformerService],
  exports: [SymbolTransformerService],
})
export class SymbolTransformerModule {}
