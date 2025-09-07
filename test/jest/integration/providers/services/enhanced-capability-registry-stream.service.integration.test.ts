/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { ModuleMetadata } from "@nestjs/common";
import { createLogger } from "@app/config/logger.config";
import { MARKETS } from "@common/constants/market.constants";

// 导入测试目标服务
import { EnhancedCapabilityRegistryService } from "../../../../../src/providers/services/enhanced-capability-registry.service";
import { CapabilityRegistryService } from "../../../../../src/providers/services/capability-registry.service";
import {
  IStreamCapability,
  StreamDataCallbackParams,
} from "../../../../../src/providers/interfaces/stream-capability.interface";
import { ProvidersModule } from "../../../../../src/providers/module/providers-sg.module";
import { AppModule } from "../../../../../src/app.module";

// Mock logger
jest.mock("@app/config/logger.config");
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock fs/promises
jest.mock("fs/promises", () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

import { readdir, stat } from "fs/promises";

// Mock stream capability
const mockStreamCapability: IStreamCapability = {
  name: "stream-stock-quote",
  description: "获取股票实时报价数据流",
  supportedMarkets: [MARKETS.HK, MARKETS.US],
  supportedSymbolFormats: ["700.HK", "AAPL.US"],
  rateLimit: {
    maxConnections: 100,
    maxSubscriptionsPerConnection: 200,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
  },
  initialize: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  onMessage: jest.fn(),
  cleanup: jest.fn(),
  isConnected: jest.fn(),
};

describe("EnhancedCapabilityRegistryService - Stream Capabilities Integration", () => {
  let enhancedService: EnhancedCapabilityRegistryService;
  let legacyService: CapabilityRegistryService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    // 配置测试模块
    const moduleMetadata: ModuleMetadata = {
      imports: [],
      providers: [EnhancedCapabilityRegistryService, CapabilityRegistryService],
    };

    // 创建测试模块
    moduleRef = await Test.createTestingModule(moduleMetadata).compile();

    // 获取服务实例
    enhancedService = moduleRef.get<EnhancedCapabilityRegistryService>(
      EnhancedCapabilityRegistryService,
    );
    legacyService = moduleRef.get<CapabilityRegistryService>(
      CapabilityRegistryService,
    );

    // 设置文件系统操作的模拟返回
    (readdir as jest.Mock).mockResolvedValue([]);
    (stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });

    // 初始化服务
    await enhancedService.onModuleInit();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // 清空之前测试注册的所有流能力提供商
    const streamCapabilitiesMap = legacyService.getAllStreamCapabilities();
    streamCapabilitiesMap.clear();
  });

  describe("Stream Capability Registration", () => {
    it("should register stream capability correctly", async () => {
      // 执行
      // 注册流能力（模拟装饰器或手动注册）
      legacyService.registerStreamCapability(
        "longport",
        mockStreamCapability,
        1,
        true,
      );

      // 验证
      const capability = legacyService.getStreamCapability(
        "longport",
        "stream-stock-quote",
      );
      expect(capability).toBe(mockStreamCapability);
    });

    it("should handle multiple stream capabilities for same provider", async () => {
      // 设置
      const capability1 = {
        ...mockStreamCapability,
        name: "stream-stock-quote",
      };
      const capability2 = {
        ...mockStreamCapability,
        name: "stream-index-quote",
      };

      // 执行
      legacyService.registerStreamCapability("longport", capability1, 1, true);
      legacyService.registerStreamCapability("longport", capability2, 2, true);

      // 验证
      expect(
        legacyService.getStreamCapability("longport", "stream-stock-quote"),
      ).toBe(capability1);
      expect(
        legacyService.getStreamCapability("longport", "stream-index-quote"),
      ).toBe(capability2);
    });
  });

  describe("Stream Capability Discovery", () => {
    it("should find best provider for a stream capability", async () => {
      // 设置
      legacyService.registerStreamCapability(
        "longport",
        mockStreamCapability,
        2,
        true,
      );
      legacyService.registerStreamCapability(
        "longport-sg",
        { ...mockStreamCapability },
        1,
        true,
      );

      // 执行
      const bestProvider =
        legacyService.getBestStreamProvider("stream-stock-quote");

      // 验证
      expect(bestProvider).toBe("longport-sg"); // 优先级更高（数字更小）
    });

    it("should filter providers by market support", async () => {
      // 设置
      const hkCapability = {
        ...mockStreamCapability,
        supportedMarkets: [MARKETS.HK],
      };
      const usCapability = {
        ...mockStreamCapability,
        supportedMarkets: [MARKETS.US],
      };

      legacyService.registerStreamCapability(
        "hk-provider",
        hkCapability,
        1,
        true,
      );
      legacyService.registerStreamCapability(
        "us-provider",
        usCapability,
        2,
        true,
      );

      // 执行
      const hkProvider = legacyService.getBestStreamProvider(
        "stream-stock-quote",
        MARKETS.HK,
      );
      const usProvider = legacyService.getBestStreamProvider(
        "stream-stock-quote",
        MARKETS.US,
      );

      // 验证
      expect(hkProvider).toBe("hk-provider"); // 只有hk-provider支持HK市场
      expect(usProvider).toBe("us-provider"); // 只有us-provider支持US市场
    });
  });

  describe("Stream Capability Status Management", () => {
    it("should update and track stream capability status", async () => {
      // 设置
      legacyService.registerStreamCapability(
        "longport",
        mockStreamCapability,
        1,
        true,
      );

      // 执行 - 连接成功
      legacyService.updateStreamCapabilityStatus(
        "longport",
        "stream-stock-quote",
        "connected",
      );

      // 验证
      const capabilities = legacyService.getAllStreamCapabilities();
      const registration = capabilities
        .get("longport")
        ?.get("stream-stock-quote");
      expect(registration?.connectionStatus).toBe("connected");
      expect(registration?.errorCount).toBe(0);
    });

    it("should track error counts and reset on successful connection", async () => {
      // 设置
      legacyService.registerStreamCapability(
        "longport",
        mockStreamCapability,
        1,
        true,
      );

      // 执行 - 发生错误
      legacyService.updateStreamCapabilityStatus(
        "longport",
        "stream-stock-quote",
        "error",
      );
      legacyService.updateStreamCapabilityStatus(
        "longport",
        "stream-stock-quote",
        "error",
      );

      // 验证
      let capabilities = legacyService.getAllStreamCapabilities();
      let registration = capabilities
        .get("longport")
        ?.get("stream-stock-quote");
      expect(registration?.connectionStatus).toBe("error");
      expect(registration?.errorCount).toBe(2);

      // 执行 - 成功连接
      legacyService.updateStreamCapabilityStatus(
        "longport",
        "stream-stock-quote",
        "connected",
      );

      // 验证
      capabilities = legacyService.getAllStreamCapabilities();
      registration = capabilities.get("longport")?.get("stream-stock-quote");
      expect(registration?.connectionStatus).toBe("connected");
      expect(registration?.errorCount).toBe(0); // 错误计数被重置
    });
  });

  describe("Enhanced Stream Capability Registry", () => {
    it("should be initialized with empty registry", () => {
      // 验证
      const stats = enhancedService.getStats();
      expect(stats).not.toBeNull();
      expect(stats?.streamCapabilities).toBe(0);
    });

    it("should register stream capabilities from decorator data", async () => {
      // 由于我们在beforeAll中已经调用了onModuleInit，这里我们检查结果
      const stats = enhancedService.getStats();
      expect(stats).not.toBeNull();

      // 当前测试环境下应该是0，因为我们模拟了文件系统返回空数组
      expect(stats?.decoratorCapabilities).toBe(0);
    });
  });
});
