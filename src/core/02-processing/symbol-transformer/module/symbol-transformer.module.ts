import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { SymbolMapperCacheModule } from "../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module"; // ✅ 替换 PresenterModule
import { AuthModule } from "../../../../auth/module/auth.module";
import { SymbolTransformerService } from "../services/symbol-transformer.service";
import { SymbolTransformerController } from "../controller/symbol-transformer.controller";

import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';

@Module({
  imports: [
    SymbolMapperCacheModule,
    EventEmitterModule, // ✅ 事件驱动监控必需
    MonitoringModule, // ✅ 标准监控模块导入（替换 PresenterModule）
    AuthModule, // ✅ 添加 AuthModule 以提供 AuthPerformanceService
    MarketInferenceModule,
  ],
  controllers: [SymbolTransformerController],
  providers: [SymbolTransformerService],
  exports: [SymbolTransformerService],
})
export class SymbolTransformerModule {}
