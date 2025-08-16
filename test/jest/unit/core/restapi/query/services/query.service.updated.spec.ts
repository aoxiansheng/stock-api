import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '../../../../../../../src/core/restapi/query/services/query.service';
import { StorageService } from '../../../../../../../src/core/public/storage/services/storage.service';
import { ReceiverService } from '../../../../../../../src/core/restapi/receiver/services/receiver.service';
import { DataChangeDetectorService } from '../../../../../../../src/core/public/shared/services/data-change-detector.service';
import { MarketStatusService } from '../../../../../../../src/core/public/shared/services/market-status.service';
import { FieldMappingService } from '../../../../../../../src/core/public/shared/services/field-mapping.service';
import { QueryStatisticsService } from '../../../../../../../src/core/restapi/query/services/query-statistics.service';
import { QueryResultProcessorService } from '../../../../../../../src/core/restapi/query/services/query-result-processor.service';
import { BackgroundTaskService } from '../../../../../../../src/core/public/shared/services/background-task.service';
import { PaginationService } from '../../../../../../../src/common/modules/pagination/services/pagination.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { SmartCacheOrchestrator } from '../../../../../../../src/core/public/smart-cache/services/smart-cache-orchestrator.service';
import { Market } from '../../../../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../../../../src/common/constants/market-trading-hours.constants';
import { QueryRequestDto } from '../../../../../../../src/core/restapi/query/dto/query-request.dto';
import { QueryType } from '../../../../../../../src/core/restapi/query/dto/query-types.dto';
import { CacheStrategy } from '@core/public/smart-cache/interfaces/cache-orchestrator.interface';

// Mock外部工具函数
jest.mock('../../../../../../../src/core/public/smart-cache/utils/cache-request.utils', () => ({
  buildCacheOrchestratorRequest: jest.fn(),
  inferMarketFromSymbol: jest.fn(),
}));

jest.mock('../../../../../../../src/core/restapi/query/utils/query.util', () => ({
  buildStorageKey: jest.fn(),
  validateDataFreshness: jest.fn(),
}));

