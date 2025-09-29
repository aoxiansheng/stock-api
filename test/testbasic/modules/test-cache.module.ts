import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '@cache/services/cache.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { redisMockFactory, eventEmitterMockFactory } from '../mocks';
import { TestInfrastructureModule } from './test-infrastructure.module';
import Redis from 'ioredis';

/**
 * 测试专用缓存模块
 * 提供完整的缓存相关Mock和配置，用于隔离Redis依赖
 */
@Module({
  imports: [TestInfrastructureModule],
  providers: [
    // Redis连接Mock
    {
      provide: 'default_IORedisModuleConnectionToken',
      useFactory: redisMockFactory,
    },
    
    // 为@InjectRedis()装饰器添加支持
    {
      provide: Redis,
      useFactory: () => redisMockFactory(),
    },

    // EventEmitter Mock
    {
      provide: EventEmitter2,
      useFactory: eventEmitterMockFactory,
    },

    // 缓存统一配置提供者
    {
      provide: 'cacheUnified',
      useFactory: (configService: ConfigService) => {
        const config = configService.get('cacheUnified');
        if (!config) {
          throw new Error('cacheUnified configuration not found in TestInfrastructureModule');
        }
        return config;
      },
      inject: [ConfigService],
    },

    // PaginationService Mock（CacheModule依赖）
    {
      provide: PaginationService,
      useValue: {
        normalizePaginationQuery: jest.fn().mockImplementation((query) => ({
          page: query?.page || 1,
          limit: query?.limit || 10,
          skip: ((query?.page || 1) - 1) * (query?.limit || 10),
        })),
        createPaginatedResponse: jest.fn().mockImplementation((data, totalCount, query) => ({
          data,
          pagination: {
            page: query?.page || 1,
            limit: query?.limit || 10,
            totalCount,
            totalPages: Math.ceil(totalCount / (query?.limit || 10)),
            hasNext: (query?.page || 1) * (query?.limit || 10) < totalCount,
            hasPrev: (query?.page || 1) > 1,
          },
        })),
        validatePaginationParams: jest.fn().mockReturnValue(true),
        calculateOffset: jest.fn().mockImplementation((page, limit) => (page - 1) * limit),
        calculateTotalPages: jest.fn().mockImplementation((totalCount, limit) => Math.ceil(totalCount / limit)),
      },
    },

    // CacheService - 使用真实服务但注入Mock依赖
    CacheService,
  ],
  exports: [
    'default_IORedisModuleConnectionToken',
    Redis, // 导出Redis模拟，以支持@InjectRedis()装饰器
    EventEmitter2,
    'cacheUnified',
    PaginationService,
    CacheService,
  ],
})
export class TestCacheModule {}