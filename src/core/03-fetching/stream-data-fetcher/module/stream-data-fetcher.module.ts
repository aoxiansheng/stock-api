import { Module } from "@nestjs/common";
import { StreamDataFetcherService } from "../services/stream-data-fetcher.service";
import { StreamClientStateManager } from "../services/stream-client-state-manager.service";
import { UpstreamSymbolSubscriptionCoordinatorService } from "../services/upstream-symbol-subscription-coordinator.service";
import { StreamRecoveryWorkerService } from "../services/stream-recovery-worker.service";
import { ConnectionPoolManager } from "../services/connection-pool-manager.service";
import { StreamRateLimitGuard } from "../guards/stream-rate-limit.guard";
import { WebSocketRateLimitGuard } from "../guards/websocket-rate-limit.guard";
import { ErrorSanitizerInterceptor } from "../interceptors/error-sanitizer.interceptor";
import { StreamConfigService } from "../config/stream-config.service";
import { StreamRecoveryConfigService } from "../config/stream-recovery.config";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../providers/websocket-server.provider";
import { WebSocketFeatureFlagsService } from "../config/websocket-feature-flags.config";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { ProvidersV2Module } from "@providersv2";
import { StreamCacheModule } from "../../../05-caching/module/stream-cache/module/stream-cache.module";

/**
 * StreamDataFetcher模块 - Phase 4+ 重构版本
 * 提供WebSocket流数据获取、客户端状态管理和Worker线程池功能
 *
 * 重构变更：
 * - 移除对通用CacheModule的依赖
 * - 移除StreamDataCacheService (已迁移到StreamCacheModule)
 * - 导入专用StreamCacheModule
 * - P2-1: 新增StreamMonitoringService优化依赖结构
 */
@Module({
  imports: [
    SharedServicesModule, // 导入共享服务(包含BaseFetcherService相关依赖)
    ProvidersV2Module, // 导入极简提供商模块以访问 ProviderRegistryService
    StreamCacheModule, // 🎯 新增：导入专用流缓存模块
  ],
  providers: [
    // ✅ 仅保留核心业务服务
    StreamDataFetcherService,
    StreamClientStateManager,
    UpstreamSymbolSubscriptionCoordinatorService,
    StreamRecoveryWorkerService,
    ConnectionPoolManager, // 连接池管理器
    StreamRateLimitGuard, // DoS防护 - HTTP
    WebSocketRateLimitGuard, // DoS防护 - WebSocket
    ErrorSanitizerInterceptor, // 错误信息脱敏
    StreamConfigService, // 配置管理服务
    StreamRecoveryConfigService,
    // WebSocket特性开关服务 - 修复依赖注入问题
    WebSocketFeatureFlagsService,
    // 强类型WebSocket服务器提供者 - 替代forwardRef
    WebSocketServerProvider,
    {
      provide: WEBSOCKET_SERVER_TOKEN,
      useExisting: WebSocketServerProvider,
    },
    // ❌ 已移除所有自定义监控服务：
    // StreamMetricsService,
    // StreamMonitoringService,
    // StreamRecoveryMetricsService,
  ],
  exports: [
    // ✅ 仅导出核心业务服务
    StreamDataFetcherService,
    StreamClientStateManager,
    UpstreamSymbolSubscriptionCoordinatorService,
    StreamRecoveryWorkerService,
    StreamRecoveryConfigService,
    // 导出强类型WebSocket服务器提供者供其他模块使用
    WebSocketServerProvider,
    WEBSOCKET_SERVER_TOKEN,
    // ❌ 已移除所有自定义监控服务导出：
    // StreamMetricsService,
    // StreamMonitoringService,
    // StreamRecoveryMetricsService,
  ],
})
export class StreamDataFetcherModule {}
