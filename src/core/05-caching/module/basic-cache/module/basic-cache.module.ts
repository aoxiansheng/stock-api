import { Module, OnModuleDestroy, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { StandardizedCacheService } from "../services/standardized-cache.service";
import { CacheCompressionService } from "../services/cache-compression.service";
import { CacheConfigValidator } from "../validators/cache-config.validator";
import { CACHE_CONFIG } from "../constants/cache-config.constants";
import { MonitoringModule } from "../../../../../monitoring/monitoring.module";
import { CACHE_REDIS_CLIENT_TOKEN } from "../../../../../monitoring/contracts";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * 通用缓存模块 (架构简化重构版本)
 * 非全局模块，需显式导入
 *
 * 重构后服务架构：
 * - StandardizedCacheService: 统一标准化服务 (主要) - ✅ 已验证工作正常
 */
@Module({
  imports: [
    // ConfigModule已通过AppConfigModule全局提供，无需重复导入
    MonitoringModule, // ✅ 导入监控模块，提供CollectorService
  ],
  providers: [
    // Redis客户端提供者
    {
      provide: CACHE_REDIS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.db", 0),

          // 连接配置 - 优化超时设置
          connectTimeout: CACHE_CONFIG.TIMEOUTS.CONNECTION_TIMEOUT,
          commandTimeout: CACHE_CONFIG.TIMEOUTS.REDIS_OPERATION_TIMEOUT,
          lazyConnect: false, // 禁用懒连接，立即连接

          // 连接池配置
          maxRetriesPerRequest: CACHE_CONFIG.RETRY.MAX_ATTEMPTS,
          retryDelayOnFailover: CACHE_CONFIG.RETRY.BASE_DELAY_MS,

          // 重连配置
          reconnectOnError: (err) => {
            const targetError = "READONLY";
            return err.message.includes(targetError);
          },

          // 健康检查
          enableReadyCheck: true,
          keepAlive: 30000,

          // 性能优化
          enableOfflineQueue: false,
          enableAutoPipelining: true,

          // 日志配置（生产环境建议关闭）
          showFriendlyErrorStack: process.env.NODE_ENV !== "production",
        };

        const redis = new Redis(redisConfig);

        // 连接事件监听
        redis.on("connect", () => {
          console.log(
            `✅ Redis connected to ${redisConfig.host}:${redisConfig.port}`,
          );
        });

        redis.on("error", (error) => {
          console.error("❌ Redis connection error:", error.message);
        });

        redis.on("close", () => {
          console.log("🔌 Redis connection closed");
        });

        redis.on("reconnecting", (delay) => {
          console.log(`🔄 Redis reconnecting in ${delay}ms`);
        });

        return redis;
      },
      inject: [ConfigService],
    },

    // 🎯 统一标准化服务 (重构后主要服务)
    StandardizedCacheService,



    // 📦 辅助服务
    CacheCompressionService,
    CacheConfigValidator,
  ],
  exports: [
    // 🎯 主要导出统一标准化服务 (重构后主要接口)
    StandardizedCacheService,


    // 辅助服务导出
    CacheCompressionService,
    CacheConfigValidator,
    CACHE_REDIS_CLIENT_TOKEN,
    // ✅ 移除METRICS_REGISTRY导出
  ],
})
export class BasicCacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
    private readonly configValidator: CacheConfigValidator,
    private readonly standardizedCacheService: StandardizedCacheService,
  ) {}

  async onModuleInit() {
    console.log(`🚀 BasicCacheModule initializing...`);

    // ✅ Phase 1: 配置验证
    console.log(`🔍 Validating cache configuration...`);
    const validationResult = this.configValidator.validateConfig();

    if (!validationResult.valid) {
      console.error("❌ CommonCache configuration validation failed:");
      console.error(this.configValidator.getConfigSummary(validationResult));
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.COMMON_CACHE,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'onModuleInit',
        message: `CommonCache configuration validation failed: ${validationResult.errors.join(", ")}`,
        context: {
          validationErrors: validationResult.errors,
          warnings: validationResult.warnings,
          recommendations: validationResult.recommendations,
          operation: 'module_initialization'
        }
      });
    }

    // 记录验证摘要
    const summary = this.configValidator.getConfigSummary(validationResult);
    console.log("✅ CommonCache configuration validation passed");
    if (
      validationResult.warnings.length > 0 ||
      validationResult.recommendations.length > 0
    ) {
      console.log("ℹ️  Configuration summary:\n" + summary);
    }

    // ✅ Phase 2: 生产环境就绪检查
    const productionCheck = this.configValidator.isProductionReady(
      validationResult.config,
    );
    if (!productionCheck.ready) {
      console.warn("⚠️  Production readiness issues detected:");
      productionCheck.issues.forEach((issue) => console.warn(`  • ${issue}`));
    }

    // ✅ Phase 3: Redis连接验证
    console.log(
      `📡 Connecting to Redis: ${validationResult.config.redis.host}:${validationResult.config.redis.port}`,
    );
    try {
      await this.redisClient.ping();
      console.log("✅ CommonCache Redis connection verified");
    } catch (error) {
      console.error("❌ CommonCache Redis connection failed:", error.message);
      throw error;
    }

    // ✅ Phase 4: 统一标准化服务初始化
    console.log(`🎯 Initializing StandardizedCacheService...`);
    try {
      await this.standardizedCacheService.initialize(validationResult.config);
      console.log(`✅ StandardizedCacheService initialized successfully`);
    } catch (error) {
      console.error(`❌ StandardizedCacheService initialization failed:`, error);
      throw error;
    }

    // ✅ Phase 5: 初始化摘要
    console.log(`✅ BasicCacheModule initialized successfully (Architecture Simplified)`);
    console.log(`⚙️  Configuration summary:`);
    console.log(
      `   • Redis: ${validationResult.config.redis.host}:${validationResult.config.redis.port} (DB: ${validationResult.config.redis.db})`,
    );
    console.log(
      `   • TTL: ${validationResult.config.ttl.defaultSeconds}s (${validationResult.config.ttl.minSeconds}s - ${validationResult.config.ttl.maxSeconds}s)`,
    );
    console.log(
      `   • Compression: ${validationResult.config.compression.enabled ? "enabled" : "disabled"} (threshold: ${validationResult.config.compression.thresholdBytes} bytes)`,
    );
    console.log(
      `   • Batch: max ${validationResult.config.batch.maxBatchSize} items (timeout: ${validationResult.config.batch.timeoutMs}ms)`,
    );
    console.log(
      `   • Decompression: max ${validationResult.config.decompression.maxConcurrent} concurrent (timeout: ${validationResult.config.decompression.timeoutMs}ms)`,
    );
    console.log(
      `   • Services: StandardizedCacheService (unified cache service)`,
    );
  }

  async onModuleDestroy() {
    console.log("🧹 Cleaning up CommonCache module...");

    try {
      // ✅ 修复P0问题：先清理服务资源
      console.log("🧹 Cleaning up services...");

      // 清理StandardizedCacheService资源（主要服务）
      try {
        this.standardizedCacheService.cleanup();
        console.log("✅ StandardizedCacheService cleanup completed");
      } catch (error) {
        console.error("❌ StandardizedCacheService cleanup error:", error.message);
      }


      // 清理Redis连接和事件监听器
      console.log("🧹 Cleaning up Redis connections...");
      this.redisClient.removeAllListeners("connect");
      this.redisClient.removeAllListeners("error");
      this.redisClient.removeAllListeners("close");
      this.redisClient.removeAllListeners("reconnecting");

      // 优雅关闭连接
      await this.redisClient.quit();
      console.log("✅ CommonCache Redis cleanup completed");
      console.log("✅ CommonCache module cleanup completed");
    } catch (error) {
      console.error("❌ CommonCache module cleanup error:", error.message);
      // 强制断开连接
      this.redisClient.disconnect();
    }
  }
}

