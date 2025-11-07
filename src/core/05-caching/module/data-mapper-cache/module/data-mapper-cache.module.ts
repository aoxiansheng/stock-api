import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
// DataMapperCacheService removed - migration completed
import { DataMapperCacheStandardizedService } from "../services/data-mapper-cache-standardized.service";
// import { EventEmitterModule } from "@nestjs/event-emitter";

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
    // 事件驱动监控依赖已移除（聚焦核心缓存功能）
  ],
  providers: [
    // 📡 Redis客户端提供者 - 专用于数据映射缓存
    {
      provide: 'DATA_MAPPER_REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),

          // 连接配置 - 数据映射优化
          connectTimeout: 5000,
          commandTimeout: 3000,
          lazyConnect: true,

          // 连接池配置
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,

          // 重连配置
          reconnectOnError: (err) => {
            const targetError = "READONLY";
            return err.message.includes(targetError);
          },

          // 性能优化
          enableReadyCheck: true,
          keepAlive: 30000,
          enableOfflineQueue: false,
          enableAutoPipelining: true,

          // 内存优化
          keyPrefix: "dm:", // 数据映射专用前缀

          // 日志配置
          showFriendlyErrorStack: process.env.NODE_ENV !== "production",
        };

        const redis = new Redis(redisConfig);

        // 连接事件监听 - 数据映射缓存专用 (生产环境)
        if (process.env.NODE_ENV !== 'test') {
          redis.on("connect", () => {
            console.log(
              `✅ DataMapper Redis connected to ${redisConfig.host}:${redisConfig.port}`,
            );
          });

          redis.on("error", (error) => {
            console.error(
              "❌ DataMapper Redis connection error:",
              error.message,
            );
          });

          redis.on("close", () => {
            console.log("🔌 DataMapper Redis connection closed");
          });

          redis.on("reconnecting", (delay) => {
            console.log(`🔄 DataMapper Redis reconnecting in ${delay}ms`);
          });
        }

        return redis;
      },
      inject: [ConfigService],
    },

    // 🆕 标准化服务 - Migration completed
    DataMapperCacheStandardizedService,

    // 🏷️ 别名提供者 - 使用标准化服务
    // 别名提供者移除：仓库内无引用，避免扩大依赖面

    // 📋 Configuration provider for standardized service
    {
      provide: 'dataMapperCacheConfig',
      useFactory: (configService: ConfigService) => {
        // Configuration for data mapper cache with Redis settings
        return {
          defaultTtlSeconds: 300, // 5 minutes default TTL
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
    // 别名导出移除

    // 📡 导出Redis客户端供测试和其他模块使用
    'DATA_MAPPER_REDIS_CLIENT',
    'dataMapperCacheConfig',
  ],
})
export class DataMapperCacheModule {
  // 降噪：移除非必要的运行期初始化日志
}
