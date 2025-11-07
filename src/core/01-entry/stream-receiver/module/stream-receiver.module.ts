import { Module } from "@nestjs/common";
import { StreamReceiverGateway } from "../gateway/stream-receiver.gateway";
import { StreamReceiverService } from "../services/stream-receiver.service";
import { StreamBatchProcessorService } from "../services/stream-batch-processor.service";
import { StreamConnectionManagerService } from "../services/stream-connection-manager.service";
import { StreamDataProcessorService } from "../services/stream-data-processor.service";
import { StreamDataValidator } from "../validators/stream-data.validator";

// 导入依赖模块 - Phase 2 重构后精简依赖
import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { SymbolMapperModule } from "../../../00-prepare/symbol-mapper/module/symbol-mapper.module";
import { SymbolTransformerModule } from "../../../02-processing/symbol-transformer/module/symbol-transformer.module";
import { TransformerModule } from "../../../02-processing/transformer/module/data-transformer.module";
import { StreamDataFetcherModule } from "../../../03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";

/**
 * StreamReceiver 模块 
 *

 * 🎯  架构：精简依赖 + 管道化处理 + 统一监控
 */
import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';
import { WsAuthGuard } from "../guards/ws-auth.guard";

@Module({
  imports: [
    AuthV2Module,
    SymbolMapperModule, // 符号映射服务
    SymbolTransformerModule, // 🔥 符号转换执行服务
    TransformerModule, // 数据转换服务 (统一处理所有转换)
    StreamDataFetcherModule, // 🚀 流数据获取、缓存、客户端管理
    MarketInferenceModule,
  ],
  providers: [
    StreamReceiverGateway,
    StreamReceiverService,
    StreamBatchProcessorService,
    StreamConnectionManagerService,
    StreamDataProcessorService,
    StreamDataValidator,
    WsAuthGuard
  ],
  exports: [
    StreamReceiverGateway,
    StreamReceiverService,
    StreamBatchProcessorService,
    StreamConnectionManagerService,
    StreamDataProcessorService,
    StreamDataValidator
  ],
})
export class StreamReceiverModule {}