describe('QueryService - 重构后核心功能', () => {
  let service: QueryService;
  let smartCacheOrchestrator: jest.Mocked<SmartCacheOrchestrator>;

  const mockQueryRequest: QueryRequestDto = {
    queryType: QueryType.BY_SYMBOLS,
    symbols: ['AAPL', 'MSFT'],
    queryTypeFilter: 'get-stock-quote',
    provider: 'longport',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: StorageService,
          useValue: {
            retrieveData: jest.fn(),
            storeData: jest.fn(),
          },
        },
        {
          provide: ReceiverService,
          useValue: {
            handleRequest: jest.fn(),
          },
        },
        {
          provide: DataChangeDetectorService,
          useValue: {
            detectChanges: jest.fn(),
          },
        },
        {
          provide: MarketStatusService,
          useValue: {
            getBatchMarketStatus: jest.fn().mockResolvedValue({
              [Market.US]: { status: MarketStatus.TRADING },
            }),
          },
        },
        {
          provide: FieldMappingService,
          useValue: {
            getFieldMappings: jest.fn(),
          },
        },
        {
          provide: QueryStatisticsService,
          useValue: {
            recordQuery: jest.fn(),
          },
        },
        {
          provide: QueryResultProcessorService,
          useValue: {
            processResults: jest.fn(),
          },
        },
        {
          provide: BackgroundTaskService,
          useValue: {
            scheduleTask: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn(),
          },
        },
        {
          provide: MetricsRegistryService,
          useValue: {
            queryReceiverCallsTotal: { inc: jest.fn() },
            queryReceiverCallDuration: { observe: jest.fn() },
            queryExecutionCounter: { inc: jest.fn() },
            queryExecutionDuration: { observe: jest.fn() },
            querySourceStatsCounter: { inc: jest.fn() },
            queryErrorsCounter: { inc: jest.fn() },
          },
        },
        {
          provide: SmartCacheOrchestrator,
          useValue: {
            batchGetDataWithSmartCache: jest.fn(),
            getDataWithSmartCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    smartCacheOrchestrator = module.get(SmartCacheOrchestrator);

    // 设置工具函数mocks
    const utils = jest.createMockFromModule('../../../../../../../src/core/public/smart-cache/utils/cache-request.utils') as any;
    utils.inferMarketFromSymbol.mockImplementation((symbol) => {
      if (symbol.includes('.HK')) return Market.HK;
      return Market.US;
    });
  });

  describe('Service Initialization', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
    });

    it('应该注入SmartCacheOrchestrator', () => {
      expect(smartCacheOrchestrator).toBeDefined();
    });
  });

  describe('executeQuery - 主要查询入口', () => {
    it('应该处理BY_SYMBOLS查询类型', async () => {
      // Arrange
      const mockResults = [
        { data: { symbol: 'AAPL', lastPrice: 150 }, source: 'cache' },
        { data: { symbol: 'MSFT', lastPrice: 300 }, source: 'realtime' },
      ];

      // Mock私有方法
      jest.spyOn(service as any, 'executeBatchedPipeline').mockResolvedValue({
        results: mockResults,
        dataSourceStats: { cache: 1, realtime: 1, errors: 0 },
        errors: [],
        executionTime: 100,
      });

      // Act
      const result = await service.executeQuery(mockQueryRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect((service as any).executeBatchedPipeline).toHaveBeenCalledWith(
        mockQueryRequest,
        expect.any(String)
      );
    });

    it('应该拒绝不支持的查询类型', async () => {
      // Arrange
      const invalidRequest = {
        ...mockQueryRequest,
        queryType: 'INVALID_TYPE' as any,
      };

      // Act & Assert
      await expect(service.executeQuery(invalidRequest)).rejects.toThrow();
    });
  });

  describe('重构验证 - 老方法已移除', () => {
    it('tryGetFromCache方法应该已被移除', () => {
      // 验证私有方法不存在
      expect((service as any).tryGetFromCache).toBeUndefined();
    });

    it('fetchFromRealtime方法应该已被移除', () => {
      // 验证私有方法不存在
      expect((service as any).fetchFromRealtime).toBeUndefined();
    });

    it('fetchSymbolData方法应该已被移除', () => {
      // 验证私有方法不存在
      expect((service as any).fetchSymbolData).toBeUndefined();
    });

    it('executeOriginalDataFlow方法应该已被移除', () => {
      // 验证私有方法不存在
      expect((service as any).executeOriginalDataFlow).toBeUndefined();
    });
  });

  describe('新增方法验证', () => {
    it('executeQueryToReceiverFlow方法应该存在', () => {
      // 验证新的私有方法存在
      expect((service as any).executeQueryToReceiverFlow).toBeDefined();
    });

    it('getMarketStatusForSymbol方法应该存在', () => {
      // 验证新的私有方法存在
      expect((service as any).getMarketStatusForSymbol).toBeDefined();
    });
  });

  describe('架构一致性验证', () => {
    it('processReceiverBatch应该使用SmartCacheOrchestrator', async () => {
      // Arrange
      smartCacheOrchestrator.batchGetDataWithSmartCache.mockResolvedValue([
        { hit: true, data: { symbol: 'AAPL' }, error: null, strategy: CacheStrategy.WEAK_TIMELINESS, storageKey: 'test-storage-key' },
      ]);

      jest.spyOn(service as any, 'getMarketStatusForSymbol').mockResolvedValue({});
      jest.spyOn(service as any, 'getBatchSizeRange').mockReturnValue('1-10');
      jest.spyOn(service as any, 'getSymbolsCountRange').mockReturnValue('1-5');

      // Act
      await (service as any).processReceiverBatch(
        Market.US,
        ['AAPL'],
        mockQueryRequest,
        'test-query-id',
        0,
        0
      );

      // Assert
      expect(smartCacheOrchestrator.batchGetDataWithSmartCache).toHaveBeenCalled();
    });
  });
});