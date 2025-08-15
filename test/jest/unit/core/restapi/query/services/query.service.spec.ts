/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '@core/restapi/query/services/query.service';
import { StorageService } from '@core/public/storage/services/storage.service';
import { ReceiverService } from '@core/restapi/receiver/services/receiver.service';
import { DataChangeDetectorService } from '@core/public/shared/services/data-change-detector.service';
import { MarketStatusService } from '@core/public/shared/services/market-status.service';
import { FieldMappingService } from '@core/public/shared/services/field-mapping.service';
import { QueryStatisticsService } from '@core/restapi/query/services/query-statistics.service';
import { QueryResultProcessorService } from '@core/restapi/query/services/query-result-processor.service';
import { BackgroundTaskService } from '@core/public/shared/services/background-task.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { MetricsRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { QueryRequestDto } from '@core/restapi/query/dto/query-request.dto';
import { QueryType } from '@core/restapi/query/dto/query-types.dto';
import { QueryMetadataDto } from '@core/restapi/query/dto/query-response.dto';
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import { QueryProcessedResultDto } from '@core/restapi/query/dto/query-processed-result.dto';

// 定义价格数据接口
interface PriceData {
  price: number;
}

describe('QueryService', () => {
  let service: QueryService;
  

  // 创建模拟的服务
  const mockStorageService = {
    retrieveData: jest.fn(),
    storeData: jest.fn(),
  };
  const mockReceiverService = {
    handleRequest: jest.fn(),
  };
  const mockDataChangeDetectorService = {
    detectSignificantChange: jest.fn(),
  };
  const mockMarketStatusService = {
    getMarketStatus: jest.fn(),
  };
  const mockFieldMappingService = {
    filterToClassification: jest.fn(),
  };
  const mockQueryStatisticsService = {
    recordQueryPerformance: jest.fn(),
    getQueryStats: jest.fn(),
  };
  const mockQueryResultProcessorService = {
    process: jest.fn(),
  };
  const mockBackgroundTaskService = {
    run: jest.fn(),
  };
  const mockPaginationService = {
    createPaginatedResponseFromQuery: jest.fn(),
  };
  const mockMetricsRegistryService = {
    queryConcurrentRequestsActive: { inc: jest.fn(), dec: jest.fn() },
    queryPipelineDuration: { observe: jest.fn() },
    querySymbolsProcessedTotal: { inc: jest.fn() },
    queryBatchEfficiency: { set: jest.fn() },
    queryCacheHitRatio: { set: jest.fn() },
    queryBatchShardingEfficiency: { set: jest.fn() },
    queryMarketProcessingTime: { observe: jest.fn() },
    queryReceiverCallsTotal: { inc: jest.fn() },
    queryReceiverCallDuration: { observe: jest.fn() },
    queryBackgroundTasksActive: { inc: jest.fn(), dec: jest.fn() },
    queryBackgroundTasksCompleted: { inc: jest.fn() },
    queryBackgroundTasksFailed: { inc: jest.fn() },
  };

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: ReceiverService, useValue: mockReceiverService },
        { provide: DataChangeDetectorService, useValue: mockDataChangeDetectorService },
        { provide: MarketStatusService, useValue: mockMarketStatusService },
        { provide: FieldMappingService, useValue: mockFieldMappingService },
        { provide: QueryStatisticsService, useValue: mockQueryStatisticsService },
        { provide: QueryResultProcessorService, useValue: mockQueryResultProcessorService },
        { provide: BackgroundTaskService, useValue: mockBackgroundTaskService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: MetricsRegistryService, useValue: mockMetricsRegistryService },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    
  });

  // 测试 executeQuery 方法
  it('should execute a query and return a response', async () => {
    // 创建一个模拟的查询请求
    const request: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ['AAPL'],
      queryTypeFilter: 'get-stock-quote',
      options: { useCache: true },
    };

    // 模拟缓存未命中
    mockStorageService.retrieveData.mockResolvedValue({ data: null });
    // 模拟ReceiverService响应
    mockReceiverService.handleRequest.mockResolvedValue({
      data: [{ symbol: 'AAPL', price: 150 }],
      metadata: { provider: 'longport', capability: 'get-stock-quote' },
    });
    // 模拟分页服务
    mockPaginationService.createPaginatedResponseFromQuery.mockReturnValue({
      items: [{ price: 150 }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });

    // 模拟结果处理器
    const mockProcessedResult: QueryProcessedResultDto<PriceData> = {
      data: new PaginatedDataDto([{ price: 150 }] as PriceData[], { 
        page: 1, 
        limit: 10, 
        total: 1, 
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }),
      metadata: new QueryMetadataDto(
        QueryType.BY_SYMBOLS, 
        1, 
        1, 
        100, 
        false, 
        { cache: { hits: 0, misses: 0 }, realtime: { hits: 0, misses: 0 } }
      ),
    };
    mockQueryResultProcessorService.process.mockReturnValue(mockProcessedResult);

    // 调用 executeQuery 方法
    const result = await service.executeQuery(request);

    // 断言结果是否正确
    expect((result.data.items[0] as any).price).toBe(150);
    expect(mockStorageService.retrieveData).toHaveBeenCalled();
    
    // 🎯 里程碑6.3: 验证监控指标被正确调用
    expect(mockMetricsRegistryService.queryConcurrentRequestsActive.inc).toHaveBeenCalled();
    expect(mockMetricsRegistryService.queryConcurrentRequestsActive.dec).toHaveBeenCalled();
    expect(mockMetricsRegistryService.queryPipelineDuration.observe).toHaveBeenCalled();
    expect(mockMetricsRegistryService.querySymbolsProcessedTotal.inc).toHaveBeenCalled();
  });
});