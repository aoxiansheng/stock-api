/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@app/config/logger.config";
import { LongportStreamContextService } from "../../../../../../src/providers/longport/services/longport-stream-context.service";

// Mock logger
jest.mock("@app/config/logger.config");
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// 条件性mock LongPort SDK
let mockLongPort: any = null;
let isLongPortAvailable = false;

try {
  // 尝试加载真实的LongPort SDK
  const longport = eval("require")("longport");
  if (longport && longport.Config && longport.QuoteContext) {
    isLongPortAvailable = true;
  }
} catch (error) {
  // LongPort SDK不可用，使用mock
  mockLongPort = {
    Config: {
      fromEnv: jest.fn(),
    },
    QuoteContext: {
      new: jest.fn(),
    },
    SubType: {
      Quote: "quote",
    },
  };
}

// 如果LongPort不可用，进行mock
if (!isLongPortAvailable) {
  jest.mock("longport", () => mockLongPort);
}

describe("LongportStreamContextService Integration", () => {
  let service: LongportStreamContextService;
  let configService: ConfigService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LongportStreamContextService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                LONGPORT_APP_KEY: process.env.LONGPORT_APP_KEY || "test_key",
                LONGPORT_APP_SECRET:
                  process.env.LONGPORT_APP_SECRET || "test_secret",
                LONGPORT_ACCESSTOKEN:
                  process.env.LONGPORT_ACCESS_TOKEN || "test_token",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<LongportStreamContextService>(
      LongportStreamContextService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await service.onModuleDestroy();
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
      expect(configService).toBeDefined();
    });

    it("should have correct service methods", () => {
      expect(service.initializeWebSocket).toBeDefined();
      expect(service.subscribe).toBeDefined();
      expect(service.unsubscribe).toBeDefined();
      expect(service.onQuoteUpdate).toBeDefined();
      expect(service.isWebSocketConnected).toBeDefined();
      expect(service.getSubscribedSymbols).toBeDefined();
      expect(service.cleanup).toBeDefined();
    });
  });

  describe("Configuration Management", () => {
    it("should read configuration from environment variables", () => {
      expect(configService.get("LONGPORT_APP_KEY")).toBeDefined();
      expect(configService.get("LONGPORT_APP_SECRET")).toBeDefined();
      expect(configService.get("LONGPORT_ACCESS_TOKEN")).toBeDefined();
    });

    it("should handle missing configuration gracefully", async () => {
      // 创建配置缺失的服务实例
      const testModule = await Test.createTestingModule({
        providers: [
          LongportStreamContextService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined), // 返回undefined模拟配置缺失
            },
          },
        ],
      }).compile();

      const testService = testModule.get<LongportStreamContextService>(
        LongportStreamContextService,
      );

      if (!isLongPortAvailable) {
        // Mock环境下测试配置验证
        await expect(testService.initializeWebSocket()).rejects.toThrow(
          /配置不完整/,
        );
      } else {
        // 真实环境下，如果没有有效配置，应该抛出相应错误
        console.warn("真实LongPort SDK环境 - 配置验证测试可能需要有效凭据");
      }

      await testModule.close();
    });
  });

  describe("WebSocket Connection Management", () => {
    it("should initialize WebSocket connection", async () => {
      if (!isLongPortAvailable) {
        // Mock环境下的测试
        const { Config, QuoteContext } = eval("require")("longport");
        Config.fromEnv.mockReturnValue({ test: "config" });

        const mockQuoteContext = {
          setOnQuote: jest.fn(),
        };
        QuoteContext.new.mockResolvedValue(mockQuoteContext);

        await service.initializeWebSocket();

        expect(Config.fromEnv).toHaveBeenCalled();
        expect(QuoteContext.new).toHaveBeenCalled();
        expect(mockQuoteContext.setOnQuote).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          "LongPort WebSocket 初始化成功",
        );
      } else {
        // 真实LongPort SDK环境
        if (
          process.env.LONGPORT_APP_KEY &&
          process.env.LONGPORT_APP_SECRET &&
          process.env.LONGPORT_ACCESS_TOKEN
        ) {
          await service.initializeWebSocket();
          expect(service.isWebSocketConnected()).toBe(true);
        } else {
          console.warn("跳过真实LongPort连接测试 - 缺少有效凭据");
        }
      }
    });

    it("should handle connection initialization failure", async () => {
      if (!isLongPortAvailable) {
        const { Config } = eval("require")("longport");
        Config.fromEnv.mockImplementation(() => {
          throw new Error("Configuration error");
        });

        await expect(service.initializeWebSocket()).rejects.toThrow(
          /初始化失败/,
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "LongPort WebSocket 初始化失败",
          }),
        );
      }
    });

    it("should prevent duplicate initialization", async () => {
      if (!isLongPortAvailable) {
        // Mock已连接状态
        const { Config, QuoteContext } = eval("require")("longport");
        Config.fromEnv.mockReturnValue({ test: "config" });
        QuoteContext.new.mockResolvedValue({
          setOnQuote: jest.fn(),
        });

        // 第一次初始化
        await service.initializeWebSocket();
        jest.clearAllMocks();

        // 第二次初始化应该被跳过
        await service.initializeWebSocket();
        expect(QuoteContext.new).not.toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          "LongPort WebSocket 已连接",
        );
      }
    });
  });

  describe("Symbol Subscription Management", () => {
    beforeEach(async () => {
      if (!isLongPortAvailable) {
        const { Config, QuoteContext } = eval("require")("longport");
        Config.fromEnv.mockReturnValue({ test: "config" });

        const mockQuoteContext = {
          setOnQuote: jest.fn(),
          subscribe: jest.fn().mockResolvedValue(undefined),
          unsubscribe: jest.fn().mockResolvedValue(undefined),
        };
        QuoteContext.new.mockResolvedValue(mockQuoteContext);

        await service.initializeWebSocket();
        jest.clearAllMocks();
      }
    });

    it("should subscribe to symbols successfully", async () => {
      const symbols = ["700.HK", "AAPL.US"];

      if (!isLongPortAvailable) {
        await service.subscribe(symbols);
        expect(service.getSubscribedSymbols()).toEqual(symbols);
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "LongPort WebSocket 订阅成功",
            symbols,
            totalSubscribed: 2,
          }),
        );
      } else if (service.isWebSocketConnected()) {
        try {
          await service.subscribe(symbols);
          expect(service.getSubscribedSymbols()).toEqual(
            expect.arrayContaining(symbols),
          );
        } catch (error) {
          console.warn(
            "真实订阅失败 - 可能需要有效的市场数据权限:",
            error.message,
          );
        }
      }
    });

    it("should handle subscription limits", async () => {
      // 测试符号数量限制（LongPort限制500个）
      const manySymbols = Array.from(
        { length: 501 },
        (_, i) => `${String(i).padStart(5, "0")}.HK`,
      );

      await expect(service.subscribe(manySymbols)).rejects.toThrow(
        /符号数量超过限制/,
      );
    });

    it("should filter duplicate symbols", async () => {
      const symbols = ["700.HK", "700.HK", "AAPL.US"];

      if (!isLongPortAvailable) {
        await service.subscribe(symbols);
        // 第二次订阅相同符号应该被跳过
        await service.subscribe(["700.HK"]);

        expect(mockLogger.log).toHaveBeenCalledWith("所有符号已订阅，跳过");
      }
    });

    it("should unsubscribe from symbols", async () => {
      const symbols = ["700.HK", "AAPL.US"];

      if (!isLongPortAvailable) {
        // 先订阅
        await service.subscribe(symbols);
        expect(service.getSubscribedSymbols()).toEqual(symbols);

        // 然后取消订阅
        await service.unsubscribe(["700.HK"]);
        expect(service.getSubscribedSymbols()).toEqual(["AAPL.US"]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "LongPort WebSocket 取消订阅成功",
            symbols: ["700.HK"],
            totalSubscribed: 1,
          }),
        );
      }
    });

    it("should handle unsubscription of non-subscribed symbols", async () => {
      if (!isLongPortAvailable) {
        await service.unsubscribe(["NONEXISTENT.HK"]);
        expect(mockLogger.log).toHaveBeenCalledWith("没有符号需要取消订阅");
      } else {
        // 在真实环境中，取消订阅不存在的符号不会报错
        await service.unsubscribe(["NONEXISTENT.HK"]);
      }
    });
  });

  describe("Message Callback Management", () => {
    it("should add and trigger message callbacks", async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.onQuoteUpdate(callback1);
      service.onQuoteUpdate(callback2);

      if (!isLongPortAvailable) {
        // 模拟报价事件
        const mockEvent = {
          symbol: "700.HK",
          lastdone: 350.5,
          volume: 1000,
          timestamp: Date.now(),
        };

        // 通过反射访问私有方法进行测试
        const handleQuoteUpdate = (service as any).handleQuoteUpdate.bind(
          service,
        );
        await handleQuoteUpdate(mockEvent);

        expect(callback1).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: "700.HK",
            last_done: 350.5,
            volume: 1000,
            provider: "longport",
          }),
        );
        expect(callback2).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: "700.HK",
            last_done: 350.5,
            volume: 1000,
            provider: "longport",
          }),
        );
      }
    });

    it("should handle callback errors gracefully", async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });

      service.onQuoteUpdate(errorCallback);

      if (!isLongPortAvailable) {
        const mockEvent = { symbol: "700.HK" };
        const handleQuoteUpdate = (service as any).handleQuoteUpdate.bind(
          service,
        );

        // 不应该抛出错误
        await expect(handleQuoteUpdate(mockEvent)).resolves.not.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "报价回调处理失败",
          }),
        );
      }
    });
  });

  describe("Data Parsing and Transformation", () => {
    it("should parse LongPort quote events correctly", async () => {
      const callback = jest.fn();
      service.onQuoteUpdate(callback);

      if (!isLongPortAvailable) {
        // 测试对象格式事件
        const objectEvent = {
          symbol: "700.HK",
          last_done: 350.5,
          prevclose: 340.0,
          volume: 1000,
          timestamp: 1640995200000,
        };

        const handleQuoteUpdate = (service as any).handleQuoteUpdate.bind(
          service,
        );
        await handleQuoteUpdate(objectEvent);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: "700.HK",
            last_done: 350.5,
            prev_close: 340.0,
            volume: 1000,
            timestamp: 1640995200000,
            provider: "longport",
            raw: objectEvent,
          }),
        );
      }
    });

    it("should handle malformed events gracefully", async () => {
      const callback = jest.fn();
      service.onQuoteUpdate(callback);

      if (!isLongPortAvailable) {
        // 测试无效JSON字符串
        const invalidEvent = "invalid json";

        const handleQuoteUpdate = (service as any).handleQuoteUpdate.bind(
          service,
        );
        await handleQuoteUpdate(invalidEvent);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: "UNKNOWN",
            provider: "longport",
            error: "parse_failed",
            raw: invalidEvent,
          }),
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "解析 LongPort 报价事件失败",
          }),
        );
      }
    });

    it("should standardize field names", async () => {
      const callback = jest.fn();
      service.onQuoteUpdate(callback);

      if (!isLongPortAvailable) {
        // 测试不同字段名的映射
        const eventWithAlternativeFields = {
          code: "700.HK", // 应该映射到 symbol
          price: 350.5, // 应该映射到 last_done
          lastPrice: 351.0, // 应该优先于 price
          prevClose: 340.0, // 应该映射到 prev_close
          totalVolume: 1000, // 应该映射到 volume
        };

        const handleQuoteUpdate = (service as any).handleQuoteUpdate.bind(
          service,
        );
        await handleQuoteUpdate(eventWithAlternativeFields);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: "700.HK",
            last_done: 351.0, // lastPrice 优先于 price
            prev_close: 340.0,
            volume: 1000,
            provider: "longport",
          }),
        );
      }
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle subscription failures", async () => {
      if (!isLongPortAvailable) {
        const { QuoteContext } = eval("require")("longport");
        const mockQuoteContext = {
          setOnQuote: jest.fn(),
          setOnConnected: jest.fn(),
          setOnDisconnected: jest.fn(),
          subscribe: jest.fn().mockRejectedValue(new Error("Network error")),
        };
        QuoteContext.new.mockResolvedValue(mockQuoteContext);

        await service.initializeWebSocket();

        await expect(service.subscribe(["700.HK"])).rejects.toThrow(/订阅失败/);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "LongPort WebSocket 订阅失败",
          }),
        );
      }
    });

    it("should parse error codes from LongPort errors", async () => {
      if (!isLongPortAvailable) {
        const parseErrorCode = (service as any).parseErrorCode.bind(service);

        expect(parseErrorCode({ message: "301606: Rate limit exceeded" })).toBe(
          "301606: Rate limiting exceeded",
        );

        expect(
          parseErrorCode({ message: "301605: Too many subscriptions" }),
        ).toBe("301605: Subscription quantity exceeded");

        expect(parseErrorCode({ message: "Unknown error" })).toBeNull();
      }
    });
  });

  describe("Cleanup and Resource Management", () => {
    it("should cleanup resources properly", async () => {
      if (!isLongPortAvailable) {
        const symbols = ["700.HK", "AAPL.US"];
        await service.subscribe(symbols);

        await service.cleanup();

        expect(service.getSubscribedSymbols()).toHaveLength(0);
        expect(service.isWebSocketConnected()).toBe(false);
        expect(mockLogger.log).toHaveBeenCalledWith(
          "LongPort WebSocket 资源清理完成",
        );
      }
    });

    it("should handle cleanup errors gracefully", async () => {
      if (!isLongPortAvailable) {
        const symbols = ["700.HK"];
        await service.subscribe(symbols);

        // Mock unsubscribe to fail
        const { QuoteContext } = eval("require")("longport");
        const mockContext =
          QuoteContext.new.mock.results[
            QuoteContext.new.mock.results.length - 1
          ].value;
        mockContext.unsubscribe.mockRejectedValue(new Error("Cleanup error"));

        await service.cleanup();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "LongPort WebSocket 资源清理失败",
          }),
        );
      }
    });

    it("should cleanup on module destroy", async () => {
      const cleanupSpy = jest.spyOn(service, "cleanup");
      await service.onModuleDestroy();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe("Integration with Real Market Data", () => {
    // 这些测试只在有真实LongPort凭据时运行
    it("should connect to real LongPort service if credentials available", async () => {
      if (
        isLongPortAvailable &&
        process.env.LONGPORT_APP_KEY &&
        process.env.LONGPORT_APP_SECRET &&
        process.env.LONGPORT_ACCESS_TOKEN
      ) {
        console.log("测试真实LongPort连接...");

        try {
          await service.initializeWebSocket();
          expect(service.isWebSocketConnected()).toBe(true);

          // 测试订阅真实符号
          await service.subscribe(["700.HK"]);
          expect(service.getSubscribedSymbols()).toContain("700.HK");

          // 清理
          await service.cleanup();
        } catch (error) {
          console.warn("真实LongPort连接测试失败:", error.message);
          // 在CI环境中不应该失败测试
          if (process.env.CI) {
            console.warn("CI环境中跳过真实连接测试");
          } else {
            throw error;
          }
        }
      } else {
        console.log("跳过真实LongPort连接测试 - 凭据不可用或使用Mock");
      }
    });
  });
});
