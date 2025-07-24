import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from '../../../../../src/core/query/query.controller';
import { QueryService } from '../../../../../src/core/query/query.service';
import { QueryStatisticsService } from '../../../../../src/core/query/services/query-statistics.service';
import { QueryType } from '../../../../../src/core/query/dto/query-types.dto';
import { DataClassification } from '../../../../../src/core/storage/enums/storage-type.enum';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../../../../../src/auth/guards/apikey-auth.guard';
import { UnifiedPermissionsGuard } from '../../../../../src/auth/guards/unified-permissions.guard';
import { RateLimitGuard } from '../../../../../src/auth/guards/rate-limit.guard';
import { CanActivate } from '@nestjs/common';

describe('QueryController', () => {
  let controller: QueryController;

  const mockQueryService = {
    executeQuery: jest.fn(),
    executeBulkQuery: jest.fn(),
    queryBySymbols: jest.fn(),
    queryByMarket: jest.fn(),
    queryByProvider: jest.fn(),
    getQueryStats: jest.fn(),
  };

  const mockStatisticsService = {
    getStatistics: jest.fn(),
    recordQuery: jest.fn(),
  };

  beforeEach(async () => {
    const mockGuard: CanActivate = { canActivate: jest.fn(() => true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [
        {
          provide: QueryService,
          useValue: mockQueryService,
        },
        {
          provide: QueryStatisticsService,
          useValue: mockStatisticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ApiKeyAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(UnifiedPermissionsGuard)
      .useValue(mockGuard)
      .overrideGuard(RateLimitGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<QueryController>(QueryController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('executeQuery', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should execute a basic query', async () => {
      const queryRequest = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK', 'AAPL'],
        dataTypeFilter: DataClassification.GENERAL,
      };

      const mockResults = {
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: {
          totalResults: 1,
          returnedResults: 1,
          executionTime: 10,
          cacheUsed: true,
          dataSources: {},
        },
        queryId: 'query-123',
      };

      mockQueryService.executeQuery.mockResolvedValue(mockResults);

      const result = await controller.executeQuery(queryRequest);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(mockQueryService.executeQuery).toHaveBeenCalledWith(queryRequest);
    });

    it('should handle query errors', async () => {
      const queryRequest = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['INVALID'],
        dataTypeFilter: DataClassification.GENERAL,
      };

      mockQueryService.executeQuery.mockRejectedValue(new Error('Query failed'));

      await expect(controller.executeQuery(queryRequest)).rejects.toThrow('Query failed');
    });
  });

  describe('executeBulkQuery', () => {
    it('should execute bulk queries', async () => {
      const bulkRequest = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ['700.HK'],
            dataTypeFilter: DataClassification.GENERAL,
          },
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ['AAPL'],
            dataTypeFilter: DataClassification.GENERAL,
          },
        ],
        summary: {
          totalQueries: 2,
        },
      };

      const mockResults = {
        results: [
          { data: [{ symbol: '700.HK', price: 100 }] },
          { data: [{ symbol: 'AAPL', price: 150 }] },
        ],
        summary: {
          totalQueries: 2,
          successful: 2,
          failed: 0,
          totalExecutionTime: 20,
          averageExecutionTime: 10,
        },
      };

      mockQueryService.executeBulkQuery.mockResolvedValue(mockResults);

      const result = await controller.executeBulkQuery(bulkRequest as any);

      expect(result).toBeDefined();
      expect(mockQueryService.executeBulkQuery).toHaveBeenCalledWith(bulkRequest);
    });
  });

  describe('queryBySymbols', () => {
    it('should query data by symbols', async () => {
      const symbols = ['700.HK', 'AAPL'];
      const dataType = 'stock-quote';

      const mockResults = {
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: { totalResults: 1, returnedResults: 1, executionTime: 10, cacheUsed: true, dataSources: {} },
      };

      mockQueryService.executeQuery.mockResolvedValue(mockResults);

      const result = await controller.queryBySymbols(symbols.join(','), undefined, undefined, dataType);

      expect(result).toBeDefined();
      const expectedRequest = expect.objectContaining({
        queryType: QueryType.BY_SYMBOLS,
        symbols: symbols,
        dataTypeFilter: dataType,
      });
      expect(mockQueryService.executeQuery).toHaveBeenCalledWith(expectedRequest);
    });
  });

  describe('queryByMarket', () => {
    it('should query data by market', async () => {
      const market = 'HK';
      const dataType = 'stock-quote';

      const mockResults = {
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: { totalResults: 1, returnedResults: 1, executionTime: 10, cacheUsed: true, dataSources: {} },
      };

      mockQueryService.executeQuery.mockResolvedValue(mockResults);

      const result = await controller.queryByMarket(market, undefined, dataType);

      expect(result).toBeDefined();
      const expectedRequest = expect.objectContaining({
        queryType: QueryType.BY_MARKET,
        market: market,
        dataTypeFilter: dataType,
      });
      expect(mockQueryService.executeQuery).toHaveBeenCalledWith(expectedRequest);
    });
  });

  describe('queryByProvider', () => {
    it('should query data by provider', async () => {
      const provider = 'longport';
      const dataType = 'stock-quote';

      const mockResults = {
        data: [{ symbol: '700.HK', price: 100 }],
        metadata: { totalResults: 1, returnedResults: 1, executionTime: 10, cacheUsed: true, dataSources: {} },
      };

      mockQueryService.executeQuery.mockResolvedValue(mockResults);

      const result = await controller.queryByProvider(provider, undefined, dataType);

      expect(result).toBeDefined();
      const expectedRequest = expect.objectContaining({
        queryType: QueryType.BY_PROVIDER,
        provider: provider,
        dataTypeFilter: dataType,
      });
      expect(mockQueryService.executeQuery).toHaveBeenCalledWith(expectedRequest);
    });
  });

  describe('getQueryStats', () => {
    it('should get query statistics', async () => {
      const mockStats = {
        performance: {
          totalQueries: 100,
          averageResponseTime: 250,
          errorRate: 0.05,
        },
        queryTypes: {},
      };

      mockQueryService.getQueryStats.mockResolvedValue(mockStats);

      const result = await controller.getQueryStats();

      expect(result).toBeDefined();
      expect(result.performance.totalQueries).toBe(100);
      expect(mockQueryService.getQueryStats).toHaveBeenCalled();
    });

    it('should handle statistics errors', async () => {
      mockQueryService.getQueryStats.mockRejectedValue(new Error('Stats failed'));

      await expect(controller.getQueryStats()).rejects.toThrow('Stats failed');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockHealthResult = {
        data: [],
        metadata: { totalResults: 0, returnedResults: 0, executionTime: 5, cacheUsed: false, dataSources: {} },
      };
      mockQueryService.executeQuery.mockResolvedValue(mockHealthResult);
      const result = await controller.healthCheck();

      expect(result).toBeDefined();
      expect(result.queryService.available).toBe(true);
      expect(result.overallHealth.healthy).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle service unavailability', async () => {
      const queryRequest = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['700.HK'],
        dataTypeFilter: DataClassification.GENERAL,
      };

      mockQueryService.executeQuery.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.executeQuery(queryRequest)).rejects.toThrow('Service unavailable');
    });
  });
});