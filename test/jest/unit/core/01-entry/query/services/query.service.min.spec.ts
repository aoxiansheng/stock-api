import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { QueryResultProcessorService } from '@core/01-entry/query/services/query-result-processor.service';
import { QueryConfigService } from '@core/01-entry/query/config/query.config';
import { QueryExecutionEngine } from '@core/01-entry/query/services/query-execution-engine.service';
import { QueryRequestDto, BulkQueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryResponseDto, QueryMetadataDto, BulkQueryResponseDto } from '@core/01-entry/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { QUERY_SUCCESS_MESSAGES, QUERY_ERROR_MESSAGES } from '@core/01-entry/query/constants/query.constants';

describe('QueryService (minimal)', () => {
  let service: QueryService;
  let mockResultProcessor: jest.Mocked<QueryResultProcessorService>;
  let mockConfig: jest.Mocked<QueryConfigService>;
  let mockEngine: jest.Mocked<QueryExecutionEngine>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    mockResultProcessor = { process: jest.fn() } as any;
    mockConfig = { getConfigSummary: jest.fn().mockReturnValue({}) } as any;
    mockEngine = { executeQuery: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        { provide: QueryResultProcessorService, useValue: mockResultProcessor },
        { provide: QueryConfigService, useValue: mockConfig },
        { provide: QueryExecutionEngine, useValue: mockEngine },
      ],
    }).compile();

    service = module.get(QueryService);
    (service as any).logger = mockLogger;
  });

  afterEach(() => jest.clearAllMocks());

  it('onModuleInit logs initialized with config summary', async () => {
    await service.onModuleInit();
    expect(mockLogger.log).toHaveBeenCalledWith(
      QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED,
      expect.objectContaining({ operation: 'onModuleInit', config: {} })
    );
  });

  it('executeQuery returns processed response', async () => {
    const req: QueryRequestDto = { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] };
    const execResult: any = {
      results: [{ data: { symbol: 'AAPL' }, source: 'cache' }],
      cacheUsed: true,
      dataSources: { cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 } },
    };
    mockEngine.executeQuery.mockResolvedValue(execResult);

    const processed = {
      data: new PaginatedDataDto([{ symbol: 'AAPL' }], {
        page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false,
      }),
      metadata: new QueryMetadataDto(
        QueryType.BY_SYMBOLS, 1, 1, 10, true,
        { cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 } },
      ),
    };
    mockResultProcessor.process.mockReturnValue(processed as any);

    const res = await service.executeQuery(req);
    expect(res).toBeInstanceOf(QueryResponseDto);
    expect(res.data.items.length).toBe(1);
    expect(mockLogger.log).toHaveBeenCalledWith(
      QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED,
      expect.objectContaining({ queryType: QueryType.BY_SYMBOLS })
    );
  });

  it('executeQuery logs and rethrows on failure', async () => {
    const req: QueryRequestDto = { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] };
    const err = new Error('engine failed');
    mockEngine.executeQuery.mockRejectedValue(err);
    await expect(service.executeQuery(req)).rejects.toThrow('engine failed');
    expect(mockLogger.error).toHaveBeenCalledWith(
      QUERY_ERROR_MESSAGES.QUERY_EXECUTION_FAILED,
      expect.objectContaining({ error: 'engine failed' })
    );
  });

  it('executeBulkQuery aggregates results', async () => {
    const req: BulkQueryRequestDto = {
      queries: [ { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] } ],
      parallel: true,
      continueOnError: true,
    };
    const execResult: any = {
      results: [{ data: { symbol: 'AAPL' }, source: 'cache' }],
      cacheUsed: true,
      dataSources: { cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 } },
    };
    mockEngine.executeQuery.mockResolvedValue(execResult);
    mockResultProcessor.process.mockReturnValue({
      data: new PaginatedDataDto([{ symbol: 'AAPL' }], { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }),
      metadata: new QueryMetadataDto(
        QueryType.BY_SYMBOLS, 1, 1, 10, true,
        { cache: { hits: 1, misses: 0 }, realtime: { hits: 0, misses: 0 } },
      ),
    } as any);

    const res = await service.executeBulkQuery(req);
    expect(res).toBeInstanceOf(BulkQueryResponseDto);
    expect(res.results.length).toBe(1);
  });
});

