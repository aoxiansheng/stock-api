import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataMapperCacheService } from "../services/data-mapper-cache.service";
import { DataMapperCacheStandardizedService } from "../services/data-mapper-cache-standardized.service";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * DataMapper 缓存模块 - 双服务架构
 * Phase 8.2: Data Mapper Cache Migration - 支持渐进式迁移
 *
 * 特性：
 * 1. 双服务支持：原有业务逻辑服务 + 标准化服务
 * 2. 100% 向后兼容：现有代码无需修改
 * 3. 渐进式迁移：可逐步迁移到标准化接口
 * 4. 完整标准化功能：监控、诊断、自愈、批量操作
 *
 * 设计原则：
 * 1. 单一职责：仅处理 DataMapper 相关缓存
 * 2. 事件驱动监控：使用 EventEmitter2 实现完全解耦
 * 3. 模块化：可独立导入和使用
 * 4. 零破坏性：保持所有现有功能
 */
@Module({
  imports: [
    EventEmitterModule, // ✅ 事件驱动监控依赖
  ],
  providers: [
    // 💼 原有服务 - 保持向后兼容
    DataMapperCacheService,

    // 🆕 标准化服务 - 新增功能
    DataMapperCacheStandardizedService,

    // 🏷️ 别名提供者便于识别
    { provide: 'IDataMapperCache', useExisting: DataMapperCacheService },
    { provide: 'DataMapperCacheStandard', useExisting: DataMapperCacheStandardizedService },

    // 📋 Configuration provider for standardized service
    {
      provide: 'dataMapperCacheConfig',
      useFactory: (configService: ConfigService) => {
        // Basic configuration for data mapper cache
        // In production, this should come from proper config modules
        return {
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_DB', 0),
          },
          cache: {
            defaultTtl: 300,
            maxMemoryPolicy: 'allkeys-lru',
            keyPrefix: 'dm:',
          },
          performance: {
            enableMetrics: true,
            maxErrorHistorySize: 1000,
            maxPerformanceHistorySize: 10000,
          },
          features: {
            enableCompression: false,
            enableBatching: true,
            enableCircuitBreaker: true,
            batchSize: 100,
          }
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    // 📤 导出两个服务供其他模块使用
    DataMapperCacheService,           // 🔄 原有接口 - 保持兼容性
    DataMapperCacheStandardizedService, // 🆕 标准化接口 - 新增功能

    // 🏷️ 别名导出便于识别
    'IDataMapperCache',
    'DataMapperCacheStandard',
  ],
})
export class DataMapperCacheModule {
  constructor() {
    // 📊 模块初始化日志
    console.log('✅ DataMapperCacheModule initialized with dual-service architecture');
    console.log('   📦 Legacy service: DataMapperCacheService (IDataMapperCache)');
    console.log('   🆕 Standardized service: DataMapperCacheStandardizedService (StandardCacheModuleInterface)');
    console.log('   🔄 Migration status: Ready for gradual consumer migration');
  }
}
