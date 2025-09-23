import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

// 导入统一配置
import coreCacheUnifiedConfig from "../config/cache-unified.config";

// 导入所有核心缓存模块
import { SmartCacheModule } from "../smart-cache/module/smart-cache.module";
import { StreamCacheModule } from "../stream-cache/module/stream-cache.module";
import { DataMapperCacheModule } from "../data-mapper-cache/module/data-mapper-cache.module";
import { SymbolMapperCacheModule } from "../symbol-mapper-cache/module/symbol-mapper-cache.module";
import { CommonCacheModule } from "../basic-cache/module/basic-cache.module";

// 导入配置工厂集成器
import { CoreCacheConfigIntegrator } from "../config/cache-unified.config";

/**
 * 核心缓存统一模块
 * 🎯 遵循四层配置体系，统一管理所有核心缓存组件
 *
 * 核心功能：
 * - 统一配置管理：集中管理所有缓存组件的配置
 * - 环境变量支持：完整的环境变量覆盖支持
 * - 配置验证：运行时配置验证和错误处理
 * - 组件协调：确保各缓存组件间的配置一致性
 *
 * 集成的缓存组件：
 * - SmartCache: 智能缓存编排器
 * - StreamCache: 流数据专用缓存
 * - DataMapperCache: 数据映射缓存
 * - SymbolMapperCache: 符号映射缓存（三层LRU）
 * - BasicCache: 基础缓存工具
 */
@Module({
  imports: [
    // 🆕 统一配置（主配置）
    ConfigModule.forFeature(coreCacheUnifiedConfig),

    // 核心缓存组件模块
    CommonCacheModule, // 基础缓存工具（其他模块的依赖）
    SmartCacheModule, // 智能缓存编排器
    StreamCacheModule, // 流数据缓存
    DataMapperCacheModule, // 数据映射缓存
    SymbolMapperCacheModule, // 符号映射缓存
  ],
  providers: [
    // 🎯 统一配置提供者
    {
      provide: "coreCacheUnified",
      useFactory: (configService: ConfigService) =>
        configService.get("coreCacheUnified"),
      inject: [ConfigService],
    },

    // 🎯 配置集成器提供者
    {
      provide: "coreCacheConfigIntegrator",
      useFactory: () => CoreCacheConfigIntegrator,
    },

    // 🎯 所有组件配置的统一提供者（用于一次性获取所有配置）
    {
      provide: "allCacheConfigs",
      useFactory: () => {
        try {
          const configs = CoreCacheConfigIntegrator.createAllConfigs();

          // 执行配置一致性验证
          const consistencyErrors = CoreCacheConfigIntegrator.validateConfigConsistency(configs);
          if (consistencyErrors.length > 0) {
            console.warn(
              `⚠️ Core Cache configuration consistency warnings:`,
              consistencyErrors
            );
            // 不抛出异常，仅记录警告，允许系统继续运行
          }

          console.log(`✅ Core Cache unified configuration loaded successfully`);
          return configs;
        } catch (error) {
          console.error(`❌ Failed to create core cache configurations:`, error);
          throw error;
        }
      },
    },
  ],
  exports: [
    // 导出所有缓存模块
    SmartCacheModule,
    StreamCacheModule,
    DataMapperCacheModule,
    SymbolMapperCacheModule,
    CommonCacheModule,

    // 导出配置提供者
    "coreCacheUnified",
    "coreCacheConfigIntegrator",
    "allCacheConfigs",
  ],
})
export class CoreCacheModule {
  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logConfigurationSummary();
  }

  /**
   * 记录配置摘要信息
   */
  private logConfigurationSummary() {
    try {
      const config = this.configService.get("coreCacheUnified");

      if (config) {
        console.log(`🚀 Core Cache Module initialized with unified configuration:`);
        console.log(`   Global Enabled: ${config.globalEnabled}`);
        console.log(`   Debug Mode: ${config.globalDebugMode}`);
        console.log(`   Performance Monitoring: ${config.globalPerformanceMonitoringEnabled}`);
        console.log(`   Components Enabled:`);
        console.log(`     - Smart Cache: ${config.smartCacheEnabled}`);
        console.log(`     - Stream Cache: ${config.streamCacheEnabled}`);
        console.log(`     - Data Mapper Cache: ${config.dataMapperCacheEnabled}`);
        console.log(`     - Symbol Mapper Cache: ${config.symbolMapperCacheEnabled}`);
        console.log(`   Cross-Component Features:`);
        console.log(`     - Cross Invalidation: ${config.crossComponentInvalidationEnabled}`);
        console.log(`     - Consistency Check Interval: ${config.interComponentConsistencyCheckInterval}ms`);
        console.log(`     - Monitoring Sample Rate: ${config.unifiedMonitoringSampleRate}`);
      } else {
        console.warn(`⚠️ Core Cache unified configuration not found, using defaults`);
      }
    } catch (error) {
      console.error(`❌ Failed to log Core Cache configuration summary:`, error);
    }
  }
}