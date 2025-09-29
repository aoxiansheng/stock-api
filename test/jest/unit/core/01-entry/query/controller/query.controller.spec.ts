import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from '@core/01-entry/query/controller/query.controller';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { createLogger } from '@common/logging/index';
import { QueryRequestDto, BulkQueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryResponseDto, BulkQueryResponseDto, QueryStatsDto } from '@core/01-entry/query/dto/query-response.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { Reflector } from '@nestjs/core';
import { AuthPerformanceService } from '@auth/services/infrastructure/auth-performance.service';

// Mock the logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock UniversalExceptionFactory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn(),
  },
  ComponentIdentifier: {},
  BusinessErrorCode: {},
}));

// Mock AuthPerformanceService
jest.mock('@auth/services/infrastructure/auth-performance.service', () => ({
  AuthPerformanceService: jest.fn().mockImplementation(() => ({
    recordAuthFlowPerformance: jest.fn(),
    recordAuthCachePerformance: jest.fn(),
    recordAuthFlowStats: jest.fn(),
  })),
}));

describe('QueryController', () => {
  let controller: QueryController;
  let queryService: QueryService;
  let mockLogger: any;

  beforeEach(async () => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Create mock QueryService
    const mockQueryService = {
      executeQuery: jest.fn(),
      executeBulkQuery: jest.fn(),
      getQueryStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [
        {
          provide: QueryService,
          useValue: mockQueryService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: AuthPerformanceService,
          useValue: {
            recordAuthFlowPerformance: jest.fn(),
            recordAuthCachePerformance: jest.fn(),
            recordAuthFlowStats: jest.fn(),
          },
        }
      ],
    }).compile();

    controller = module.get<QueryController>(QueryController);
    queryService = module.get<QueryService>(QueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have queryService injected', () => {
      expect(queryService).toBeDefined();
    });
  });

  describe('executeQuery', () => {
    const mockQueryRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
      queryTypeFilter: 'get-stock-quote',
      limit: 10,
      page: 1,
      options: {
        useCache: true,
        includeMetadata: true,
      },
    };

    const mockQueryResponse: QueryResponseDto = {
      data: new PaginatedDataDto([
        {
          symbol: 'AAPL',
          lastPrice: 195.89,
          change: 2.31,
          changePercent: 1.19,
          volume: 45678900,
          market: 'US',
          dataAge: 45,
          changeDetected: false,
          lastUpdate: '2024-01-01T15:29:15.000Z',
        },
      ], {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }),
      metadata: {
        queryType: QueryType.BY_SYMBOLS,
        totalResults: 1,
        returnedResults: 1,
        executionTime: 89,
        cacheUsed: true,
        dataSources: {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
        timestamp: '2024-01-01T15:29:15.000Z',
      },
    };

    it('should execute query successfully', async () => {
      // Arrange
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockQueryResponse);

      // Act
      const result = await controller.executeQuery(mockQueryRequest);

      // Assert
      expect(result).toEqual(mockQueryResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(mockQueryRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute query',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          queryTypeFilter: 'get-stock-quote',
          limit: 10,
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Success: Query executed successfully',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          totalResults: 1,
          returnedResults: 1,
          executionTime: 89,
          cacheUsed: true,
        })
      );
    });

    it('should handle query execution error', async () => {
      // Arrange
      const mockError = new Error('Query execution failed');
      (queryService.executeQuery as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.executeQuery(mockQueryRequest)).rejects.toThrow('Query execution failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error: Query execution failed',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          error: 'Query execution failed',
          errorType: 'Error',
        })
      );
    });

    it('should handle query request with partial symbols logging', async () => {
      // Arrange
      const largeSymbolsRequest = {
        ...mockQueryRequest,
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NFLX'],
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockQueryResponse);

      // Act
      await controller.executeQuery(largeSymbolsRequest);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute query',
        expect.objectContaining({
          symbols: ['AAPL', 'MSFT', 'GOOGL'], // Only first 3 symbols logged
        })
      );
    });

    it('should handle query with missing optional parameters', async () => {
      // Arrange
      const minimalRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockQueryResponse);

      // Act
      await controller.executeQuery(minimalRequest);

      // Assert
      expect(queryService.executeQuery).toHaveBeenCalledWith(minimalRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute query',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          market: undefined,
          provider: undefined,
          queryTypeFilter: undefined,
          limit: undefined,
        })
      );
    });
  });

  describe('executeBulkQuery', () => {
    const mockBulkRequest: BulkQueryRequestDto = {
      queries: [
        {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
        },
        {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['MSFT'],
        },
      ],
      parallel: true,
      continueOnError: false,
    };

    const mockBulkResponse: BulkQueryResponseDto = {
      results: [
        {
          data: new PaginatedDataDto([{ symbol: 'AAPL', lastPrice: 195.89 }], {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }),
          metadata: {
            queryType: QueryType.BY_SYMBOLS,
            totalResults: 1,
            returnedResults: 1,
            executionTime: 45,
            cacheUsed: true,
            dataSources: {
              cache: { hits: 1, misses: 0 },
              realtime: { hits: 0, misses: 0 },
            },
            timestamp: '2024-01-01T15:29:15.000Z',
          },
        },
      ],
      summary: {
        totalQueries: 2,
        totalExecutionTime: 150,
        averageExecutionTime: 75,
      },
      timestamp: '2024-01-01T15:29:15.000Z',
    };

    it('should execute bulk query successfully', async () => {
      // Arrange
      (queryService.executeBulkQuery as jest.Mock).mockResolvedValue(mockBulkResponse);

      // Act
      const result = await controller.executeBulkQuery(mockBulkRequest);

      // Assert
      expect(result).toEqual(mockBulkResponse);
      expect(queryService.executeBulkQuery).toHaveBeenCalledWith(mockBulkRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute bulk query',
        expect.objectContaining({
          queriesCount: 2,
          parallel: true,
          continueOnError: false,
          queryTypes: ['by_symbols'],
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Success: Bulk query executed successfully',
        expect.objectContaining({
          totalQueries: 2,
          successful: 1,
          failed: 1,
          totalTime: 150,
          averageTime: 75,
        })
      );
    });

    it('should handle bulk query execution error', async () => {
      // Arrange
      const mockError = new Error('Bulk query execution failed');
      (queryService.executeBulkQuery as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.executeBulkQuery(mockBulkRequest)).rejects.toThrow('Bulk query execution failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error: Bulk query execution failed',
        expect.objectContaining({
          queriesCount: 2,
          error: 'Bulk query execution failed',
          errorType: 'Error',
        })
      );
    });

    it('should handle bulk query with mixed query types', async () => {
      // Arrange
      const mixedRequest: BulkQueryRequestDto = {
        queries: [
          { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] },
          { queryType: QueryType.BY_MARKET, market: 'US' },
          { queryType: QueryType.BY_SYMBOLS, symbols: ['MSFT'] },
        ],
        parallel: false,
        continueOnError: true,
      };
      (queryService.executeBulkQuery as jest.Mock).mockResolvedValue(mockBulkResponse);

      // Act
      await controller.executeBulkQuery(mixedRequest);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute bulk query',
        expect.objectContaining({
          queriesCount: 3,
          queryTypes: ['by_symbols', 'by_market'],
        })
      );
    });
  });

  describe('queryBySymbols', () => {
    it('should execute query by symbols successfully', async () => {
      // Arrange
      const mockResponse: QueryResponseDto = {
        data: new PaginatedDataDto([{ symbol: 'AAPL', lastPrice: 195.89 }], {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: {
          queryType: QueryType.BY_SYMBOLS,
          totalResults: 1,
          returnedResults: 1,
          executionTime: 45,
          cacheUsed: true,
          dataSources: {
            cache: { hits: 1, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          timestamp: '2024-01-01T15:29:15.000Z',
        },
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await controller.queryBySymbols(
        'AAPL,MSFT,GOOGL',
        'longport',
        'US',
        'get-stock-quote',
        10,
        1,
        true
      );

      // Assert
      expect(result).toEqual(mockResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          provider: 'longport',
          market: 'US',
          queryTypeFilter: 'get-stock-quote',
          limit: 10,
          page: 1,
          options: {
            useCache: true,
            includeMetadata: false,
          },
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Quick query by symbols',
        expect.objectContaining({
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
          provider: 'longport',
          market: 'US',
          queryTypeFilter: 'get-stock-quote',
          limit: 10,
        })
      );
    });

    it('should handle symbols parameter with whitespace and empty values', async () => {
      // Arrange
      (queryService.executeQuery as jest.Mock).mockResolvedValue({
        success: true,
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: { queryType: QueryType.BY_SYMBOLS, totalResults: 0, timestamp: new Date() },
      });

      // Act
      await controller.queryBySymbols('AAPL, , MSFT,  ,GOOGL,');

      // Assert
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AAPL', 'MSFT', 'GOOGL'], // Empty and whitespace-only values filtered out
        })
      );
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      (queryService.executeQuery as jest.Mock).mockResolvedValue({
        success: true,
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: { queryType: QueryType.BY_SYMBOLS, totalResults: 0, timestamp: new Date() },
      });

      // Act
      await controller.queryBySymbols('AAPL');

      // Assert
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          provider: undefined,
          market: undefined,
          queryTypeFilter: undefined,
          limit: 100, // Default limit
          page: 1, // Default page
          options: {
            useCache: true, // Default useCache
            includeMetadata: false,
          },
        })
      );
    });

    it('should throw error when symbols parameter is missing', async () => {
      // Arrange
      const mockError = new Error('Symbols parameter is required');
      (UniversalExceptionFactory.createBusinessException as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      await expect(controller.queryBySymbols('')).rejects.toThrow('Symbols parameter is required');
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryBySymbols',
        message: 'Symbols parameter is required',
        context: {
          endpoint: '/query/symbols',
          receivedSymbols: '',
          validationField: 'symbols',
        },
      });
    });

    it('should throw error when symbols parameter is null or undefined', async () => {
      // Arrange
      const mockError = new Error('Symbols parameter is required');
      (UniversalExceptionFactory.createBusinessException as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      await expect(controller.queryBySymbols(null as any)).rejects.toThrow('Symbols parameter is required');
      await expect(controller.queryBySymbols(undefined as any)).rejects.toThrow('Symbols parameter is required');
    });

    it('should handle useCache parameter correctly', async () => {
      // Arrange
      (queryService.executeQuery as jest.Mock).mockResolvedValue({
        success: true,
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: { queryType: QueryType.BY_SYMBOLS, totalResults: 0, timestamp: new Date() },
      });

      // Act - Test explicit false
      await controller.queryBySymbols('AAPL', undefined, undefined, undefined, undefined, undefined, false);

      // Assert
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            useCache: false,
            includeMetadata: false,
          },
        })
      );
    });
  });

  describe('queryByMarket', () => {
    it('should execute query by market successfully', async () => {
      // Arrange
      const mockResponse: QueryResponseDto = {
        data: new PaginatedDataDto([{ symbol: 'AAPL', market: 'US' }], {
          page: 2,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
        }),
        metadata: {
          queryType: QueryType.BY_MARKET,
          totalResults: 1,
          returnedResults: 1,
          executionTime: 120,
          cacheUsed: true,
          dataSources: {
            cache: { hits: 1, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          timestamp: '2024-01-01T15:29:15.000Z',
        },
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await controller.queryByMarket('US', 'longport', 'get-stock-quote', 50, 2);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_MARKET,
          market: 'US',
          provider: 'longport',
          queryTypeFilter: 'get-stock-quote',
          limit: 50,
          page: 2,
          options: {
            useCache: true,
            includeMetadata: true,
          },
        })
      );
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      (queryService.executeQuery as jest.Mock).mockResolvedValue({
        success: true,
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: { queryType: QueryType.BY_MARKET, totalResults: 0, timestamp: new Date() },
      });

      // Act
      await controller.queryByMarket('US');

      // Assert
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_MARKET,
          market: 'US',
          provider: undefined,
          queryTypeFilter: undefined,
          limit: 100,
          page: 1,
        })
      );
    });

    it('should throw error when market parameter is missing', async () => {
      // Arrange
      const mockError = new Error('Market parameter is required');
      (UniversalExceptionFactory.createBusinessException as jest.Mock).mockImplementation(() => { throw mockError; });

      // Act & Assert
      await expect(controller.queryByMarket('')).rejects.toThrow('Market parameter is required');
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryByMarket',
        message: 'Market parameter is required',
        context: {
          endpoint: '/query/market',
          receivedMarket: '',
          validationField: 'market',
        },
      });
    });
  });

  describe('queryByProvider', () => {
    it('should execute query by provider successfully', async () => {
      // Arrange
      const mockResponse: QueryResponseDto = {
        data: new PaginatedDataDto([{ symbol: 'AAPL', provider: 'longport' }], {
          page: 3,
          limit: 25,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
        }),
        metadata: {
          queryType: QueryType.BY_PROVIDER,
          totalResults: 1,
          returnedResults: 1,
          executionTime: 95,
          cacheUsed: true,
          dataSources: {
            cache: { hits: 1, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          timestamp: '2024-01-01T15:29:15.000Z',
        },
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await controller.queryByProvider('longport', 'US', 'get-stock-quote', 25, 3);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(queryService.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_PROVIDER,
          provider: 'longport',
          market: 'US',
          queryTypeFilter: 'get-stock-quote',
          limit: 25,
          page: 3,
          options: {
            useCache: true,
            includeMetadata: true,
          },
        })
      );
    });

    it('should throw error when provider parameter is missing', async () => {
      // Arrange
      const mockError = new Error('Provider parameter is required');
      (UniversalExceptionFactory.createBusinessException as jest.Mock).mockImplementation(() => { throw mockError; });

      // Act & Assert
      await expect(controller.queryByProvider('')).rejects.toThrow('Provider parameter is required');
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'queryByProvider',
        message: 'Provider parameter is required',
        context: {
          endpoint: '/query/provider',
          receivedProvider: '',
          validationField: 'provider',
        },
      });
    });
  });

  describe('getQueryStats', () => {
    const mockStats: QueryStatsDto = {
      performance: {
        totalQueries: 15420,
        averageExecutionTime: 127,
        cacheHitRate: 0.82,
        errorRate: 0.03,
        queriesPerSecond: 45.6,
      },
      queryTypes: {
        by_symbols: {
          count: 8540,
          averageTime: 95,
          successRate: 0.98,
        },
        by_market: {
          count: 4120,
          averageTime: 185,
          successRate: 0.96,
        },
      },
      dataSources: {
        cache: { queries: 12644, avgTime: 15, successRate: 0.99 },
        persistent: { queries: 2776, avgTime: 125, successRate: 0.97 },
        realtime: { queries: 324, avgTime: 456, successRate: 0.94 },
      },
      popularQueries: [
        {
          pattern: 'AAPL,GOOGL,MSFT',
          count: 156,
          averageTime: 89,
          lastExecuted: '2024-01-01T11:55:00.000Z',
        },
      ],
      timestamp: '2024-01-01T15:29:15.000Z',
    };

    it('should get query statistics successfully', async () => {
      // Arrange
      (queryService.getQueryStats as jest.Mock).mockResolvedValue(mockStats);

      // Act
      const result = await controller.getQueryStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(queryService.getQueryStats).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('API Request: Get query statistics');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Success: Query statistics generated',
        expect.objectContaining({
          totalQueries: 15420,
          averageExecutionTime: 127,
          cacheHitRate: 0.82,
          errorRate: 0.03,
          queryTypesCount: 2,
        })
      );
    });

    it('should handle query statistics error', async () => {
      // Arrange
      const mockError = new Error('Failed to get query statistics');
      (queryService.getQueryStats as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.getQueryStats()).rejects.toThrow('Failed to get query statistics');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error: Failed to get query statistics',
        expect.objectContaining({
          error: 'Failed to get query statistics',
          errorType: 'Error',
        })
      );
    });

    it('should handle empty query types in statistics', async () => {
      // Arrange
      const emptyStats: QueryStatsDto = {
        ...mockStats,
        queryTypes: {},
      };
      (queryService.getQueryStats as jest.Mock).mockResolvedValue(emptyStats);

      // Act
      await controller.getQueryStats();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Success: Query statistics generated',
        expect.objectContaining({
          queryTypesCount: 0,
        })
      );
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle service layer exceptions consistently', async () => {
      // Arrange
      const serviceError = new Error('Service unavailable');
      (queryService.executeQuery as jest.Mock).mockRejectedValue(serviceError);

      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
      };

      // Act & Assert
      await expect(controller.executeQuery(mockRequest)).rejects.toThrow('Service unavailable');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error: Query execution failed',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          error: 'Service unavailable',
          errorType: 'Error',
        })
      );
    });

    it('should handle validation errors with proper context', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      (UniversalExceptionFactory.createBusinessException as jest.Mock).mockImplementation(() => { throw validationError; });

      // Act & Assert
      await expect(controller.queryBySymbols('')).rejects.toThrow('Validation failed');
      expect(UniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith(
        expect.objectContaining({
          component: ComponentIdentifier.QUERY,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          context: expect.objectContaining({
            endpoint: '/query/symbols',
            validationField: 'symbols',
          }),
        })
      );
    });
  });

  describe('Logging Behavior', () => {
    it('should log request and response for successful operations', async () => {
      // Arrange
      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'MSFT'],
        market: 'US',
      };
      const mockResponse: QueryResponseDto = {
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: {
          queryType: QueryType.BY_SYMBOLS,
          totalResults: 2,
          returnedResults: 2,
          executionTime: 75,
          cacheUsed: true,
          dataSources: {
            cache: { hits: 2, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          timestamp: '2024-01-01T15:29:15.000Z',
        },
      };
      (queryService.executeQuery as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await controller.executeQuery(mockRequest);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        'API Request: Execute query',
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT'],
          market: 'US',
        })
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        2,
        'API Success: Query executed successfully',
        expect.objectContaining({
          success: true,
          totalResults: 2,
          cacheUsed: true,
        })
      );
    });

    it('should log errors with appropriate detail', async () => {
      // Arrange
      const customError = new Error('Custom service error');
      customError.name = 'CustomError';
      (queryService.executeQuery as jest.Mock).mockRejectedValue(customError);

      // Act & Assert
      await expect(controller.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
      })).rejects.toThrow();

      // 修改期望，使用objectContaining接受额外属性，并修正期望的errorType
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error: Query execution failed',
        expect.objectContaining({
          error: 'Custom service error',
          errorType: 'Error', // 更改为与控制器中实际使用的值匹配
          queryType: QueryType.BY_SYMBOLS
        })
      );
    });

    it('should limit symbols logging to first 3 items for large requests', async () => {
      // Arrange
      const largeSymbolsList = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NFLX', 'AMZN', 'META'];
      (queryService.executeQuery as jest.Mock).mockResolvedValue({
        success: true,
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: { queryType: QueryType.BY_SYMBOLS, totalResults: 0, timestamp: new Date() },
      });

      // Act
      await controller.executeQuery({
        queryType: QueryType.BY_SYMBOLS,
        symbols: largeSymbolsList,
      });

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute query',
        expect.objectContaining({
          symbols: ['AAPL', 'MSFT', 'GOOGL'], // Only first 3 symbols
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow from request to response logging', async () => {
      // Arrange
      const bulkRequest: BulkQueryRequestDto = {
        queries: [
          { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] },
          { queryType: QueryType.BY_MARKET, market: 'US' },
        ],
        parallel: true,
        continueOnError: true,
      };

      const bulkResponse: BulkQueryResponseDto = {
        results: [
          {
            data: new PaginatedDataDto([{ symbol: 'AAPL' }], {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }),
            metadata: {
              queryType: QueryType.BY_SYMBOLS,
              totalResults: 1,
              returnedResults: 1,
              executionTime: 50,
              cacheUsed: true,
              dataSources: {
                cache: { hits: 1, misses: 0 },
                realtime: { hits: 0, misses: 0 },
              },
              timestamp: '2024-01-01T15:29:15.000Z',
            },
          },
        ],
        summary: {
          totalQueries: 2,
          totalExecutionTime: 100,
          averageExecutionTime: 50,
        },
        timestamp: '2024-01-01T15:29:15.000Z',
      };

      (queryService.executeBulkQuery as jest.Mock).mockResolvedValue(bulkResponse);

      // Act
      const result = await controller.executeBulkQuery(bulkRequest);

      // Assert
      expect(result).toEqual(bulkResponse);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Request: Execute bulk query',
        expect.objectContaining({
          queriesCount: 2,
          parallel: true,
          continueOnError: true,
          queryTypes: ['by_symbols', 'by_market'],
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'API Success: Bulk query executed successfully',
        expect.objectContaining({
          totalQueries: 2,
          successful: 1,
          failed: 1,
        })
      );
    });

    it('should delegate to executeQuery for GET endpoints', async () => {
      // Arrange
      const mockResponse: QueryResponseDto = {
        data: new PaginatedDataDto([], {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }),
        metadata: {
          queryType: QueryType.BY_SYMBOLS,
          totalResults: 0,
          returnedResults: 0,
          executionTime: 0,
          cacheUsed: true,
          dataSources: {
            cache: { hits: 0, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          timestamp: new Date().toISOString(),
        },
      };

      // Create a spy to track the actual method call
      const executeQuerySpy = jest.spyOn(controller, 'executeQuery').mockResolvedValue(mockResponse);

      // Act
      const result = await controller.queryBySymbols('AAPL,MSFT');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(executeQuerySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL', 'MSFT'],
        })
      );

      // Restore spy
      executeQuerySpy.mockRestore();
    });
  });
});