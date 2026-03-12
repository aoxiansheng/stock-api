import { Module } from "@nestjs/common";
import { ProvidersV2Module } from "@providersv2";
import { BasicCacheModule } from "@core/05-caching/module/basic-cache";
import { DataFetcherService } from "../services/data-fetcher.service";
import { UpstreamRequestSchedulerService } from "../services/upstream-request-scheduler.service";

/**
 * DataFetcher模块
 *
 * 提供第三方SDK数据获取服务，专门负责从外部数据源获取原始数据
 * 解耦Receiver组件的职责，提高代码可维护性
 */
@Module({
  imports: [
    ProvidersV2Module, // 导入极简提供商模块以访问 ProviderRegistryService
    BasicCacheModule,
  ],
  providers: [DataFetcherService, UpstreamRequestSchedulerService],
  exports: [DataFetcherService, UpstreamRequestSchedulerService], // 导出服务供其他模块使用
})
export class DataFetcherModule {}
