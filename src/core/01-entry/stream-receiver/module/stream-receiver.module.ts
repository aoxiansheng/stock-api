import { Module } from "@nestjs/common";
import { StreamReceiverGateway } from "../gateway/stream-receiver.gateway";
import { StreamReceiverService } from "../services/stream-receiver.service";

// 导入依赖模块 - Phase 2 重构后精简依赖
import { AuthModule } from "../../../../auth/module/auth.module";
import { SymbolMapperModule } from "../../../00-prepare/symbol-mapper/module/symbol-mapper.module";
import { SymbolTransformerModule } from "../../../02-processing/symbol-transformer/module/symbol-transformer.module";
import { TransformerModule } from "../../../02-processing/transformer/module/data-transformer.module";
import { StreamDataFetcherModule } from "../../../03-fetching/stream-data-fetcher/module/stream-data-fetcher.module";
import { MonitoringModule } from "../../../../monitoring/monitoring.module"; // ✅ 使用统一监控模块

/**
 * StreamReceiver 模块 - Phase 4 完整版本
 *
 * 📋 Phase 4 重构变化：
 * - 移除了 ProvidersModule 直接依赖 (通过 StreamDataFetcher 间接访问)
 * - 移除了 DataMapperModule 直接依赖 (数据转换统一由 TransformerModule 处理)
 * - 移除了 PerformanceOptimizationModule (批量优化逻辑内置)
 * - 新增 StreamDataFetcherModule (集成新的流数据架构)
 * - ✅ 使用 MonitoringModule (统一监控集成)
 *
 * 🎯 Phase 4 架构：精简依赖 + 管道化处理 + 统一监控
 */
import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';

@Module({
  imports: [
    AuthModule, // 认证服务 (WebSocket 认证)
    SymbolMapperModule, // 符号映射服务
    SymbolTransformerModule, // 🔥 符号转换执行服务
    TransformerModule, // 数据转换服务 (统一处理所有转换)
    StreamDataFetcherModule, // 🚀 流数据获取、缓存、客户端管理
    MonitoringModule, // ✅ 统一监控模块
    MarketInferenceModule,
  ],
  providers: [StreamReceiverGateway, StreamReceiverService],
  exports: [StreamReceiverGateway, StreamReceiverService],
})
export class StreamReceiverModule {}
