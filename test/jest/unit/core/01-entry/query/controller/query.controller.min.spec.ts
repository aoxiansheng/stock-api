import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from '@core/01-entry/query/controller/query.controller';
import { QueryService } from '@core/01-entry/query/services/query.service';
import { QueryRequestDto } from '@core/01-entry/query/dto/query-request.dto';
import { QueryType } from '@core/01-entry/query/dto/query-types.dto';
import { QueryResponseDto } from '@core/01-entry/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';

describe('QueryController (minimal)', () => {
  let controller: QueryController;
  let service: jest.Mocked<QueryService>;

  beforeEach(async () => {
    service = {
      executeQuery: jest.fn(),
      executeBulkQuery: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [ { provide: QueryService, useValue: service } ],
    }).compile();

    controller = module.get(QueryController);
  });

  it('executeQuery delegates to service', async () => {
    const req: QueryRequestDto = { queryType: QueryType.BY_SYMBOLS, symbols: ['AAPL'] };
    const res: any = new QueryResponseDto(new PaginatedDataDto([], { page:1, limit:10, total:0, totalPages:0, hasNext:false, hasPrev:false }),
      { queryType: QueryType.BY_SYMBOLS, totalResults:0, returnedResults:0, executionTime:0, cacheUsed:true, dataSources: { cache:{hits:0, misses:0}, realtime:{hits:0, misses:0} }, timestamp: new Date().toISOString() } as any);
    service.executeQuery.mockResolvedValue(res);
    const out = await controller.executeQuery(req);
    expect(out).toBe(res);
    expect(service.executeQuery).toHaveBeenCalledWith(req);
  });

  it('queryBySymbols builds request and calls executeQuery', async () => {
    const res: any = new QueryResponseDto(new PaginatedDataDto([], { page:1, limit:10, total:0, totalPages:0, hasNext:false, hasPrev:false }),
      { queryType: QueryType.BY_SYMBOLS, totalResults:0, returnedResults:0, executionTime:0, cacheUsed:true, dataSources: { cache:{hits:0, misses:0}, realtime:{hits:0, misses:0} }, timestamp: new Date().toISOString() } as any);
    service.executeQuery.mockResolvedValue(res);
    const out = await controller.queryBySymbols('AAPL,MSFT');
    expect(out).toBe(res);
    expect(service.executeQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL','MSFT']
    }));
  });
});

