import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { StreamCacheService } from '../services/stream-cache.service';
import { STREAM_CACHE_CONFIG, DEFAULT_STREAM_CACHE_CONFIG } from '../constants/stream-cache.constants';

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
  imports: [ConfigModule],
  providers: [
    // Redis客户端提供者 - 专用于流数据缓存
    {
      provide: 'REDIS_CLIENT',
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
      provide: 'STREAM_CACHE_CONFIG',
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

    // 核心流缓存服务
    StreamCacheService,
  ],
  exports: [
    StreamCacheService,
    'REDIS_CLIENT',
    'STREAM_CACHE_CONFIG',
  ],
})
export class StreamCacheModule {
  constructor(
    private readonly configService: ConfigService,
  ) {
    // 模块初始化日志
    const redisHost = this.configService.get<string>('redis.host', 'localhost');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    const redisDb = this.configService.get<number>('redis.stream_cache_db', 1);
    
    console.log(`🚀 StreamCacheModule initialized`);
    console.log(`📡 StreamCache Redis configuration: ${redisHost}:${redisPort} (DB: ${redisDb})`);
    console.log(`⚙️  StreamCache config: Hot TTL=${STREAM_CACHE_CONFIG.TTL.HOT_CACHE_MS}ms, Warm TTL=${STREAM_CACHE_CONFIG.TTL.WARM_CACHE_SECONDS}s`);
  }
}

/**
 * 异步模块配置（用于需要异步初始化的场景）
 */
@Module({})
export class StreamCacheAsyncModule {
  static forRootAsync() {
    return {
      module: StreamCacheAsyncModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: async (configService: ConfigService) => {
            const redisConfig = {
              host: configService.get<string>('redis.host', 'localhost'),
              port: configService.get<number>('redis.port', 6379),
              password: configService.get<string>('redis.password'),
              db: configService.get<number>('redis.stream_cache_db', 1),
              connectTimeout: 5000,
              commandTimeout: 3000,
            };

            const redis = new Redis(redisConfig);
            
            // 等待连接建立
            await redis.ping();
            console.log(`✅ StreamCache Redis async connection established`);
            
            return redis;
          },
          inject: [ConfigService],
        },
        {
          provide: 'STREAM_CACHE_CONFIG',
          useValue: DEFAULT_STREAM_CACHE_CONFIG,
        },
        StreamCacheService,
      ],
      exports: [StreamCacheService, 'REDIS_CLIENT', 'STREAM_CACHE_CONFIG'],
    };
  }
}