import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// DataMapperCacheService removed - migration completed
import { DataMapperCacheStandardizedService } from "../services/data-mapper-cache-standardized.service";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * DataMapper 缓存模块 - 标准化服务
 * Phase 8.3: Data Mapper Cache Migration COMPLETED
 *
 * 特性：
 * 1. 完全标准化：使用DataMapperCacheStandardizedService
 * 2. 100% 向后兼容：通过别名保持现有API兼容性
 * 3. 迁移完成：所有消费者已迁移到标准化接口
 * 4. 完整标准化功能：监控、诊断、自愈、批量操作
 *
 * 设计原则：
 * 1. 单一职责：仅处理 DataMapper 相关缓存
 * 2. 事件驱动监控：使用 EventEmitter2 实现完全解耦
 * 3. 模块化：可独立导入和使用
 * 4. 标准化架构：遵循StandardCacheModuleInterface
 */
@Module({
  imports: [
    EventEmitterModule, // ✅ 事件驱动监控依赖
  ],
  providers: [
    // 🆕 标准化服务 - Migration completed
    DataMapperCacheStandardizedService,

    // 🏷️ 别名提供者 - 使用标准化服务
    { provide: 'IDataMapperCache', useExisting: DataMapperCacheStandardizedService },
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
    // 📤 导出标准化服务供其他模块使用
    DataMapperCacheStandardizedService, // 🆕 标准化接口 - Migration completed

    // 🏷️ 别名导出便于识别
    'IDataMapperCache',
    'DataMapperCacheStandard',
  ],
})
export class DataMapperCacheModule {
  constructor() {
    // 📊 模块初始化日志
    console.log('✅ DataMapperCacheModule initialized with standardized architecture');
    console.log('   🆕 Standardized service: DataMapperCacheStandardizedService (StandardCacheModuleInterface)');
    console.log('   ✅ Migration status: COMPLETED - All consumers migrated');
    console.log('   🔄 Backward compatibility: Maintained through alias providers');
  }
}
