import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ProvidersModule } from "../../../../providers/module/providers-sg.module";
import { DataFetcherService } from "../services/data-fetcher.service";

/**
 * DataFetcher模块
 *
 * 提供第三方SDK数据获取服务，专门负责从外部数据源获取原始数据
 * 解耦Receiver组件的职责，提高代码可维护性
 */
@Module({
  imports: [
    ProvidersModule, // 导入提供商模块以访问EnhancedCapabilityRegistryService
    EventEmitterModule, // 导入事件模块以访问EventEmitter2（事件驱动监控）
  ],
  providers: [DataFetcherService],
  exports: [DataFetcherService], // 导出服务供其他模块使用
})
export class DataFetcherModule {}
