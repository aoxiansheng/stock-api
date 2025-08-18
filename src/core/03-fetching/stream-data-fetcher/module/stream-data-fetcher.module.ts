import { Module } from '@nestjs/common';
import { StreamDataFetcherService } from '../services/stream-data-fetcher.service';
import { StreamDataCacheService } from '../services/stream-data-cache.service';
import { StreamClientStateManager } from '../services/stream-client-state-manager.service';
import { StreamRecoveryWorkerService } from '../services/stream-recovery-worker.service';
import { StreamRecoveryConfigService } from '../config/stream-recovery.config';
import { StreamRecoveryMetricsService } from '../metrics/stream-recovery.metrics';
import { SharedServicesModule } from '../../../shared/module/shared-services.module';
import { ProvidersModule } from '../../../../providers/module/providers.module';
import { MonitoringModule } from '../../../../monitoring/module/monitoring.module';
import { CacheModule } from '../../../../cache/module/cache.module';

/**
 * StreamDataFetcher模块 - Phase 3 完整架构
 * 提供WebSocket流数据获取、智能缓存、客户端状态管理和Worker线程池功能
 */
@Module({
  imports: [
    SharedServicesModule, // 导入共享服务(包含BaseFetcherService相关依赖)
    ProvidersModule, // 导入提供商模块以访问CapabilityRegistryService
    MonitoringModule, // 导入监控模块以访问MetricsRegistryService
    CacheModule, // 导入缓存模块以访问CacheService
  ],
  providers: [
    StreamDataFetcherService,
    StreamDataCacheService,
    StreamClientStateManager,
    StreamRecoveryWorkerService,
    StreamRecoveryConfigService,
    StreamRecoveryMetricsService,
    // WebSocket服务器提供者 - Phase 3 Critical Fix
    {
      provide: 'WEBSOCKET_SERVER',
      useFactory: () => {
        // 返回null，实际的WebSocket服务器将由Gateway在运行时注入
        // 这解决了循环依赖问题，同时保持了类型安全
        return null;
      },
    },
  ],
  exports: [
    StreamDataFetcherService,
    StreamDataCacheService,
    StreamClientStateManager,
    StreamRecoveryWorkerService,
    StreamRecoveryConfigService,
    StreamRecoveryMetricsService,
    // 导出WebSocket服务器提供者供其他模块使用
    'WEBSOCKET_SERVER',
  ],
})
export class StreamDataFetcherModule {}