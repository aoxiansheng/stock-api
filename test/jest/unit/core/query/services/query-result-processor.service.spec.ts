import { Test, TestingModule } from '@nestjs/testing';
import { QueryResultProcessorService } from '@core/query/services/query-result-processor.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { QueryRequestDto, SortDirection } from '@core/query/dto/query-request.dto';
import { QueryExecutionResultDto } from '@core/query/dto/query-internal.dto';
import { QueryType } from '@core/query/dto/query-types.dto';

describe('QueryResultProcessorService', () => {
  let service: QueryResultProcessorService;
  let paginationService: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryResultProcessorService,
        {
          provide: PaginationService,
          useValue: {
            createPaginatedResponse: jest.fn((items, page, limit, total) => ({
              items,
              pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
            })),
          },
        },
      ],
    }).compile();

    service = module.get<QueryResultProcessorService>(QueryResultProcessorService);
    paginationService = module.get<PaginationService>(PaginationService);
  });

  it('should process query results', () => {
    const executionResult: QueryExecutionResultDto = {
      results: [{ symbol: 'AAPL', price: 150 }, { symbol: 'GOOG', price: 2800 }],
      cacheUsed: false,
      dataSources: { cache: { hits: 0, misses: 0 }, realtime: { hits: 2, misses: 0 } },
      errors: [],
    };
    const request: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL', 'GOOG'],
      page: 1,
      limit: 10,
    };

    const result = service.process(executionResult, request, 'test-query-id', 100);

    expect(result.data.items).toHaveLength(2);
    expect(result.metadata.totalResults).toBe(2);
    expect(result.metadata.executionTime).toBe(100);
    expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
      executionResult.results,
      request.page,
      request.limit,
      executionResult.results.length
    );
  });

  it('should apply field selection', () => {
    const item = { symbol: 'AAPL', price: 150, volume: 1000 };

    let result = service.applyFieldSelection(item, ['symbol', 'price']);
    expect(result).toEqual({ symbol: 'AAPL', price: 150 });

    result = service.applyFieldSelection(item, undefined, ['volume']);
    expect(result).toEqual({ symbol: 'AAPL', price: 150 });
  });

  it('should apply sorting', () => {
    const results = [{ symbol: 'GOOG', price: 2800 }, { symbol: 'AAPL', price: 150 }];

    let sorted = service.applySorting(results, { field: 'price', direction: SortDirection.ASC });
    expect(sorted[0].symbol).toBe('AAPL');

    sorted = service.applySorting(results, { field: 'price', direction: SortDirection.DESC });
    expect(sorted[0].symbol).toBe('GOOG');
  });
});