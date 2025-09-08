import { Test, TestingModule } from "@nestjs/testing";
import { NotImplementedException } from "@nestjs/common";

import { MarketQueryExecutor } from "../../../../../../../../src/core/01-entry/query/factories/executors/market-query.executor";
import { QueryRequestDto } from "../../../../../../../../src/core/01-entry/query/dto/query-request.dto";
import { QueryType } from "../../../../../../../../src/core/01-entry/query/dto/query-types.dto";
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe("MarketQueryExecutor", () => {
  let executor: MarketQueryExecutor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketQueryExecutor],
    }).compile();

    executor = module.get<MarketQueryExecutor>(MarketQueryExecutor);
  });

  describe("execute", () => {
    it("应该对BY_MARKET查询类型抛出NotImplementedException", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_MARKET,
        market: "HK",
        queryTypeFilter: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      };

      // Act & Assert
      await expect(executor.execute(request)).rejects.toThrow(
        NotImplementedException,
      );
      await expect(executor.execute(request)).rejects.toThrow(
        "BY_MARKET查询类型暂未实现，请使用BY_SYMBOLS查询类型或等待未来版本支持",
      );
    });

    it("应该记录警告日志说明当前为占位实现", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_MARKET,
        market: "US",
        queryTypeFilter: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      };

      // Mock logger to capture logs
      const logSpy = jest
        .spyOn((executor as any).logger, "warn")
        .mockImplementation();

      // Act & Assert
      await expect(executor.execute(request)).rejects.toThrow(
        NotImplementedException,
      );

      expect(logSpy).toHaveBeenCalledWith("MarketQueryExecutor当前为占位实现", {
        queryType: request.queryType,
        market: request.market,
      });

      logSpy.mockRestore();
    });

    it("应该处理不同市场的查询请求（都抛出NotImplementedException）", async () => {
      const markets = ["HK", "US", "SZ", "SH"];

      for (const market of markets) {
        const request: QueryRequestDto = {
          queryType: QueryType.BY_MARKET,
          market: market,
          queryTypeFilter: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        };

        await expect(executor.execute(request)).rejects.toThrow(
          NotImplementedException,
        );
      }
    });

    it("应该处理包含其他选项的复杂查询请求", async () => {
      // Arrange
      const request: QueryRequestDto = {
        queryType: QueryType.BY_MARKET,
        market: "HK",
        queryTypeFilter: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        options: {
          includeFields: ["lastPrice", "volume", "marketCap"],
        },
        maxAge: 60,
      };

      // Act & Assert
      await expect(executor.execute(request)).rejects.toThrow(
        NotImplementedException,
      );

      // 即使请求包含其他参数，也应该抛出相同的错误
      const error = await executor.execute(request).catch((e) => e);
      expect(error.message).toBe(
        "BY_MARKET查询类型暂未实现，请使用BY_SYMBOLS查询类型或等待未来版本支持",
      );
    });
  });

  describe("未来实现计划验证", () => {
    it("占位实现应该为未来扩展保留了正确的接口", () => {
      // 验证执行器符合QueryExecutor接口
      expect(executor.execute).toBeDefined();
      expect(typeof executor.execute).toBe("function");
      expect(executor.execute.length).toBe(1); // 接受一个QueryRequestDto参数
    });

    it("类应该有适当的日志记录器", () => {
      // 验证日志记录器存在
      expect((executor as any).logger).toBeDefined();
      expect((executor as any).logger.warn).toBeDefined();
      expect(typeof (executor as any).logger.warn).toBe("function");
    });

    it("应该为未来实现提供清晰的错误消息", async () => {
      const request: QueryRequestDto = {
        queryType: QueryType.BY_MARKET,
        market: "HK",
      };

      try {
        await executor.execute(request);
        fail("应该抛出NotImplementedException");
      } catch (error) {
        expect(error).toBeInstanceOf(NotImplementedException);
        expect(error.message).toContain("BY_MARKET查询类型暂未实现");
        expect(error.message).toContain("请使用BY_SYMBOLS查询类型");
        expect(error.message).toContain("等待未来版本支持");
      }
    });
  });
});
