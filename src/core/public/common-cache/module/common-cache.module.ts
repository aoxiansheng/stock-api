import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CommonCacheService } from '../services/common-cache.service';
import { CacheCompressionService } from '../services/cache-compression.service';
import { CACHE_CONFIG } from '../constants/cache-config.constants';

/**
 * 通用缓存模块
 * 非全局模块，需显式导入
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Redis客户端提供者
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db', 0),
          
          // 连接配置
          connectTimeout: CACHE_CONFIG.TIMEOUTS.CONNECTION_TIMEOUT,
          commandTimeout: CACHE_CONFIG.TIMEOUTS.REDIS_OPERATION_TIMEOUT,
          lazyConnect: true,
          
          // 连接池配置
          maxRetriesPerRequest: CACHE_CONFIG.RETRY.MAX_ATTEMPTS,
          retryDelayOnFailover: CACHE_CONFIG.RETRY.BASE_DELAY_MS,
          
          // 重连配置
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            return err.message.includes(targetError);
          },
          
          // 健康检查
          enableReadyCheck: true,
          keepAlive: 30000,
          
          // 性能优化
          enableOfflineQueue: false,
          enableAutoPipelining: true,
          
          // 日志配置（生产环境建议关闭）
          showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
        };

        const redis = new Redis(redisConfig);

        // 连接事件监听
        redis.on('connect', () => {
          console.log(`✅ Redis connected to ${redisConfig.host}:${redisConfig.port}`);
        });

        redis.on('error', (error) => {
          console.error('❌ Redis connection error:', error.message);
        });

        redis.on('close', () => {
          console.log('🔌 Redis connection closed');
        });

        redis.on('reconnecting', (delay) => {
          console.log(`🔄 Redis reconnecting in ${delay}ms`);
        });

        return redis;
      },
      inject: [ConfigService],
    },

    // 指标注册表提供者（可选）
    {
      provide: 'METRICS_REGISTRY',
      useFactory: () => {
        // 这里应该返回实际的MetricsRegistry实例
        // 暂时返回一个简单的mock对象
        return {
          inc: (name: string, labels?: Record<string, string>) => {
            // 在生产环境中，这里应该调用实际的指标收集器
            console.debug(`Metric ${name} incremented with labels:`, labels);
          },
          observe: (name: string, value: number, labels?: Record<string, string>) => {
            console.debug(`Metric ${name} observed value ${value} with labels:`, labels);
          },
        };
      },
    },

    // 核心服务
    CacheCompressionService,
    CommonCacheService,
  ],
  exports: [
    CommonCacheService,
    CacheCompressionService,
    'REDIS_CLIENT',
  ],
})
export class CommonCacheModule {
  constructor(
    private readonly configService: ConfigService,
  ) {
    // 模块初始化日志
    const redisHost = this.configService.get<string>('redis.host', 'localhost');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    
    console.log(`🚀 CommonCacheModule initialized`);
    console.log(`📡 Redis configuration: ${redisHost}:${redisPort}`);
    console.log(`⚙️  Cache config: TTL=${CACHE_CONFIG.TTL.DEFAULT_SECONDS}s, Batch=${CACHE_CONFIG.BATCH_LIMITS.MAX_BATCH_SIZE}`);
  }
}

/**
 * 异步模块配置（用于需要异步初始化的场景）
 */
@Module({})
export class CommonCacheAsyncModule {
  static forRootAsync() {
    return {
      module: CommonCacheAsyncModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: async (configService: ConfigService) => {
            const redisConfig = {
              host: configService.get<string>('redis.host', 'localhost'),
              port: configService.get<number>('redis.port', 6379),
              password: configService.get<string>('redis.password'),
              db: configService.get<number>('redis.db', 0),
              connectTimeout: CACHE_CONFIG.TIMEOUTS.CONNECTION_TIMEOUT,
              commandTimeout: CACHE_CONFIG.TIMEOUTS.REDIS_OPERATION_TIMEOUT,
            };

            const redis = new Redis(redisConfig);
            
            // 等待连接建立
            await redis.ping();
            console.log(`✅ Redis async connection established`);
            
            return redis;
          },
          inject: [ConfigService],
        },
        CacheCompressionService,
        CommonCacheService,
      ],
      exports: [CommonCacheService, CacheCompressionService],
    };
  }
}