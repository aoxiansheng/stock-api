import { Module, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StreamCacheService } from '../services/stream-cache.service';
import { STREAM_CACHE_CONFIG, DEFAULT_STREAM_CACHE_CONFIG } from '../constants/stream-cache.constants';
import { MonitoringModule } from '../../../../monitoring/monitoring.module';
import { 
  MONITORING_COLLECTOR_TOKEN, 
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN 
} from '../../../../monitoring/contracts';
import { CollectorService } from '../../../../monitoring/collector/collector.service';

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
    ConfigModule,
    MonitoringModule, // ✅ 导入监控模块，提供真实CollectorService
  ],
  providers: [
    // Redis客户端提供者 - 专用于流数据缓存
    {
      provide: CACHE_REDIS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.stream_cache_db', 1), // 使用独立的DB
          
          // 流数据优化配置
          connectTimeout: 5000,
          commandTimeout: 3000,
          lazyConnect: true,
          
          // 连接池配置 - 针对高频流数据访问优化
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          
          // 重连配置
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            return err.message.includes(targetError);
          },
          
          // 性能优化 - 流数据特性
          enableReadyCheck: true,
          keepAlive: 10000,        // 更短的保活时间
          enableOfflineQueue: false, // 流数据不允许离线队列
          enableAutoPipelining: true, // 启用自动管道化
          
          // 内存优化
          keyPrefix: 'stream:',      // 统一前缀便于管理
          
          // 日志配置
          showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
        };

        const redis = new Redis(redisConfig);

        // 连接事件监听 - 流数据缓存专用
        redis.on('connect', () => {
          console.log(`✅ StreamCache Redis connected to ${redisConfig.host}:${redisConfig.port} (DB: ${redisConfig.db})`);
        });

        redis.on('error', (error) => {
          console.error('❌ StreamCache Redis connection error:', error.message);
        });

        redis.on('close', () => {
          console.log('🔌 StreamCache Redis connection closed');
        });

        redis.on('reconnecting', (delay) => {
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
        return {
          hotCacheTTL: configService.get<number>('stream_cache.hot_ttl_ms', DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL),
          warmCacheTTL: configService.get<number>('stream_cache.warm_ttl_seconds', DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL),
          maxHotCacheSize: configService.get<number>('stream_cache.max_hot_size', DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize),
          cleanupInterval: configService.get<number>('stream_cache.cleanup_interval_ms', DEFAULT_STREAM_CACHE_CONFIG.cleanupInterval),
          compressionThreshold: configService.get<number>('stream_cache.compression_threshold', DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold),
        };
      },
      inject: [ConfigService],
    },

    // ✅ 提供CollectorService（从 MonitoringModule 导入）
    {
      provide: MONITORING_COLLECTOR_TOKEN,
      useExisting: CollectorService, // 使用类引用而不是字符串引用
    },

    // 核心流缓存服务
    StreamCacheService,
  ],
  exports: [
    StreamCacheService,
    CACHE_REDIS_CLIENT_TOKEN,
    STREAM_CACHE_CONFIG_TOKEN,
  ],
})
export class StreamCacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
  ) {}

  async onModuleInit() {
    // 模块初始化日志
    const redisHost = this.configService.get<string>('redis.host', 'localhost');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    const redisDb = this.configService.get<number>('redis.stream_cache_db', 1);
    
    console.log(`🚀 StreamCacheModule initialized`);
    console.log(`📡 StreamCache Redis configuration: ${redisHost}:${redisPort} (DB: ${redisDb})`);
    console.log(`⚙️  StreamCache config: Hot TTL=${STREAM_CACHE_CONFIG.TTL.HOT_CACHE_MS}ms, Warm TTL=${STREAM_CACHE_CONFIG.TTL.WARM_CACHE_SECONDS}s`);

    // 验证Redis连接
    try {
      await this.redisClient.ping();
      console.log('✅ StreamCache Redis connection verified');
    } catch (error) {
      console.error('❌ StreamCache Redis connection failed:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    console.log('🧹 Cleaning up StreamCache Redis connections...');
    
    try {
      // 清理事件监听器
      this.redisClient.removeAllListeners('connect');
      this.redisClient.removeAllListeners('error');
      this.redisClient.removeAllListeners('close');
      this.redisClient.removeAllListeners('reconnecting');
      
      // 优雅关闭连接
      await this.redisClient.quit();
      console.log('✅ StreamCache Redis cleanup completed');
    } catch (error) {
      console.error('❌ StreamCache Redis cleanup error:', error.message);
      // 强制断开连接
      this.redisClient.disconnect();
    }
  }
}