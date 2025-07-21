import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryService } from '../../../../src/core/query/query.service';
import { QueryStatisticsService } from '../../../../src/core/query/services/query-statistics.service';
import { QueryResultProcessorService } from '../../../../src/core/query/services/query-result-processor.service';
import { StorageService } from '../../../../src/core/storage/storage.service';
import { QueryType } from '../../../../src/core/query/dto/query-types.dto';
import { DataFetchingService } from '../../../../src/core/shared/services/data-fetching.service';
import { DataChangeDetectorService } from '../../../../src/core/shared/services/data-change-detector.service';
import { MarketStatusService } from '../../../../src/core/shared/services/market-status.service';
import { Market } from '../../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../../src/common/constants/market-trading-hours.constants';
import {
  QueryRequestDto,
  SortDirection,
} from "../../../../src/core/query/dto/query-request.dto";
import { QueryResponseDto, QueryMetadataDto } from "../../../../src/core/query/dto/query-response.dto";
import { StorageResponseDto, StorageMetadataDto } from "../../../../src/core/storage/dto/storage-response.dto";
import { StorageType, DataClassification } from "../../../../src/core/storage/dto/storage-request.dto";
import { DataResponseDto } from '../../../../src/core/receiver/dto/data-response.dto';

describe('QueryService', () => {
  let service: QueryService;
  let storageService: jest.Mocked<StorageService>;
  let dataFetchingService: jest.Mocked<DataFetchingService>;
  let dataChangeDetector: jest.Mocked<DataChangeDetectorService>;
  let marketStatusService: jest.Mocked<MarketStatusService>;
  let queryResultProcessorService: jest.Mocked<QueryResultProcessorService>;


  const mockStockData = {
    "US:longport:get-stock-quote:AAPL": {
      symbol: "AAPL",
      price: 150.75,
      provider: "longport",
      market: "US",
    },
    "US:longport:get-stock-quote:GOOGL": {
      symbol: "GOOGL",
      price: 2500.25,
      provider: "longport",
      market: "US",
    },
    "HK:longport:get-stock-quote:700.HK": {
      symbol: "700.HK",
      price: 500.0,
      provider: "longport",
      market: "HK",
    },
  };

  // Helper function to create proper StorageResponseDto mock
  const createStorageSuccessResponse = (data: any, source: "cache" | "persistent" = "cache") => {
    const metadata = new StorageMetadataDto(
      `${data.market}:${data.provider}:get-stock-quote:${data.symbol}`,
      StorageType.CACHE,
      DataClassification.STOCK_QUOTE,
      data.provider,
      data.market,
      JSON.stringify(data).length,
      10, // processingTime
      false, // compressed
      {}, // tags
      new Date(Date.now() + 3600000).toISOString() // expiresAt
    );
    
    const cacheInfo = {
      hit: true,
      source,
      ttlRemaining: 3600,
    };
    
    return new StorageResponseDto(data, metadata, cacheInfo);
  };

  beforeEach(async () => {
    const mockStorageService = {
      retrieveData: jest.fn().mockImplementation((request: { key: string }) => {
        const data = mockStockData[request.key];
        if (data) {
          return Promise.resolve(createStorageSuccessResponse(data));
        }
        return Promise.resolve(
          new StorageResponseDto(
            null,
            new StorageMetadataDto(
              request.key,
              StorageType.CACHE,
              DataClassification.STOCK_QUOTE,
              "longport",
              "US",
              0,
              10,
            ),
          ),
        );
      }),
      storeData: jest.fn(),
      deleteData: jest.fn(),
      getStorageStats: jest.fn(),
      buildStorageKey: jest
        .fn()
        .mockImplementation(
          (symbol, provider, category, market) =>
            `${market || '*'}:${provider || '*'}:${category || '*'}:${symbol}`,
        ),
    };

    const mockDataFetchingService = {
      fetchSingleData: jest.fn(),
      fetchBatchData: jest.fn(),
    };

    const mockDataChangeDetectorService = {
      needsUpdate: jest.fn().mockResolvedValue(false),
      checkIfDataNeedsUpdate: jest.fn().mockResolvedValue(false),
    };

    const mockMarketStatusService = {
      getMarketStatus: jest.fn().mockResolvedValue({ status: 'OPEN' }),
      getMarketStatuses: jest.fn().mockResolvedValue({}),
      getRecommendedCacheTTL: jest.fn().mockReturnValue(60),
    };

    const mockQueryResultProcessorService = {
      process: jest.fn().mockImplementation((executionResult, request, queryId, executionTime) => {
        const metadata = new QueryMetadataDto(
          request.queryType,
          executionResult.results.length,
          executionResult.results.length,
          executionTime,
          executionResult.cacheUsed,
          executionResult.dataSources
        );
        // Manually add errors if they exist in the execution result for test validation
        if (executionResult.errors && executionResult.errors.length > 0) {
          (metadata as any).errors = executionResult.errors;
        }
        return new QueryResponseDto(
          executionResult.results,
          metadata
        );
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: DataFetchingService, useValue: mockDataFetchingService },
        { provide: DataChangeDetectorService, useValue: mockDataChangeDetectorService },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: QueryResultProcessorService, useValue: mockQueryResultProcessorService },
        QueryStatisticsService,
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    storageService = module.get(StorageService);
    dataFetchingService = module.get(DataFetchingService);
    dataChangeDetector = module.get(DataChangeDetectorService);
    marketStatusService = module.get(MarketStatusService);
    queryResultProcessorService = module.get(QueryResultProcessorService);
    service.onModuleInit();
  });

  describe('executeQuery', () => {
    it('should execute BY_SYMBOLS query successfully from cache', async () => {
      const queryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL", "GOOGL"],
        dataTypeFilter: "get-stock-quote",
        provider: "longport",
        market: "US", // Simulate standardized request after Symbol Mapper
        useCache: true,
      };

      storageService.retrieveData
        .mockResolvedValueOnce(
          createStorageSuccessResponse(mockStockData["US:longport:get-stock-quote:AAPL"], "cache"),
        )
        .mockResolvedValueOnce(
          createStorageSuccessResponse(mockStockData["US:longport:get-stock-quote:GOOGL"], "cache"),
        );

      const result = await service.executeQuery(queryDto);

      expect(result.data).toHaveLength(2);
      expect((result.data[0] as any).symbol).toBe("AAPL");
      expect(result.metadata.totalResults).toBe(2);
      expect(result.metadata.cacheUsed).toBe(true);
      expect(result.metadata.dataSources.cache.hits).toBe(2);
    });

    it('should handle partial cache hit and fetch remaining from realtime', async () => {
      const queryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL", "MSFT"],
        dataTypeFilter: "get-stock-quote",
        provider: "longport",
        market: "US", // Simulate standardized request after Symbol Mapper
        useCache: true,
      };

      // First call - cache hit for AAPL
      storageService.retrieveData
        .mockResolvedValueOnce(
          createStorageSuccessResponse(mockStockData["US:longport:get-stock-quote:AAPL"], "cache"),
        )
        .mockResolvedValueOnce( // Second call for MSFT - cache miss
          new StorageResponseDto(null, new StorageMetadataDto(
            "US:longport:get-stock-quote:MSFT",
            StorageType.CACHE,
            DataClassification.STOCK_QUOTE,
            "longport",
            "US",
            0,
            10
          ))
        );
      
      dataFetchingService.fetchSingleData.mockResolvedValue({
        data: { symbol: 'MSFT', price: 300 },
        metadata: {
          source: 'PROVIDER',
          timestamp: new Date(),
          market: Market.US,
          marketStatus: MarketStatus.TRADING,
          cacheTTL: 60,
          provider: 'longport'
        }
      });

      const result = await service.executeQuery(queryDto);

      expect(result.data).toHaveLength(2);
      expect(storageService.retrieveData).toHaveBeenCalledTimes(3);
      expect(dataFetchingService.fetchSingleData).toHaveBeenCalledTimes(1);
      expect(result.metadata.cacheUsed).toBe(true);
      expect(result.metadata.dataSources.cache.hits).toBe(1);
      expect(result.metadata.dataSources.realtime.hits).toBe(1);
    });

    it('should handle validation errors gracefully at service level', async () => {
      const invalidQueryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [], // Invalid: empty symbols
        dataTypeFilter: "get-stock-quote",
      };
      const result = await service.executeQuery(invalidQueryDto);
      expect(result.data).toEqual([]);
      expect((result.metadata as any).errors[0].reason).toContain('symbols字段是必需的');
    });

    it('should return error info on storage failure', async () => {
      const queryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        dataTypeFilter: "get-stock-quote",
        provider: "longport",
        market: "US",
        useCache: true,
      };

      // Mock storageService.retrieveData to reject (cache failure)
      storageService.retrieveData.mockRejectedValue(new Error('Cache unavailable'));
      
      // Mock dataFetchingService.fetchSingleData to also fail (realtime failure)
      dataFetchingService.fetchSingleData.mockRejectedValue(new Error('Real-time data fetch failed'));

      const result = await service.executeQuery(queryDto);

      expect(result.data).toEqual([]);
      expect((result.metadata as any).errors).toHaveLength(1);
      expect((result.metadata as any).errors[0].reason).toContain('Real-time data fetch failed');
      expect((result.metadata as any).errors[0].symbol).toBe('AAPL');
    });

    it('should handle cache miss gracefully', async () => {
      const queryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['NONEXISTENT'],
        dataTypeFilter: 'stock-quote',
        market: 'US', // Simulate standardized request after Symbol Mapper
      };

      storageService.retrieveData.mockResolvedValue(
        new StorageResponseDto(null, null) // Simulate cache miss
      );

      dataFetchingService.fetchSingleData.mockResolvedValue({
        data: { symbol: 'AAPL', price: 150 },
        metadata: {
          source: 'PROVIDER',
          timestamp: new Date(),
          market: Market.US,
          marketStatus: MarketStatus.TRADING,
          cacheTTL: 60,
          provider: 'longport'
        }
      });

      const result = await service.executeQuery(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.metadata.cacheUsed).toBe(false);
      expect(result.metadata.dataSources.realtime.hits).toBe(1);
      expect(dataFetchingService.fetchSingleData).toHaveBeenCalled();
    });
  });

  describe('getQueryStats', () => {
    it('should return query statistics after some queries', async () => {
      const queryDto: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        dataTypeFilter: "get-stock-quote",
        provider: "longport",
        market: "US", // Simulate standardized request after Symbol Mapper
        useCache: true,
      };

      storageService.retrieveData.mockResolvedValue(
        createStorageSuccessResponse(mockStockData["US:longport:get-stock-quote:AAPL"], "cache"),
      );

      await service.executeQuery(queryDto);
      await service.executeQuery(queryDto);

      const stats = await service.getQueryStats();

      expect(stats.performance.totalQueries).toBe(2);
      expect(stats.performance.cacheHitRate).toBe(1);
      expect(stats.queryTypes[QueryType.BY_SYMBOLS].count).toBe(2);
    });

    it('should return default stats when none exist', async () => {
      // Reset stats by re-initializing the service or statistics service if needed
      // For this test, we assume a clean state is provided by beforeEach
      const stats = await service.getQueryStats();

      expect(stats.performance.totalQueries).toBe(0);
      expect(Object.keys(stats.queryTypes).length).toBe(0);
    });
  });





});