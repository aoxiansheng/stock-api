/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { QueryResultProcessorService } from "@core/01-entry/query/services/query-result-processor.service";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import {
  QueryRequestDto,
  SortDirection,
} from "@core/01-entry/query/dto/query-request.dto";
import { QueryExecutionResultDto } from "@core/01-entry/query/dto/query-internal.dto";
import { QueryType } from "@core/01-entry/query/dto/query-types.dto";

describe("QueryResultProcessorService", () => {
  let service: QueryResultProcessorService;
  let paginationService: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryResultProcessorService,
        {
          provide: PaginationService,
          useValue: {
            _createPaginatedResponse: jest.fn((items, page, limit, total) => ({
              items,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
              },
            })),
          },
        },
      ],
    }).compile();

    service = module.get<QueryResultProcessorService>(
      QueryResultProcessorService,
    );
    paginationService = module.get<PaginationService>(PaginationService);
  });

  it("should process query results", () => {
    const executionResult: QueryExecutionResultDto = {
      results: [
        { symbol: "AAPL", price: 150 },
        { symbol: "GOOG", price: 2800 },
      ],
      cacheUsed: false,
      dataSources: {
        cache: { hits: 0, misses: 0 },
        realtime: { hits: 2, misses: 0 },
      },
      errors: [],
    };
    const request: QueryRequestDto = {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL", "GOOG"],
      page: 1,
      limit: 10,
    };

    const result = service.process(
      executionResult,
      request,
      "test-query-id",
      100,
    );

    expect(result.data.items).toHaveLength(2);
    expect(result.metadata.totalResults).toBe(2);
    expect(result.metadata.executionTime).toBe(100);
    expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
      executionResult.results,
      request.page,
      request.limit,
      executionResult.results.length,
    );
  });

  it("should apply field selection", () => {
    const item = { symbol: "AAPL", price: 150, volume: 1000 };

    let result = service.applyFieldSelection(item, ["symbol", "price"]);
    expect(result).toEqual({ symbol: "AAPL", price: 150 });

    result = service.applyFieldSelection(item, undefined, ["volume"]);
    expect(result).toEqual({ symbol: "AAPL", price: 150 });
  });

  it("should apply sorting", () => {
    const results = [
      { symbol: "GOOG", price: 2800 },
      { symbol: "AAPL", price: 150 },
    ];

    let sorted = service.applySorting(results, {
      field: "price",
      direction: SortDirection.ASC,
    });
    expect(sorted[0].symbol).toBe("AAPL");

    sorted = service.applySorting(results, {
      field: "price",
      direction: SortDirection.DESC,
    });
    expect(sorted[0].symbol).toBe("GOOG");
  });

  // 新增测试：分页元数据统计一致性修复
  describe("pagination metadata consistency", () => {
    it("should use pagination.total for totalResults when pagination exists", () => {
      const executionResult: QueryExecutionResultDto = {
        results: [
          { symbol: "AAPL", price: 150 },
          { symbol: "GOOG", price: 2800 },
        ], // 2个结果
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 2, misses: 0 },
        },
        errors: [],
        pagination: {
          page: 1,
          limit: 2,
          total: 100, // 实际总数是100，但当前页只返回2个结果
          totalPages: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL", "GOOG"],
        page: 1,
        limit: 2,
      };

      const result = service.process(
        executionResult,
        request,
        "test-query-id",
        100,
      );

      // 应该使用pagination.total (100) 而不是 results.length (2)
      expect(result.metadata.totalResults).toBe(100);
      expect(result.metadata.returnedResults).toBe(2); // 实际返回的结果数
    });

    it("should fallback to results.length when pagination is missing", () => {
      const executionResult: QueryExecutionResultDto = {
        results: [
          { symbol: "AAPL", price: 150 },
          { symbol: "GOOG", price: 2800 },
        ],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 2, misses: 0 },
        },
        errors: [],
        // 没有 pagination 字段
      };

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL", "GOOG"],
        page: 1,
        limit: 10,
      };

      const result = service.process(
        executionResult,
        request,
        "test-query-id",
        100,
      );

      // 没有分页信息时，应该回退到 results.length
      expect(result.metadata.totalResults).toBe(2);
      expect(result.metadata.returnedResults).toBe(2);
    });

    it("should handle pagination.total as 0", () => {
      const executionResult: QueryExecutionResultDto = {
        results: [],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 1 },
        },
        errors: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0, // 没有找到任何结果
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["UNKNOWN"],
        page: 1,
        limit: 10,
      };

      const result = service.process(
        executionResult,
        request,
        "test-query-id",
        50,
      );

      expect(result.metadata.totalResults).toBe(0);
      expect(result.metadata.returnedResults).toBe(0);
    });

    it("should handle undefined pagination.total", () => {
      const executionResult: QueryExecutionResultDto = {
        results: [{ symbol: "AAPL", price: 150 }],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 1, misses: 0 },
        },
        errors: [],
        pagination: {
          page: 1,
          limit: 10,
          // total 字段未定义
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        } as any, // 强制类型转换来模拟不完整的分页对象
      };

      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        page: 1,
        limit: 10,
      };

      const result = service.process(
        executionResult,
        request,
        "test-query-id",
        100,
      );

      // 当 pagination.total 未定义时，应该回退到 results.length
      expect(result.metadata.totalResults).toBe(1);
      expect(result.metadata.returnedResults).toBe(1);
    });
  });
});
