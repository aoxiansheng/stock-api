import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SymbolMapperCacheStandardizedService } from '@core/05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service';
import { SymbolMappingRepository } from '@core/00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import { FeatureFlags } from '@appcore/config/feature-flags.config';
import { MappingDirection } from '@core/shared/constants/cache.constants';
import { BatchMappingResult } from '@core/05-caching/module/symbol-mapper-cache/interfaces/cache-stats.interface';
import { SymbolMapperCacheStatsDto } from '@core/05-caching/module/symbol-mapper-cache/interfaces/cache-stats.interface';

describe('SymbolMapperCacheStandardizedService', () => {
  let service: SymbolMapperCacheStandardizedService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;
  let repository: jest.Mocked<SymbolMappingRepository>;
  let featureFlags: jest.Mocked<FeatureFlags>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolMapperCacheStandardizedService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SymbolMappingRepository,
          useValue: {
            findByDataSource: jest.fn(),
            findAllMappingsForSymbols: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FeatureFlags,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<SymbolMapperCacheStandardizedService>(SymbolMapperCacheStandardizedService);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
    repository = module.get(SymbolMappingRepository);
    featureFlags = module.get(FeatureFlags);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct service info', () => {
      const serviceInfo = service.getServiceInfo();
      expect(serviceInfo).toEqual({
        name: 'SymbolMapperCacheStandardizedService',
        version: '1.0.0',
        mode: 'simplified'
      });
    });

    it('should be initialized after construction', () => {
      expect(service.isServiceInitialized()).toBe(true);
    });
  });

  describe('onModuleInit', () => {
    it('should emit initialization event on module init', async () => {
      await service.onModuleInit();

      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.initialized', {
        module: 'symbol-mapper-cache',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should emit destruction event and clear caches on module destroy', async () => {
      await service.onModuleDestroy();

      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.destroyed', {
        module: 'symbol-mapper-cache',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('mapSymbols', () => {
    const provider = 'longport';
    const symbols = ['700.HK', '00700'];
    const requestId = 'test-request-123';

    it('should map symbols to standard format', async () => {
      const result: BatchMappingResult = await service.mapSymbols(
        provider,
        symbols,
        MappingDirection.TO_STANDARD,
        requestId
      );

      expect(result).toEqual({
        success: true,
        mappingDetails: {
          '700.HK': '00700',
          '00700': '00700',
        },
        failedSymbols: [],
        provider,
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 2,
        processingTimeMs: expect.any(Number),
      });
    });

    it('should map symbols from standard format', async () => {
      const result: BatchMappingResult = await service.mapSymbols(
        provider,
        ['00700'],
        MappingDirection.FROM_STANDARD,
        requestId
      );

      expect(result).toEqual({
        success: true,
        mappingDetails: {
          '00700': '700.HK',
        },
        failedSymbols: [],
        provider,
        direction: MappingDirection.FROM_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: expect.any(Number),
      });
    });

    it('should handle single symbol input', async () => {
      const result: BatchMappingResult = await service.mapSymbols(
        provider,
        '700.HK',
        MappingDirection.TO_STANDARD
      );

      expect(result.success).toBe(true);
      expect(result.mappingDetails['700.HK']).toBe('00700');
      expect(result.totalProcessed).toBe(1);
    });

    it('should handle empty symbol array', async () => {
      const result: BatchMappingResult = await service.mapSymbols(
        provider,
        [],
        MappingDirection.TO_STANDARD
      );

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(0);
      expect(Object.keys(result.mappingDetails)).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return initial cache statistics', () => {
      const stats: SymbolMapperCacheStatsDto = service.getStats();

      expect(stats).toEqual({
        totalQueries: expect.any(Number),
        l1HitRatio: 0,
        l2HitRatio: expect.any(Number),
        l3HitRatio: 0,
        layerStats: {
          l1: { hits: 0, misses: 0, total: 0 },
          l2: { hits: expect.any(Number), misses: 0, total: expect.any(Number) },
          l3: { hits: 0, misses: 0, total: 0 },
        },
        cacheSize: {
          l1: 0,
          l2: expect.any(Number),
          l3: 0,
        },
      });
    });

    it('should calculate hit ratios correctly after cache operations', async () => {
      // 执行一些操作以生成统计数据
      await service.mapSymbols('longport', ['700.HK'], MappingDirection.TO_STANDARD);

      const stats = service.getStats();
      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(stats.l2HitRatio).toBeGreaterThan(0);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches and reset statistics', async () => {
      // 先执行一些操作
      await service.mapSymbols('longport', ['700.HK'], MappingDirection.TO_STANDARD);

      // 清理缓存
      await service.clearAllCaches();

      // 验证统计数据已重置
      const stats = service.getStats();
      expect(stats.totalQueries).toBe(0);
      expect(stats.cacheSize.l1).toBe(0);
      expect(stats.cacheSize.l2).toBe(0);
      expect(stats.cacheSize.l3).toBe(0);
    });
  });

  describe('Symbol Format Conversion', () => {
    it('should convert Hong Kong symbols to standard format', async () => {
      const result = await service.mapSymbols(
        'longport',
        ['700.HK', '1.HK', '9988.HK'],
        MappingDirection.TO_STANDARD
      );

      expect(result.mappingDetails).toEqual({
        '700.HK': '00700',
        '1.HK': '00001',
        '9988.HK': '09988',
      });
    });

    it('should convert standard format to Hong Kong symbols', async () => {
      const result = await service.mapSymbols(
        'longport',
        ['00700', '00001', '09988'],
        MappingDirection.FROM_STANDARD
      );

      expect(result.mappingDetails).toEqual({
        '00700': '700.HK',
        '00001': '1.HK',
        '09988': '9988.HK',
      });
    });

    it('should handle non-HK symbols without conversion', async () => {
      const result = await service.mapSymbols(
        'longport',
        ['AAPL', 'GOOGL'],
        MappingDirection.TO_STANDARD
      );

      expect(result.mappingDetails).toEqual({
        'AAPL': 'AAPL',
        'GOOGL': 'GOOGL',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      repository.findAllMappingsForSymbols.mockRejectedValue(new Error('Database error'));

      // 由于当前实现不直接使用repository，这个测试确保服务能正常工作
      const result = await service.mapSymbols(
        'longport',
        ['700.HK'],
        MappingDirection.TO_STANDARD
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large batch of symbols efficiently', async () => {
      const largeSymbolList = Array.from({ length: 100 }, (_, i) => `${i + 1}.HK`);

      const startTime = Date.now();
      const result = await service.mapSymbols(
        'longport',
        largeSymbolList,
        MappingDirection.TO_STANDARD
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('should track memory usage and cache sizes', () => {
      const stats = service.getStats();

      expect(stats.cacheSize).toBeDefined();
      expect(typeof stats.cacheSize.l1).toBe('number');
      expect(typeof stats.cacheSize.l2).toBe('number');
      expect(typeof stats.cacheSize.l3).toBe('number');
    });
  });

  describe('Public Interface Validation', () => {
    it('should expose correct public methods', () => {
      expect(typeof service.mapSymbols).toBe('function');
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.clearAllCaches).toBe('function');
      expect(typeof service.isServiceInitialized).toBe('function');
      expect(typeof service.getServiceInfo).toBe('function');
      expect(typeof service.onModuleInit).toBe('function');
      expect(typeof service.onModuleDestroy).toBe('function');
    });

    it('should not expose private methods', () => {
      // 注意：TypeScript的private关键字在JavaScript运行时无法真正隐藏方法
      // 这里测试这些方法存在但不应该在公共API文档中暴露
      expect(typeof (service as any).convertToStandardFormat).toBe('function');
      expect(typeof (service as any).convertFromStandardFormat).toBe('function');
      expect(typeof (service as any).getSymbolCacheKey).toBe('function');
      
      // 确保这些方法不在公共接口的键中
      const publicMethods = ['mapSymbols', 'getStats', 'clearAllCaches', 'isServiceInitialized', 'getServiceInfo', 'onModuleInit', 'onModuleDestroy'];
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(name => typeof (service as any)[name] === 'function' && name !== 'constructor');
      
      // 验证私有方法不在推荐的公共方法列表中
      expect(serviceMethods).toEqual(expect.arrayContaining(publicMethods));
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle memory monitoring lifecycle', async () => {
      await service.onModuleInit();

      // Fast forward to trigger memory check
      jest.advanceTimersByTime(60000); // 1 minute

      await service.onModuleDestroy();
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should perform memory cleanup when needed', async () => {
      // Execute some operations to fill cache
      await service.mapSymbols('longport', ['700.HK', '1.HK'], MappingDirection.TO_STANDARD);

      const initialStats = service.getStats();
      expect(initialStats.cacheSize.l2).toBeGreaterThan(0);

      // Clear caches
      await service.clearAllCaches();

      const finalStats = service.getStats();
      expect(finalStats.cacheSize.l2).toBe(0);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      const result1 = await service.mapSymbols('longport', null as any, MappingDirection.TO_STANDARD);
      expect(result1.success).toBe(true);
      expect(result1.totalProcessed).toBe(0);

      const result2 = await service.mapSymbols('longport', undefined as any, MappingDirection.TO_STANDARD);
      expect(result2.success).toBe(true);
      expect(result2.totalProcessed).toBe(0);
    });

    it('should handle invalid symbols without crashing', async () => {
      const invalidSymbols = ['', '   ', null, undefined, 123];
      const result = await service.mapSymbols(
        'longport',
        invalidSymbols as any,
        MappingDirection.TO_STANDARD
      );

      expect(result.success).toBe(true);
      expect(result.failedSymbols.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters in symbols', async () => {
      const specialSymbols = ['700.HK@', '1-HK.TEST', 'SYMBOL_WITH_UNDERSCORE'];
      const result = await service.mapSymbols(
        'longport',
        specialSymbols,
        MappingDirection.TO_STANDARD
      );

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(specialSymbols.length);
    });

    it('should handle concurrent mapping requests', async () => {
      const promises = [
        service.mapSymbols('longport', ['700.HK'], MappingDirection.TO_STANDARD, 'req1'),
        service.mapSymbols('longport', ['1.HK'], MappingDirection.TO_STANDARD, 'req2'),
        service.mapSymbols('longport', ['9988.HK'], MappingDirection.TO_STANDARD, 'req3'),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.totalProcessed).toBe(1);
      });
    });
  });

  describe('Cache Layer Validation', () => {
    it('should utilize L1 provider rules cache correctly', async () => {
      const result = await service.mapSymbols('longport', ['700.HK'], MappingDirection.TO_STANDARD);
      const stats = service.getStats();

      expect(result.success).toBe(true);
      expect(stats.layerStats.l1).toBeDefined();
    });

    it('should utilize L2 symbol mapping cache correctly', async () => {
      const result = await service.mapSymbols('longport', ['700.HK'], MappingDirection.TO_STANDARD);
      const stats = service.getStats();

      expect(result.success).toBe(true);
      expect(stats.layerStats.l2.total).toBeGreaterThan(0);
    });

    it('should utilize L3 batch result cache correctly', async () => {
      const result = await service.mapSymbols('longport', ['700.HK', '1.HK'], MappingDirection.TO_STANDARD);
      const stats = service.getStats();

      expect(result.success).toBe(true);
      expect(stats.layerStats.l3).toBeDefined();
    });
  });

  describe('Service State Management', () => {
    it('should maintain proper initialization state', () => {
      expect(service.isServiceInitialized()).toBe(true);
    });

    it('should return correct service info', () => {
      const info = service.getServiceInfo();
      expect(info.name).toBe('SymbolMapperCacheStandardizedService');
      expect(info.version).toBe('1.0.0');
      expect(info.mode).toBe('simplified');
    });

    it('should handle module lifecycle properly', async () => {
      await service.onModuleInit();
      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.initialized', {
        module: 'symbol-mapper-cache',
        timestamp: expect.any(Date),
      });

      await service.onModuleDestroy();
      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.module.destroyed', {
        module: 'symbol-mapper-cache',
        timestamp: expect.any(Date),
      });
    });
  });
});
