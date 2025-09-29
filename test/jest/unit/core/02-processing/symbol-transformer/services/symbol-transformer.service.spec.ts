import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { SymbolMapperCacheStandardizedService } from '@core/05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { MappingDirection } from '@core/shared/constants/cache.constants';
import { BatchMappingResult } from '@core/05-caching/module/symbol-mapper-cache/interfaces/cache-stats.interface';
import { createSimpleEventEmitterMock } from '@test/testbasic/mocks';

/**
 * 辅助函数：等待事件循环中的所有微任务和immediate任务执行完成
 */
const flushPromisesAndTimers = async () => {
  // 等待所有Promise微任务
  await new Promise(resolve => setImmediate(resolve));
  // 再等待一次确保所有setImmediate回调都执行完毕
  return new Promise(resolve => setImmediate(resolve));
};

describe('SymbolTransformerService', () => {
  let service: SymbolTransformerService;
  let symbolMapperCacheService: jest.Mocked<SymbolMapperCacheStandardizedService>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let marketInferenceService: jest.Mocked<MarketInferenceService>;

  beforeEach(async () => {
    const mockSymbolMapperCacheService = {
      mapSymbols: jest.fn(),
    };

    // 使用可复用的EventEmitter mock
    const mockEventBus = createSimpleEventEmitterMock();

    const mockMarketInferenceService = {
      inferMarketLabels: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolTransformerService,
        {
          provide: SymbolMapperCacheStandardizedService,
          useValue: mockSymbolMapperCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: MarketInferenceService,
          useValue: mockMarketInferenceService,
        },
      ],
    }).compile();

    service = module.get<SymbolTransformerService>(SymbolTransformerService);
    symbolMapperCacheService = module.get(SymbolMapperCacheStandardizedService);
    eventBus = module.get(EventEmitter2);
    marketInferenceService = module.get(MarketInferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('前导零转换测试', () => {
    it('应该将带前导零的港股代码转换为不带前导零 (00700.HK → 700.HK)', async () => {
      const mockMappingDetails = { '00700.HK': '700.HK' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 45.3,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['HK']);
      
      // 修改符号格式检测
      jest.spyOn(service as any, 'isStandardFormat').mockImplementation((symbol) => {
        if (symbol === '00700.HK') return false; // 需要转换
        return true;
      });

      const result = await service.transformSymbols('longport', ['00700.HK']);

      expect(result.mappedSymbols).toEqual(['700.HK']);
      expect(result.metadata.successCount).toBe(1);
      expect(result.metadata.failedCount).toBe(0);
      
      // 恢复原始方法
      (service as any).isStandardFormat.mockRestore();
    });

    it('应该将不带前导零的港股代码转换为带前导零 (700.HK → 00700.HK)', async () => {
      const mockMappingDetails = { '700.HK': '00700.HK' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.FROM_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 67.4,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['HK']);
      
      // 修改符号格式检测
      jest.spyOn(service as any, 'isStandardFormat').mockImplementation((symbol) => {
        if (symbol === '700.HK') return false; // 需要转换
        return true;
      });

      const result = await service.transformSymbols('longport', ['700.HK'], MappingDirection.FROM_STANDARD);

      expect(result.mappedSymbols).toEqual(['00700.HK']);
      expect(result.metadata.successCount).toBe(1);
      expect(result.metadata.failedCount).toBe(0);
      
      // 恢复原始方法
      (service as any).isStandardFormat.mockRestore();
    });

    it('应该能够通过transformSymbolsForProvider正确处理带前导零和不带前导零的混合情况', async () => {
      const mockMappingDetails = { '700.HK': '00700.HK' };
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: mockMappingDetails,
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 156.3,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      
      // 修改符号格式检测
      jest.spyOn(service as any, 'isStandardFormat').mockImplementation((symbol) => {
        if (symbol === '700.HK') return false; // 需要转换
        if (symbol === '00700.HK') return true; // 标准格式不需转换
        return true;
      });

      const result = await service.transformSymbolsForProvider('longport', ['700.HK', '00700.HK'], 'test-request-id');

      // 验证返回结果包含转换后的符号和标准格式符号
      expect(result.transformedSymbols).toContain('00700.HK');
      expect(result.transformedSymbols).toContain('00700.HK');
      
      // 恢复原始方法
      (service as any).isStandardFormat.mockRestore();
    });

    it('应该正确处理转换失败的情况', async () => {
      const mockCacheResult: BatchMappingResult = {
        success: true,
        mappingDetails: {}, // 空映射，表示转换失败
        failedSymbols: ['700.HK'], // 转换失败的符号
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 34.7,
      };

      symbolMapperCacheService.mapSymbols.mockResolvedValue(mockCacheResult);
      marketInferenceService.inferMarketLabels.mockReturnValue(['HK']);
      
      const result = await service.transformSymbols('longport', ['700.HK']);

      expect(result.mappedSymbols).toEqual([]);
      expect(result.failedSymbols).toEqual(['700.HK']);
      expect(result.metadata.successCount).toBe(0);
      expect(result.metadata.failedCount).toBe(1);
    });
  });
});