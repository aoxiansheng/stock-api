import { Test, TestingModule } from "@nestjs/testing";

import { SymbolQueryExecutor } from "../../../../../../../../src/core/01-entry/query/factories/executors/symbol-query.executor";
import { QueryService } from "../../../../../../../../src/core/01-entry/query/services/query.service";
import { QueryRequestDto } from "../../../../../../../../src/core/01-entry/query/dto/query-request.dto";
import { QueryExecutionResultDto } from "../../../../../../../../src/core/01-entry/query/dto/query-internal.dto";
import { QueryType } from "../../../../../../../../src/core/01-entry/query/dto/query-types.dto";

describe("SymbolQueryExecutor", () => {
  let executor: SymbolQueryExecutor;
  let queryService: jest.Mocked<QueryService>;

  beforeEach(async () => {
    // 创建模拟的QueryService
    queryService = {
      executeSymbolBasedQuery: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolQueryExecutor,
        {
          provide: QueryService,
          useValue: queryService,
        },
      ],
    }).compile();

    executor = module.get<SymbolQueryExecutor>(SymbolQueryExecutor);
  });

  describe("execute", () => {
    it("应该委托给QueryService的executeSymbolBasedQuery方法", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US", "700.HK"],
        queryTypeFilter: "get-stock-quote",
      };

      const expectedResult: QueryExecutionResultDto = {
        results: [
          {
            data: { symbol: "AAPL.US", price: 150.0 },
            source: "CACHE" as any,
          },
          {
            data: { symbol: "700.HK", price: 350.0 },
            source: "REALTIME" as any,
          },
        ],
        cacheUsed: true,
        dataSources: {
          cache: { hits: 1, misses: 0 },
          realtime: { hits: 1, misses: 0 },
        },
        errors: [],
      };

      queryService.executeSymbolBasedQuery.mockResolvedValue(expectedResult);

      // Act
      const result = await executor.execute(request);

      // Assert
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledWith(
        request,
      );
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedResult);
    });

    it("应该传递QueryService抛出的错误", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["INVALID.SYMBOL"],
        queryTypeFilter: "get-stock-quote",
      };

      const expectedError = new Error("符号格式无效");
      queryService.executeSymbolBasedQuery.mockRejectedValue(expectedError);

      // Act & Assert
      await expect(executor.execute(request)).rejects.toThrow(expectedError);
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledWith(
        request,
      );
    });

    it("应该处理空符号列表的请求", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [],
        queryTypeFilter: "get-stock-quote",
      };

      const expectedResult: QueryExecutionResultDto = {
        results: [],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
        errors: [{ symbol: "", reason: "symbols字段是必需的" }],
      };

      queryService.executeSymbolBasedQuery.mockResolvedValue(expectedResult);

      // Act
      const result = await executor.execute(request);

      // Assert
      expect(result).toBe(expectedResult);
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledWith(
        request,
      );
    });

    it("应该处理大批量符号查询", async () => {
      // Arrange
      const largeSymbolList = Array.from(
        { length: 100 },
        (_, i) => `SYM${i}.US`,
      );
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: largeSymbolList,
        queryTypeFilter: "get-stock-quote",
      };

      const expectedResult: QueryExecutionResultDto = {
        results: largeSymbolList.map((symbol) => ({
          data: { symbol, price: Math.random() * 100 },
          source: "CACHE" as any,
        })),
        cacheUsed: true,
        dataSources: {
          cache: { hits: largeSymbolList.length, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
        errors: [],
      };

      queryService.executeSymbolBasedQuery.mockResolvedValue(expectedResult);

      // Act
      const result = await executor.execute(request);

      // Assert
      expect(result).toBe(expectedResult);
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledWith(
        request,
      );
      expect(result.results).toHaveLength(100);
    });

    it("应该保持请求对象的完整性", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US"],
        queryTypeFilter: "get-stock-quote",
        provider: "longport",
        market: "US",
        options: {
          includeFields: ["lastPrice", "volume"],
        },
        maxAge: 300,
      };

      const expectedResult: QueryExecutionResultDto = {
        results: [],
        cacheUsed: false,
        dataSources: {
          cache: { hits: 0, misses: 0 },
          realtime: { hits: 0, misses: 0 },
        },
        errors: [],
      };

      queryService.executeSymbolBasedQuery.mockResolvedValue(expectedResult);

      // Act
      await executor.execute(request);

      // Assert
      expect(queryService.executeSymbolBasedQuery).toHaveBeenCalledWith(
        request,
      );

      // 验证请求对象的所有属性都被正确传递
      const calledRequest =
        queryService.executeSymbolBasedQuery.mock.calls[0][0];
      expect(calledRequest.queryType).toBe(request.queryType);
      expect(calledRequest.symbols).toEqual(request.symbols);
      expect(calledRequest.queryTypeFilter).toBe(request.queryTypeFilter);
      expect(calledRequest.provider).toBe(request.provider);
      expect(calledRequest.market).toBe(request.market);
      expect(calledRequest.options).toEqual(request.options);
      expect(calledRequest.maxAge).toBe(request.maxAge);
    });
  });
});
