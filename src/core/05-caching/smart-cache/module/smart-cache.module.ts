import { Module } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { StorageModule } from "../../../04-storage/storage/module/storage.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { CommonCacheModule } from "../../common-cache/module/common-cache.module";
// BackgroundTaskService is provided by this module
import { SmartCacheOrchestrator } from "../services/smart-cache-orchestrator.service";
import {
  type SmartCacheOrchestratorConfig,
  DEFAULT_SMART_CACHE_CONFIG,
  SMART_CACHE_ORCHESTRATOR_CONFIG,
} from "../interfaces/smart-cache-config.interface";
import { SmartCacheConfigFactory } from "../config/smart-cache-config.factory";
import { SmartCachePerformanceOptimizer } from "../services/smart-cache-performance-optimizer.service";
// 移除 CollectorModule 依赖 - 事件化监控不再需要直接导入监控模块
import { BackgroundTaskService } from "@appcore/infrastructure/services/background-task.service";

/**
 * 智能缓存模块
 *
 * 核心功能：
 * - 统一Receiver与Query的缓存调用骨架
 * - 提供多种缓存策略（强时效、弱时效、市场感知等）
 * - 后台更新机制与优先级调度
 * - 智能缓存键管理和TTL动态调整
 *
 * 依赖模块：
 * - StorageModule: 提供StorageService，用于底层缓存操作
 * - SharedServicesModule: 提供MarketStatusService、BackgroundTaskService等共享服务
 * - CollectorModule: 提供CollectorService，用于监控数据收集
 *
 * 导出服务：
 * - SmartCacheOrchestrator: 核心编排器服务
 *
 * 使用方式：
 * - 在QueryModule、ReceiverModule中导入此模块
 * - 注入SmartCacheOrchestrator服务进行缓存操作
 */
import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';

@Module({
  imports: [
    // 🔑 关键依赖：StorageModule（非全局，必须显式导入）
    // 提供StorageService用于底层缓存操作和智能缓存功能
    StorageModule,

    // 🔑 关键依赖：CommonCacheModule（Phase 4.4 迁移）
    // 提供CommonCacheService用于缓存操作
    CommonCacheModule,

    // 🔑 关键依赖：SharedServicesModule
    // 提供以下共享服务：
    // - MarketStatusService: 市场状态查询，用于市场感知策略
    // - DataChangeDetectorService: 数据变化检测
    SharedServicesModule,
    MarketInferenceModule,

    // InfrastructureModule 已移除以避免循环依赖
    // BackgroundTaskService 直接在 providers 中提供

    // ✅ 已移除 CollectorModule - 使用事件化监控，SharedServicesModule 中的 EventEmitter2 已足够
  ],

  providers: [
    // 核心编排器服务
    SmartCacheOrchestrator,

    // 性能优化器服务
    SmartCachePerformanceOptimizer,

    // BackgroundTaskService 由本模块直接提供
    BackgroundTaskService,

    // 配置提供者 - 使用环境变量驱动的配置工厂
    {
      provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
      useFactory: () => SmartCacheConfigFactory.createConfig(),
    },
  ],

  exports: [
    // 导出核心编排器，供其他模块使用
    SmartCacheOrchestrator,

    // 导出性能优化器，供其他模块使用
    SmartCachePerformanceOptimizer,

    // 也导出配置令牌，便于测试和配置覆盖
    SMART_CACHE_ORCHESTRATOR_CONFIG,
  ],
})
export class SmartCacheModule {
  private readonly logger = createLogger(SmartCacheModule.name);

  constructor() {
    // 模块初始化日志
    this.logger.log("SmartCacheModule initialized");
  }
}

/**
 * 创建自定义配置的SmartCacheModule
 *
 * @param config 自定义配置
 * @returns 配置好的模块类
 *
 * 使用示例：
 * ```typescript
 * @Module({
 *   imports: [
 *     SmartCacheModule.forRoot({
 *       defaultMinUpdateInterval: 60000, // 自定义60秒间隔
 *       maxConcurrentUpdates: 5,         // 自定义并发数
 *       // ...其他配置
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function createSmartCacheModuleWithConfig(
  config: Partial<SmartCacheOrchestratorConfig>,
) {
  // 获取环境变量配置作为基础
  const envConfig = SmartCacheConfigFactory.createConfig();

  // 合并用户提供的配置，用户配置优先级更高
  const mergedConfig = {
    ...envConfig,
    ...config,
    strategies: {
      ...envConfig.strategies,
      ...config.strategies,
    },
  };

  @Module({
    imports: [
      StorageModule,
      CommonCacheModule,
      SharedServicesModule,
      //CollectorModule,
    ],
    providers: [
      SmartCacheOrchestrator,
      {
        provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
        useValue: mergedConfig,
      },
    ],
    exports: [SmartCacheOrchestrator, SMART_CACHE_ORCHESTRATOR_CONFIG],
  })
  class ConfiguredSmartCacheModule {}

  return ConfiguredSmartCacheModule;
}

/**
 * 静态方法：创建带有自定义配置的模块
 */
(SmartCacheModule as any).forRoot = createSmartCacheModuleWithConfig;
