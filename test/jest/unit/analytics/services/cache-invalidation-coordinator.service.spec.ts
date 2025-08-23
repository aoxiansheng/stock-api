  import { Test, TestingModule } from '@nestjs/testing';
  import { EventEmitter2 } from '@nestjs/event-emitter';
  import { CacheInvalidationCoordinatorService } from '../../../../../src/monitoring/analyzer/services/cache-invalidation-coordinator.service';
import { AnalyticsCacheService } from '../../../../../src/monitoring/analyzer/services/analyzer-cache.service';
import { ANALYTICS_EVENTS } from '../../../../../src/monitoring/analyzer/constants';

describe('CacheInvalidationCoordinatorService', () => {
  let service: CacheInvalidationCoordinatorService;
  let cacheService: jest.Mocked<AnalyticsCacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockCacheService = {
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationCoordinatorService,
        {
          provide: AnalyticsCacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CacheInvalidationCoordinatorService>(CacheInvalidationCoordinatorService);
    cacheService = module.get(AnalyticsCacheService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should setup global cache invalidation listeners', async () => {
      await service.onModuleInit();

      // 验证事件监听器已注册
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.SYSTEM_RESTART_DETECTED,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.DATA_SOURCE_CHANGED,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.CONFIGURATION_UPDATED,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.CRITICAL_ERROR_DETECTED,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.MONITORING_DATA_STALE,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.REDIS_CONNECTION_LOST,
        expect.any(Function)
      );
      expect(eventEmitter.on).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.DATABASE_CONNECTION_LOST,
        expect.any(Function)
      );
    });
  });

  describe('triggerManualInvalidation', () => {
    it('should manually invalidate cache with specified pattern', async () => {
      const pattern = 'test_pattern';
      const reason = 'manual_test';

      await service.triggerManualInvalidation(pattern, reason);

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(pattern);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.CACHE_INVALIDATED,
        {
          pattern,
          timestamp: expect.any(String),
          reason: `manual_${reason}`,
          service: 'CacheInvalidationCoordinatorService'
        }
      );
    });
  });

  describe('getCacheInvalidationStats', () => {
    it('should return cache invalidation statistics', () => {
      const stats = service.getCacheInvalidationStats();

      expect(stats).toEqual({
        listenersActive: true,
        supportedEvents: Object.values(ANALYTICS_EVENTS),
        lastInvalidation: expect.any(String),
      });
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle system restart event', async () => {
      // 获取注册的事件处理器
      const systemRestartHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.SYSTEM_RESTART_DETECTED
      )?.[1];

      if (systemRestartHandler) {
        await systemRestartHandler({ reason: 'test_restart' });

        // 验证所有缓存模式都被失效
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:performance');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:health');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:trends');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:optimization');
      }
    });

    it('should handle data source change event', async () => {
      const dataSourceHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.DATA_SOURCE_CHANGED
      )?.[1];

      if (dataSourceHandler) {
        await dataSourceHandler({ dataSource: 'test_source' });

        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:performance*');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:health*');
      }
    });

    it('should handle configuration update event', async () => {
      const configHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.CONFIGURATION_UPDATED
      )?.[1];

      if (configHandler) {
        await configHandler({ configType: 'test_config' });

        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:optimization*');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:trends*');
      }
    });

    it('should handle critical error event', async () => {
      const criticalErrorHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.CRITICAL_ERROR_DETECTED
      )?.[1];

      if (criticalErrorHandler) {
        await criticalErrorHandler({ error: 'test_critical_error' });

        // 验证全量失效
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:performance');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:health');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:trends');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:optimization');
      }
    });

    it('should handle monitoring data stale event', async () => {
      const monitoringStaleHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.MONITORING_DATA_STALE
      )?.[1];

      if (monitoringStaleHandler) {
        await monitoringStaleHandler({ reason: 'data_stale' });

        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:performance*');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:health*');
      }
    });

    it('should handle redis connection lost event', async () => {
      const redisLostHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.REDIS_CONNECTION_LOST
      )?.[1];

      if (redisLostHandler) {
        await redisLostHandler({ connection: 'redis_main' });

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          ANALYTICS_EVENTS.CACHE_INVALIDATED,
          {
            pattern: 'redis:connection_lost',
            timestamp: expect.any(String),
            service: 'CacheInvalidationCoordinatorService',
            critical: true
          }
        );
      }
    });

    it('should handle database connection lost event', async () => {
      const dbLostHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === ANALYTICS_EVENTS.DATABASE_CONNECTION_LOST
      )?.[1];

      if (dbLostHandler) {
        await dbLostHandler({ connection: 'mongodb_main' });

        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:performance*');
        expect(cacheService.invalidatePattern).toHaveBeenCalledWith('analytics:health*');
      }
    });
  });

  describe('error handling', () => {
    it('should handle cache invalidation errors gracefully', async () => {
      cacheService.invalidatePattern.mockRejectedValueOnce(new Error('Cache error'));

      await expect(service.triggerManualInvalidation('test', 'test')).resolves.not.toThrow();
    });
  });
});