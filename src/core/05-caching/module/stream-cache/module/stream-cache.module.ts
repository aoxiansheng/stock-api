import { Module, OnModuleDestroy, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { StreamCacheStandardizedService } from "../services/stream-cache-standardized.service";
import {
  DEFAULT_STREAM_CACHE_CONFIG,
  STREAM_CACHE_CONFIG_TOKEN,
  STREAM_CACHE_REDIS_CLIENT_TOKEN,
} from "../constants/stream-cache.constants";


/**
 * 流数据缓存模块
 * 专用于实时流数据的缓存管理
 *
 * 核心特性：
 * - 独立的Redis连接管理
 * - 双层缓存架构 (Hot Cache + Warm Cache)
 * - 流数据专用的压缩和序列化
 * - 智能缓存策略和TTL管理
 */
@Module({
  imports: [
    // ConfigModule已通过AppConfigModule全局提供，无需重复导入
    // EventEmitterModule已通过AppModule全局导入，无需重复导入
  ],
  providers: [
    // Redis客户端提供者 - 专用于流数据缓存
    {
      provide: STREAM_CACHE_REDIS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.stream_cache_db", 1), // 使用独立的DB

          // 流数据优化配置
          connectTimeout: 5000,
          commandTimeout: 3000,
          lazyConnect: true,

          // 连接池配置 - 针对高频流数据访问优化
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,

          // 重连配置
          reconnectOnError: (err) => {
            const targetError = "READONLY";
            return err.message.includes(targetError);
          },

          // 性能优化 - 流数据特性
          enableReadyCheck: true,
          keepAlive: 10000, // 更短的保活时间
          enableOfflineQueue: true, // 暂时启用离线队列避免启动失败
          enableAutoPipelining: true, // 启用自动管道化

          // 内存优化
          keyPrefix: "stream:", // 统一前缀便于管理

          // 日志配置
          showFriendlyErrorStack: process.env.NODE_ENV !== "production",
        };

        const redis = new Redis(redisConfig);

        // 连接事件监听 - 流数据缓存专用
        redis.on("connect", () => {
          console.log(
            `✅ StreamCache Redis connected to ${redisConfig.host}:${redisConfig.port} (DB: ${redisConfig.db})`,
          );
        });

        redis.on("error", (error) => {
          console.error(
            "❌ StreamCache Redis connection error:",
            error.message,
          );
        });

        redis.on("close", () => {
          console.log("🔌 StreamCache Redis connection closed");
        });

        redis.on("reconnecting", (delay) => {
          console.log(`🔄 StreamCache Redis reconnecting in ${delay}ms`);
        });

        return redis;
      },
      inject: [ConfigService],
    },

    // 流缓存配置提供者
    {
      provide: STREAM_CACHE_CONFIG_TOKEN,
      useFactory: (configService: ConfigService) => {
        // 统一从环境变量获取（存在则覆盖），否则使用默认值
        const n = (key: string, def: number) => {
          const v = configService.get<string | number>(key);
          if (v === undefined || v === null) return def;
          const num = typeof v === 'number' ? v : parseInt(String(v), 10);
          return Number.isFinite(num) ? num : def;
        };
        const b = (key: string, def: boolean) => {
          const v = configService.get<string | boolean>(key);
          if (v === undefined || v === null) return def;
          if (typeof v === 'boolean') return v;
          const s = String(v).toLowerCase();
          return s === 'true' || s === '1' || s === 'yes';
        };

        return {
          // 最小必要配置
          hotCacheTTL: n('STREAM_CACHE_HOT_TTL_MS', DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL),
          warmCacheTTL: n('STREAM_CACHE_WARM_TTL_SECONDS', DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL),
          maxHotCacheSize: n('STREAM_CACHE_MAX_HOT_SIZE', DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize),
          streamBatchSize: n('STREAM_CACHE_BATCH_SIZE', DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize),

          // 其他配置保持默认（尽量精简对外环境变量）
          connectionTimeout: DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout,
          heartbeatInterval: DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval,
          cleanupIntervalMs: DEFAULT_STREAM_CACHE_CONFIG.cleanupIntervalMs,
          maxCleanupItems: DEFAULT_STREAM_CACHE_CONFIG.maxCleanupItems,
          memoryCleanupThreshold: DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold,
          compressionThresholdBytes: n('STREAM_CACHE_COMPRESSION_THRESHOLD_BYTES', DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold),
          compressionEnabled: b('STREAM_CACHE_COMPRESSION_ENABLED', DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled),
          slowOperationThresholdMs: DEFAULT_STREAM_CACHE_CONFIG.slowOperationThresholdMs,
          statsLogIntervalMs: DEFAULT_STREAM_CACHE_CONFIG.statsLogIntervalMs,
          maxRetryAttempts: DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts,
          baseRetryDelayMs: DEFAULT_STREAM_CACHE_CONFIG.baseRetryDelayMs,
          retryDelayMultiplier: DEFAULT_STREAM_CACHE_CONFIG.retryDelayMultiplier,
          enableFallback: DEFAULT_STREAM_CACHE_CONFIG.enableFallback,
        };
      },
      inject: [ConfigService],
    },

    // 标准化流缓存服务 - Phase 8 完成迁移
    StreamCacheStandardizedService,

  ],
  exports: [
    // Export new standardized service for production use
    StreamCacheStandardizedService,

    STREAM_CACHE_REDIS_CLIENT_TOKEN,
    STREAM_CACHE_CONFIG_TOKEN,
  ],
})
export class StreamCacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    @Inject(STREAM_CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
  ) {}

  async onModuleInit() {
    // 模块初始化日志
    const redisHost = this.configService.get<string>("redis.host", "localhost");
    const redisPort = this.configService.get<number>("redis.port", 6379);
    const redisDb = this.configService.get<number>("redis.stream_cache_db", 1);

    console.log(`🚀 StreamCacheModule initialized`);
    const hotMs = this.configService.get<number>('STREAM_CACHE_HOT_TTL_MS', DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL);
    const warmS = this.configService.get<number>('STREAM_CACHE_WARM_TTL_SECONDS', DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL);
    console.log(`⚙️  StreamCache config: Hot TTL=${hotMs}ms, Warm TTL=${warmS}s`);

    // 验证Redis连接
    try {
      await this.redisClient.ping();
      console.log("✅ StreamCache Redis connection verified");
    } catch (error) {
      console.error("❌ StreamCache Redis connection failed:", error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    console.log("🧹 Cleaning up StreamCache Redis connections...");

    try {
      // 清理事件监听器
      this.redisClient.removeAllListeners("connect");
      this.redisClient.removeAllListeners("error");
      this.redisClient.removeAllListeners("close");
      this.redisClient.removeAllListeners("reconnecting");

      // 优雅关闭连接
      await this.redisClient.quit();
      console.log("✅ StreamCache Redis cleanup completed");
    } catch (error) {
      console.error("❌ StreamCache Redis cleanup error:", error.message);
      // 强制断开连接
      this.redisClient.disconnect();
    }
  }
}
