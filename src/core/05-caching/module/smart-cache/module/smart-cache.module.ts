import { Module } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { StorageModule } from "../../../../04-storage/storage/module/storage.module";
import { SharedServicesModule } from "../../../../shared/module/shared-services.module";
import { BasicCacheModule } from "../../basic-cache/module/basic-cache.module";
import { SmartCacheStandardizedService } from "../services/smart-cache-standardized.service";
import {
  DEFAULT_SMART_CACHE_CONFIG,
  SMART_CACHE_ORCHESTRATOR_CONFIG,
} from "../interfaces/smart-cache-config.interface";
import { SmartCacheConfigFactory } from "../config/smart-cache-config.factory";
import { SmartCachePerformanceOptimizer } from "../services/smart-cache-performance-optimizer.service";
// 移除 CollectorModule 依赖 - 事件化监控不再需要直接导入监控模块

/**
 * 智能缓存模块 (标准化版本)
 *
 * 核心功能：
 * - 统一Receiver与Query的缓存调用骨架
 * - 提供多种缓存策略（强时效、弱时效、市场感知等）
 * - 后台更新机制与优先级调度
 * - 智能缓存键管理和TTL动态调整
 * - 标准化缓存模块接口实现
 * - 与 Foundation 层完全集成
 *
 * 依赖模块：
 * - StorageModule: 提供StorageService，用于底层缓存操作
 * - SharedServicesModule: 提供MarketStatusService、BackgroundTaskService等共享服务
 * - BasicCacheModule: 提供通用缓存服务
 *
 * 服务模式：
 * - SmartCacheStandardizedService: 标准化智能缓存服务
 *
 * 使用方式：
 * - 在QueryModule、ReceiverModule中导入此模块
 * - 使用SmartCacheStandardizedService进行智能缓存操作
 */
import { MarketInferenceModule } from '@common/modules/market-inference/market-inference.module';

@Module({
  imports: [
    // 🔑 关键依赖：StorageModule（非全局，必须显式导入）
    // 提供StorageService用于底层缓存操作和智能缓存功能
    StorageModule,

    // 🔑 关键依赖：BasicCacheModule（Phase 4.4 迁移）
    // 提供StandardizedCacheService用于缓存操作
    BasicCacheModule,

    // 🔑 关键依赖：SharedServicesModule (全局模块)
    // 提供以下共享服务：
    // - MarketStatusService: 市场状态查询，用于市场感知策略
    // - DataChangeDetectorService: 数据变化检测
    // - BackgroundTaskService: 后台任务服务
    SharedServicesModule,
    MarketInferenceModule,

    // ✅ 已移除 CollectorModule - 使用事件化监控，SharedServicesModule 中的 EventEmitter2 已足够
  ],

  providers: [
    // 🆕 标准化服务 (主要服务)
    SmartCacheStandardizedService,

    // 🚀 性能优化器服务
    SmartCachePerformanceOptimizer,

    // 📋 配置提供者 - 使用环境变量驱动的配置工厂
    {
      provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
      useFactory: () => SmartCacheConfigFactory.createConfig(),
    },
  ],

  exports: [
    // 主要导出标准化服务
    SmartCacheStandardizedService,

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
  config: Partial<any>, // 暂时使用 any，配置接口将在后续清理
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
      BasicCacheModule,
      SharedServicesModule,
      MarketInferenceModule,
    ],
    providers: [
      SmartCacheStandardizedService,
      SmartCachePerformanceOptimizer,
      {
        provide: SMART_CACHE_ORCHESTRATOR_CONFIG,
        useValue: mergedConfig,
      },
    ],
    exports: [SmartCacheStandardizedService, SMART_CACHE_ORCHESTRATOR_CONFIG],
  })
  class ConfiguredSmartCacheModule {}

  return ConfiguredSmartCacheModule;
}

/**
 * 静态方法：创建带有自定义配置的模块
 */
(SmartCacheModule as any).forRoot = createSmartCacheModuleWithConfig;
