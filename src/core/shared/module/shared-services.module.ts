/**
 * 共享服务模块
 * 🎯 提供核心组件间共享的服务，解决循环依赖
 */

import { Module, Global } from "@nestjs/common";

import { CacheModule } from "../../../cache/module/cache.module";
import { MonitoringModule } from '../../../monitoring/monitoring.module'; // ✅ 导入监控模块
// import { FeatureFlags } from "../../../common/config/feature-flags.config"; // 🔧 Phase 2.3: 移除未使用的 import

import { DataChangeDetectorService } from "../services/data-change-detector.service";
import { MarketStatusService } from "../services/market-status.service";
import { StringUtils } from "../utils/string.util";
import { BackgroundTaskService } from "../services/background-task.service";
// import { MetricsRegistryService } from '../../../monitoring/infrastructure/metrics/metrics-registry.service'; // 🔧 Phase 1: 移除未使用的 import
//import { StreamPerformanceMetricsService } from "../services/stream-performance-metrics.service";
//import { DynamicLogLevelService } from "../services/dynamic-log-level.service";
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
  imports: [
    CacheModule,
    MonitoringModule, // ✅ 标准监控模块导入，获得CollectorService
  ],
  providers: [
    // DataFetchingService, // 移动到需要的模块中，因为它依赖CapabilityRegistryService
    // BaseFetcherService, // 抽象基类不需要注册为provider，只用于继承
    DataChangeDetectorService,
    MarketStatusService,
    StringUtils,
    BackgroundTaskService,
    // FeatureFlags, // 🔧 Phase 2.3: 移除 FeatureFlags，转移到 InfrastructureModule 统一提供
    // MetricsRegistryService, // 🔧 Phase 1.2.1: 移除重复提供者，由 MetricsModule 统一提供
    FieldMappingService,
  ],
  exports: [
    // DataFetchingService, // 移动到需要的模块中
    // BaseFetcherService, // 抽象基类不需要导出，因为它只是抽象基类
    DataChangeDetectorService,
    MarketStatusService,
    StringUtils,
    BackgroundTaskService,
    // FeatureFlags, // 🔧 Phase 2.3: 移除 FeatureFlags 导出，转移到 InfrastructureModule
    // MetricsRegistryService, // 🔧 Phase 1.2.1: 移除重复导出，由 MetricsModule 统一提供
    FieldMappingService,
  ],
})
export class SharedServicesModule {}
