import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { QueryStatisticsService } from '@core/01-entry/query/services/query-statistics.service';
import { QueryResultProcessorService } from '@core/01-entry/query/services/query-result-processor.service';
import { QueryConfigService } from '@core/01-entry/query/config/query.config';
import { QueryExecutionEngine } from '@core/01-entry/query/services/query-execution-engine.service';
import { QueryRequestDto, BulkQueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryResponseDto, BulkQueryResponseDto, QueryMetadataDto, QueryStatsDto } from '@core/01-entry/query/dto/query-response.dto';
import { QueryProcessedResultDto } from '@core/01-entry/query/dto/query-processed-result.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QUERY_SUCCESS_MESSAGES, QUERY_ERROR_MESSAGES } from '@core/01-entry/query/constants/query.constants';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('QueryService', () => {
  let service: QueryService;
  let mockStatisticsService: jest.Mocked<QueryStatisticsService>;
  let mockResultProcessorService: jest.Mocked<QueryResultProcessorService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;
  let mockQueryConfig: jest.Mocked<QueryConfigService>;
  let mockExecutionEngine: jest.Mocked<QueryExecutionEngine>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    // Create mocks
    mockStatisticsService = {
      recordQueryPerformance: jest.fn(),
      getQueryStats: jest.fn(),
    } as any;

    mockResultProcessorService = {
      process: jest.fn(),
    } as any;

    mockEventBus = {
      emit: jest.fn(),
    } as any;

    mockQueryConfig = {
      getConfigSummary: jest.fn().mockReturnValue({
        maxBatchSize: 100,
        timeout: 5000,
        enableCache: true,
      }),
    } as any;

    mockExecutionEngine = {
      executeQuery: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: QueryStatisticsService,
          useValue: mockStatisticsService,
        },
        {
          provide: QueryResultProcessorService,
          useValue: mockResultProcessorService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: QueryConfigService,
          useValue: mockQueryConfig,
        },
        {
          provide: QueryExecutionEngine,
          useValue: mockExecutionEngine,
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);

    // Mock logger
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should initialize successfully and log initialization message', async () => {
        await service.onModuleInit();

        expect(mockLogger.log).toHaveBeenCalledWith(
          QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED,
          expect.objectContaining({
            operation: 'onModuleInit',
            config: expect.any(Object),
          })
        );
        expect(mockQueryConfig.getConfigSummary).toHaveBeenCalled();
      });
    });

    describe('onModuleDestroy', () => {
      it('should emit shutdown event on module destroy', async () => {
        await service.onModuleDestroy();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            timestamp: expect.any(Date),
            source: 'query_service',
            metricType: 'system',
            metricName: 'service_shutdown',
            metricValue: 1,
            tags: expect.objectContaining({
              operation: 'module_destroy',
              componentType: 'query',
            }),
          })
        );
        expect(mockLogger.log).toHaveBeenCalledWith('QueryService关闭事件已发送');
      });

      it('should handle event emission failure gracefully', async () => {
        const error = new Error('Event emission failed');
        mockEventBus.emit.mockImplementation(() => {
          throw error;
        });

        await service.onModuleDestroy();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `QueryService关闭事件发送失败: ${error.message}`
        );
      });
    });
  });

  describe('executeQuery', () => {
    const mockRequest: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL', 'GOOGL'],
      queryTypeFilter: 'get-stock-quote',
      market: 'US' as any,
      provider: 'test-provider',
    };

    const mockExecutionResult = {
      results: [{
        data: { symbol: 'AAPL', price: 150 },
        source: 'cache' as any,
      }],
      cacheUsed: true,
      dataSources: {
        cache: { hits: 1, misses: 0 },
        realtime: { hits: 0, misses: 0 },
      },
      errors: [],
    };

    const mockProcessedResult: QueryProcessedResultDto = {
      data: new PaginatedDataDto(
        [{ symbol: 'AAPL', price: 150 }],
        {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }
      ),
      metadata: new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        1,
        1,
        100,
        true,
        {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        }
      ),
    };

    it('should execute query successfully', async () => {
      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue(mockProcessedResult);

      const result = await service.executeQuery(mockRequest);

      expect(mockExecutionEngine.executeQuery).toHaveBeenCalledWith(mockRequest);
      expect(mockResultProcessorService.process).toHaveBeenCalledWith(
        mockExecutionResult,
        mockRequest,
        expect.any(String),
        expect.any(Number)
      );
      expect(result).toBeInstanceOf(QueryResponseDto);
      expect(result.data).toEqual(mockProcessedResult.data);
      expect(result.metadata).toEqual(mockProcessedResult.metadata);
    });

    it('should emit query_started event', async () => {
      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue(mockProcessedResult);

      await service.executeQuery(mockRequest);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_service',
          metricType: 'business',
          metricName: 'query_started',
          tags: expect.objectContaining({
            queryType: mockRequest.queryType,
            symbolsCount: mockRequest.symbols.length,
            queryTypeFilter: mockRequest.queryTypeFilter,
          }),
        })
      );
    });

    it('should emit query_completed event on success', async () => {
      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue(mockProcessedResult);

      await service.executeQuery(mockRequest);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_service',
          metricType: 'business',
          metricName: 'query_completed',
          tags: expect.objectContaining({
            success: true,
            cacheUsed: mockExecutionResult.cacheUsed,
            resultsCount: mockExecutionResult.results.length,
          }),
        })
      );
    });

    it('should log query execution start', async () => {
      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue(mockProcessedResult);

      await service.executeQuery(mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED,
        expect.objectContaining({
          queryId: expect.any(String),
          queryType: mockRequest.queryType,
          symbolsCount: mockRequest.symbols.length,
        })
      );
    });

    it('should handle execution failure and emit query_failed event', async () => {
      const error = new Error('Execution failed');
      mockExecutionEngine.executeQuery.mockRejectedValue(error);

      await expect(service.executeQuery(mockRequest)).rejects.toThrow(error);

      expect(mockStatisticsService.recordQueryPerformance).toHaveBeenCalledWith(
        mockRequest.queryType,
        expect.any(Number),
        false,
        false
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'query_service',
          metricType: 'business',
          metricName: 'query_failed',
          tags: expect.objectContaining({
            success: false,
            cacheUsed: false,
            error_type: 'Error',
            error_message: error.message,
          }),
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED,
        expect.objectContaining({
          queryId: expect.any(String),
          error: error.message,
          executionTime: expect.any(Number),
        })
      );
    });

    it('should handle empty symbols array', async () => {
      const emptyRequest = { ...mockRequest, symbols: [] };
      mockExecutionEngine.executeQuery.mockResolvedValue({
        ...mockExecutionResult,
        results: [],
      });
      mockResultProcessorService.process.mockReturnValue({
        ...mockProcessedResult,
        data: new PaginatedDataDto(
          [],
          {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        ),
      });

      const result = await service.executeQuery(emptyRequest);

      expect(mockExecutionEngine.executeQuery).toHaveBeenCalledWith(emptyRequest);
      expect(result.data).toEqual([]);
    });

    it('should generate consistent queryId for same request', async () => {
      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue(mockProcessedResult);

      await service.executeQuery(mockRequest);
      await service.executeQuery(mockRequest);

      const calls = mockResultProcessorService.process.mock.calls;
      const queryId1 = calls[0][2];
      const queryId2 = calls[1][2];

      expect(queryId1).toBe(queryId2);
    });
  });

  describe('executeBulkQuery', () => {
    const mockBulkRequest: BulkQueryRequestDto = {
      queries: [
        {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['AAPL'],
          queryTypeFilter: 'get-stock-quote',
        },
        {
          queryType: QueryType.BY_SYMBOLS,
          symbols: ['GOOGL'],
          queryTypeFilter: 'get-stock-quote',
        },
      ],
      parallel: true,
      continueOnError: true,
    };

    const mockSingleResponse = new QueryResponseDto(
      new PaginatedDataDto(
        [{ symbol: 'AAPL', price: 150 }],
        {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }
      ),
      new QueryMetadataDto(
        QueryType.BY_SYMBOLS,
        1,
        1,
        100,
        true,
        {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        }
      )
    );

    beforeEach(() => {
      // Mock executeQuery to return successful responses
      jest.spyOn(service, 'executeQuery').mockResolvedValue(mockSingleResponse);
    });

    it('should execute bulk query in parallel', async () => {
      const result = await service.executeBulkQuery(mockBulkRequest);

      expect(service.executeQuery).toHaveBeenCalledTimes(2);
      expect(service.executeQuery).toHaveBeenCalledWith(mockBulkRequest.queries[0]);
      expect(service.executeQuery).toHaveBeenCalledWith(mockBulkRequest.queries[1]);
      expect(result).toBeInstanceOf(BulkQueryResponseDto);
      expect(result.results).toHaveLength(2);
    });

    it('should execute bulk query sequentially when parallel is false', async () => {
      const sequentialRequest = { ...mockBulkRequest, parallel: false };

      const result = await service.executeBulkQuery(sequentialRequest);

      expect(service.executeQuery).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
    });

    it('should handle individual query failures in parallel mode with continueOnError', async () => {
      const error = new Error('Individual query failed');
      (service.executeQuery as jest.Mock)
        .mockResolvedValueOnce(mockSingleResponse)
        .mockRejectedValueOnce(error);

      const result = await service.executeBulkQuery(mockBulkRequest);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toBe(mockSingleResponse);
      // Second result should be an error response
      expect(result.results[1]).toBeInstanceOf(QueryResponseDto);
    });

    it('should throw error in parallel mode when continueOnError is false', async () => {
      const error = new Error('Individual query failed');
      const strictRequest = { ...mockBulkRequest, continueOnError: false };

      (service.executeQuery as jest.Mock)
        .mockResolvedValueOnce(mockSingleResponse)
        .mockRejectedValueOnce(error);

      await expect(service.executeBulkQuery(strictRequest)).rejects.toThrow(error);
    });

    it('should handle sequential execution with errors', async () => {
      const sequentialRequest = { ...mockBulkRequest, parallel: false };
      const error = new Error('Sequential query failed');

      (service.executeQuery as jest.Mock)
        .mockResolvedValueOnce(mockSingleResponse)
        .mockRejectedValueOnce(error);

      const result = await service.executeBulkQuery(sequentialRequest);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toBe(mockSingleResponse);
    });

    it('should stop on first error in sequential mode when continueOnError is false', async () => {
      const sequentialRequest = {
        ...mockBulkRequest,
        parallel: false,
        continueOnError: false
      };
      const errorResponse = new QueryResponseDto(
        new PaginatedDataDto(
          [],
          {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        ),
        new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          100,
          false,
          {
            cache: { hits: 0, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          },
          [{ symbol: 'GOOGL', reason: 'Test error' } as any]
        )
      );

      (service.executeQuery as jest.Mock)
        .mockResolvedValueOnce(mockSingleResponse)
        .mockResolvedValueOnce(errorResponse);

      await expect(service.executeBulkQuery(sequentialRequest)).rejects.toThrow();
    });

    it('should log bulk query execution start and completion', async () => {
      await service.executeBulkQuery(mockBulkRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_STARTED,
        expect.objectContaining({
          queriesCount: mockBulkRequest.queries.length,
          parallel: mockBulkRequest.parallel,
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_COMPLETED,
        expect.objectContaining({
          totalQueries: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
          totalTime: expect.any(Number),
        })
      );
    });

    it('should handle bulk query execution failure', async () => {
      const error = new Error('Bulk execution failed');
      (service as any).executeBulkQueriesInParallel = jest.fn().mockRejectedValue(error);

      await expect(service.executeBulkQuery(mockBulkRequest)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        QUERY_ERROR_MESSAGES.BULK_QUERY_EXECUTION_FAILED,
        expect.objectContaining({
          error: error.message,
          totalTime: expect.any(Number),
        })
      );
    });
  });

  describe('getQueryStats', () => {
    it('should return query statistics', () => {
      const mockStats = {
        totalQueries: 100,
        successfulQueries: 95,
        failedQueries: 5,
        averageResponseTime: 150,
      };
      mockStatisticsService.getQueryStats.mockReturnValue(Promise.resolve(mockStats) as any);

      const result = service.getQueryStats();

      expect(mockStatisticsService.getQueryStats).toHaveBeenCalled();
      expect(result).toBe(mockStats);
    });
  });

  describe('Event-driven Monitoring', () => {
    it('should handle event emission failure gracefully in emitQueryEvent', async () => {
      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const mockExecutionResult = {
        results: [],
        cacheUsed: false,
        dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } },
        errors: [],
      };

      const error = new Error('Event emission failed');
      mockEventBus.emit.mockImplementation(() => {
        throw error;
      });

      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue({
        data: new PaginatedDataDto(
          [],
          {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        ),
        metadata: new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          100,
          false,
          {
            cache: { hits: 0, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          }
        ),
      });

      // Should not throw even if event emission fails
      await expect(service.executeQuery(mockRequest)).resolves.toBeDefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('查询监控事件发送失败'),
        expect.objectContaining({
          eventType: expect.any(String),
          error: error.message,
        })
      );
    });
  });

  describe('Query ID Generation', () => {
    it('should generate different IDs for different requests', () => {
      const request1: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const request2: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['GOOGL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const id1 = (service as any).generateQueryId(request1);
      const id2 = (service as any).generateQueryId(request2);

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate same ID for requests with same content but different symbol order', () => {
      const request1: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL', 'GOOGL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const request2: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['GOOGL', 'AAPL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const id1 = (service as any).generateQueryId(request1);
      const id2 = (service as any).generateQueryId(request2);

      expect(id1).toBe(id2);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined symbols gracefully', async () => {
      const requestWithUndefinedSymbols: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: undefined as any,
        queryTypeFilter: 'get-stock-quote',
      };

      const mockExecutionResult = {
        results: [],
        cacheUsed: false,
        dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } },
        errors: [],
      };

      mockExecutionEngine.executeQuery.mockResolvedValue(mockExecutionResult);
      mockResultProcessorService.process.mockReturnValue({
        data: new PaginatedDataDto(
          [],
          {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        ),
        metadata: new QueryMetadataDto(
          QueryType.BY_SYMBOLS,
          0,
          0,
          100,
          false,
          {
            cache: { hits: 0, misses: 0 },
            realtime: { hits: 0, misses: 0 },
          }
        ),
      });

      const result = await service.executeQuery(requestWithUndefinedSymbols);

      expect(result).toBeInstanceOf(QueryResponseDto);
    });

    it('should handle execution engine throwing unexpected errors', async () => {
      const mockRequest: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ['AAPL'],
        queryTypeFilter: 'get-stock-quote',
      };

      const unexpectedError = new TypeError('Unexpected error');
      mockExecutionEngine.executeQuery.mockRejectedValue(unexpectedError);

      await expect(service.executeQuery(mockRequest)).rejects.toThrow(unexpectedError);

      expect(mockStatisticsService.recordQueryPerformance).toHaveBeenCalledWith(
        mockRequest.queryType,
        expect.any(Number),
        false,
        false
      );
    });
  });
});