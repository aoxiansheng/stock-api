/**
 * 共享服务模块
 * 🎯 提供核心组件间共享的服务，解决循环依赖
 */

import { Module, Global } from "@nestjs/common";

import { CacheModule } from "../../../cache/module/cache.module";
import { FeatureFlags } from "../../../common/config/feature-flags.config";

import { DataChangeDetectorService } from "../services/data-change-detector.service";
import { MarketStatusService } from "../services/market-status.service";
import { StringUtils } from "../utils/string.util";
import { BackgroundTaskService } from "../services/background-task.service";
import { MonitoringRegistryService } from "../../../system-status/monitoring/services/monitoring-registry.service";
import { StreamPerformanceMetricsService } from "../services/stream-performance-metrics.service";
import { DynamicLogLevelService } from "../services/dynamic-log-level.service";
import { FieldMappingService } from "../services/field-mapping.service";
// import { BaseFetcherService } from "../services/base-fetcher.service"; // Currently unused

/**
 * A global module that provides shared services for data fetching,
 * change detection, and market status. These services are fundamental
 * for core operations and are made available application-wide.
 *
 * @remarks
 * The services included here are singletons, ensuring consistent
 * behavior and state management across different parts of the application.
 * Using `@Global()` simplifies dependency injection by eliminating the need
 * to import `SharedServicesModule` in every feature module.
 * 
 * Note: ProvidersModule removed to prevent circular dependency and duplicate initialization.
 * Services requiring provider capabilities should import ProvidersModule directly.
 */
@Global()
@Module({
  imports: [CacheModule],
  providers: [
    // DataFetchingService, // 移动到需要的模块中，因为它依赖CapabilityRegistryService
    // BaseFetcherService, // 抽象基类不需要注册为provider，只用于继承
    DataChangeDetectorService,
    MarketStatusService,
    StringUtils,
    BackgroundTaskService,
    FeatureFlags,
    MonitoringRegistryService,
    StreamPerformanceMetricsService,
    DynamicLogLevelService,
    FieldMappingService,
  ],
  exports: [
    // DataFetchingService, // 移动到需要的模块中
    // BaseFetcherService, // 抽象基类不需要导出，因为它只是抽象基类
    DataChangeDetectorService,
    MarketStatusService,
    StringUtils,
    BackgroundTaskService,
    FeatureFlags,
    MonitoringRegistryService,
    StreamPerformanceMetricsService,
    DynamicLogLevelService,
    FieldMappingService,
  ],
})
export class SharedServicesModule {}
