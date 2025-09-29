import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () => ({
          // 测试环境缓存配置
          cacheUnified: {
            defaultTtl: 300,
            compressionThreshold: 1024,
            maxBatchSize: 100,
            lockTtl: 30,
            retryDelayMs: 100,
            slowOperationMs: 1000,
            strongTimelinessTtl: 5,
            realtimeTtl: 60,
            longTermTtl: 3600,
            monitoringTtl: 300,
            authTtl: 600,
            transformerTtl: 900,
            suggestionTtl: 1800,
            maxValueSizeMB: 10,
            compressionEnabled: true,
            maxItems: 10000,
            maxKeyLength: 255,
            maxCacheSize: 10000,
            lruSortBatchSize: 1000,
            smartCacheMaxBatch: 50,
            maxCacheSizeMB: 1024
          },

          // 测试环境认证配置
          authUnified: {
            cache: {
              apiKeyCacheTtl: 300,
              permissionCacheTtl: 300,
              rateLimitCacheTtl: 60,
              sessionCacheTtl: 3600,
              statisticsCacheTtl: 300
            },
            limits: {
              globalRateLimit: 100,
              stringLimit: 10000,
              timeout: 5000,
              apiKeyLength: 32,
              maxApiKeysPerUser: 50,
              maxLoginAttempts: 5,
              loginLockoutMinutes: 15
            }
          },

          // 测试环境JWT配置
          JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
          JWT_EXPIRES_IN: '24h',

          // 测试环境Redis配置
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,

          // 测试环境MongoDB配置
          MONGODB_URI: 'mongodb://localhost:27017/test-smart-stock-data',

          // 测试环境通用配置
          NODE_ENV: 'test',
          AUTO_INIT_ENABLED: false,
          DISABLE_AUTO_INIT: true,
        })
      ],
      isGlobal: true,
      cache: true,
    }),

    // 测试环境事件发射器
    EventEmitterModule.forRoot({
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [
    // 提供测试环境标识
    {
      provide: 'TEST_ENVIRONMENT',
      useValue: true,
    },
  ],
  exports: [
    ConfigModule,
    EventEmitterModule,
    'TEST_ENVIRONMENT',
  ],
})
export class TestInfrastructureModule {}