/**
 * CapabilityRegistryService 单元测试
 * 测试能力发现、注册和Provider管理功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { CapabilityRegistryService } from "../../../../src/providers/capability-registry.service";
import * as fs from "fs/promises";

// Mock fs/promises
jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

// 正确模拟动态导入
const mockDynamicImport = jest.fn();
jest.mock("../../../../src/providers/capability-registry.service", () => {
  const originalModule = jest.requireActual(
    "../../../../src/providers/capability-registry.service",
  );
  return {
    __esModule: true,
    ...originalModule,
    CapabilityRegistryService: class extends originalModule.CapabilityRegistryService {
      async loadCapability(providerName: string, capabilityName: string) {
        // 使用原始实现但替换动态导入
        const logContext = {
          provider: providerName,
          capability: capabilityName,
        };
        try {
          // 使用模拟的动态导入
          const capabilityModule = await mockDynamicImport(
            providerName,
            capabilityName,
          );
          const camelCaseName = capabilityName.replace(/-(\w)/g, (_, c) =>
            c.toUpperCase(),
          );
          const capability =
            capabilityModule.default || capabilityModule[camelCaseName];

          if (capability && typeof capability.execute === "function") {
            this.registerCapability(providerName, capability, 1, true);
          } else {
            this.logger.warn(
              logContext,
              `能力 ${providerName}/${capabilityName} 格式不正确或未找到`,
            );
          }
        } catch (error) {
          this.logger.error(
            { ...logContext, error: error?.stack || String(error) },
            `无法加载能力 ${providerName}/${capabilityName}`,
          );
        }
      }
    },
  };
});

describe("CapabilityRegistryService", () => {
  let service: CapabilityRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    service = module.get<CapabilityRegistryService>(CapabilityRegistryService);

    // 清除所有模拟
    jest.clearAllMocks();
    mockDynamicImport.mockReset();
  });

  describe("discoverCapabilities", () => {
    it("应该排除 interfaces 目录", async () => {
      // Arrange - 模拟目录结构
      const mockDirents = [
        { name: "longport", isDirectory: () => true },
        { name: "longport-sg", isDirectory: () => true },
        { name: "interfaces", isDirectory: () => true }, // 应该被排除
        { name: "node_modules", isDirectory: () => true }, // 应该被排除
        { name: ".hidden", isDirectory: () => true }, // 应该被排除
        { name: "main-controller.ts", isDirectory: () => false },
      ];

      mockedFs.readdir.mockResolvedValue(mockDirents as any);

      // Mock stat 用于检查 capabilities 目录是否存在
      mockedFs.stat.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (
          pathStr.includes("longport/capabilities") ||
          pathStr.includes("longport-sg/capabilities")
        ) {
          return { isDirectory: () => true } as any;
        }
        throw new Error("Directory not found");
      });

      // Mock readdir for capabilities directories
      mockedFs.readdir.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes("capabilities")) {
          return ["get-stock-quote.ts", "get-stock-basic-info.ts"] as any;
        }
        return mockDirents as any;
      });

      // Spy on loadProviderCapabilities to verify it's only called for valid providers
      const loadProviderCapabilitiesSpy = jest.spyOn(
        service as any,
        "loadProviderCapabilities",
      );
      loadProviderCapabilitiesSpy.mockImplementation(async () => {});

      // Act
      await service.discoverCapabilities();

      // Assert - 验证只有有效的提供商目录被处理
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledTimes(2);
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledWith("longport");
      expect(loadProviderCapabilitiesSpy).toHaveBeenCalledWith("longport-sg");

      // 验证系统目录没有被处理
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith(
        "interfaces",
      );
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith(
        "node_modules",
      );
      expect(loadProviderCapabilitiesSpy).not.toHaveBeenCalledWith(".hidden");
    });

    it("应该正确处理空目录", async () => {
      // Arrange
      mockedFs.readdir.mockResolvedValue([]);

      // Act & Assert - 不应该抛出异常
      await expect(service.discoverCapabilities()).resolves.not.toThrow();
    });

    it("应该处理文件系统错误", async () => {
      // Arrange
      mockedFs.readdir.mockRejectedValue(new Error("Permission denied"));

      // Act & Assert - 不应该抛出异常
      await expect(service.discoverCapabilities()).resolves.not.toThrow();
    });
  });

  describe("registerCapability", () => {
    it("应该成功注册能力", () => {
      // Arrange
      const mockCapability = {
        name: "get-stock-quote",
        description: "Test capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      // Act
      service.registerCapability("test-provider", mockCapability, 1, true);

      // Assert
      const registeredCapability = service.getCapability(
        "test-provider",
        "get-stock-quote",
      );
      expect(registeredCapability).toBe(mockCapability);
    });
  });

  describe("getCapability", () => {
    it("应该返回已注册且启用的能力", () => {
      // Arrange
      const mockCapability = {
        name: "get-stock-quote",
        description: "Test capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      service.registerCapability("test-provider", mockCapability, 1, true);

      // Act
      const result = service.getCapability("test-provider", "get-stock-quote");

      // Assert
      expect(result).toBe(mockCapability);
    });

    it("应该对禁用的能力返回 null", () => {
      // Arrange
      const mockCapability = {
        name: "get-stock-quote",
        description: "Test capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      service.registerCapability("test-provider", mockCapability, 1, false);

      // Act
      const result = service.getCapability("test-provider", "get-stock-quote");

      // Assert
      expect(result).toBeNull();
    });

    it("应该对不存在的能力返回 null", () => {
      // Act
      const result = service.getCapability(
        "nonexistent-provider",
        "nonexistent-capability",
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getBestProvider", () => {
    it("应该返回最高优先级的提供商", () => {
      // Arrange
      const capability1 = {
        name: "get-stock-quote",
        description: "Test capability 1",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "get-stock-quote",
        description: "Test capability 2",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      service.registerCapability("provider1", capability1, 2, true);
      service.registerCapability("provider2", capability2, 1, true);

      // Act
      const result = service.getBestProvider("get-stock-quote", "HK");

      // Assert
      expect(result).toBe("provider2"); // 优先级更高（数字更小）
    });

    it("应该考虑市场支持", () => {
      // Arrange
      const capability1 = {
        name: "get-stock-quote",
        description: "Test capability 1",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["US_FORMAT"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "get-stock-quote",
        description: "Test capability 2",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      service.registerCapability("provider1", capability1, 1, true);
      service.registerCapability("provider2", capability2, 2, true);

      // Act
      const result = service.getBestProvider("get-stock-quote", "HK");

      // Assert
      expect(result).toBe("provider2"); // 只有 provider2 支持 HK 市场
    });

    it("应该对没有匹配的提供商返回 null", () => {
      // Act
      const result = service.getBestProvider("nonexistent-capability");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("loadCapability", () => {
    it("应该成功加载能力模块", async () => {
      // Arrange
      const mockCapability = {
        name: "get-stock-quote",
        description: "Mock capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      // 正确模拟动态导入
      mockDynamicImport.mockResolvedValueOnce({
        default: mockCapability,
      });

      const registerCapabilitySpy = jest.spyOn(service, "registerCapability");

      // Act
      await (service as any).loadCapability("test-provider", "get-stock-quote");

      // Assert
      expect(registerCapabilitySpy).toHaveBeenCalledWith(
        "test-provider",
        mockCapability,
        1,
        true,
      );
    });

    it("应该处理能力模块导入错误", async () => {
      // Arrange
      const mockError = new Error("Module not found");
      mockDynamicImport.mockRejectedValueOnce(mockError);

      const loggerErrorSpy = jest.spyOn((service as any).logger, "error");
      loggerErrorSpy.mockImplementation(() => {});

      // Act & Assert - 不应该抛出异常
      await expect(
        (service as any).loadCapability("test-provider", "invalid-capability"),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it("应该处理无效的能力模块格式", async () => {
      // Arrange - 模块存在但格式不正确
      const invalidModule = {
        someOtherExport: "not a capability",
      };

      mockDynamicImport.mockResolvedValueOnce(invalidModule);

      const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
      const registerCapabilitySpy = jest.spyOn(service, "registerCapability");

      // Act
      await (service as any).loadCapability("test-provider", "invalid-format");

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(registerCapabilitySpy).not.toHaveBeenCalled();
    });

    it("应该支持camelCase导出的能力模块", async () => {
      // Arrange
      const mockCapability = {
        name: "get-stock-quote",
        description: "Mock capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      mockDynamicImport.mockResolvedValueOnce({
        getStockQuote: mockCapability, // camelCase export
      });

      const registerCapabilitySpy = jest.spyOn(service, "registerCapability");

      // Act
      await (service as any).loadCapability("test-provider", "get-stock-quote");

      // Assert
      expect(registerCapabilitySpy).toHaveBeenCalledWith(
        "test-provider",
        mockCapability,
        1,
        true,
      );
    });
  });

  describe("directoryExists", () => {
    it("应该检测到存在的目录", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs/promises");
      fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });

      // Act
      const result = await (service as any).directoryExists("/existing/path");

      // Assert
      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith("/existing/path");
    });

    it("应该检测到不存在的目录", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs/promises");
      fs.stat = jest.fn().mockRejectedValue(new Error("ENOENT"));

      // Act
      const result = await (service as any).directoryExists(
        "/nonexistent/path",
      );

      // Assert
      expect(result).toBe(false);
    });

    it("应该检测到文件（非目录）", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs/promises");
      fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => false });

      // Act
      const result = await (service as any).directoryExists("/path/to/file");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Provider Management", () => {
    describe("registerProvider", () => {
      it("应该成功注册Provider实例", () => {
        // Arrange
        const mockProvider = {
          name: "test-provider",
          description: "Test Provider",
          initialize: jest.fn(),
          testConnection: jest.fn(),
        };

        const loggerLogSpy = jest.spyOn((service as any).logger, "log");
        loggerLogSpy.mockImplementation(() => {});

        // Act
        service.registerProvider(mockProvider);

        // Assert
        expect(loggerLogSpy).toHaveBeenCalledWith(
          "Provider实例注册成功: test-provider",
        );
        expect(service.isProviderRegistered("test-provider")).toBe(true);
      });

      it("应该拒绝注册无效的Provider实例", () => {
        // Arrange
        const invalidProvider = null;

        const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
        loggerWarnSpy.mockImplementation(() => {});

        // Act
        service.registerProvider(invalidProvider);

        // Assert
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          "尝试注册无效的Provider实例",
        );
      });

      it("应该拒绝注册没有name的Provider", () => {
        // Arrange
        const providerWithoutName = {
          description: "Provider without name",
        };

        const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
        loggerWarnSpy.mockImplementation(() => {});

        // Act
        service.registerProvider(providerWithoutName);

        // Assert
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          "尝试注册无效的Provider实例",
        );
      });
    });

    describe("getProvider", () => {
      it("应该返回已注册的Provider实例", () => {
        // Arrange
        const mockProvider = {
          name: "test-provider",
          description: "Test Provider",
        };
        service.registerProvider(mockProvider);

        // Act
        const result = service.getProvider("test-provider");

        // Assert
        expect(result).toBe(mockProvider);
      });

      it("应该对不存在的Provider返回null并记录日志", () => {
        // Arrange
        const loggerDebugSpy = jest.spyOn((service as any).logger, "debug");
        loggerDebugSpy.mockImplementation(() => {});

        // Act
        const result = service.getProvider("nonexistent-provider");

        // Assert
        expect(result).toBeNull();
        expect(loggerDebugSpy).toHaveBeenCalledWith(
          "未找到Provider实例: nonexistent-provider",
        );
      });
    });

    describe("getAllProviders", () => {
      it("应该返回所有已注册的Provider实例", () => {
        // Arrange
        const provider1 = { name: "provider1" };
        const provider2 = { name: "provider2" };
        service.registerProvider(provider1);
        service.registerProvider(provider2);

        // Act
        const result = service.getAllProviders();

        // Assert
        expect(result.size).toBe(2);
        expect(result.get("provider1")).toBe(provider1);
        expect(result.get("provider2")).toBe(provider2);

        // 验证返回的是新Map实例（不是原始内部Map的引用）
        result.clear();
        expect(service.getAllProviders().size).toBe(2);
      });

      it("应该返回空Map当没有注册Provider时", () => {
        // Act
        const result = service.getAllProviders();

        // Assert
        expect(result.size).toBe(0);
        expect(result instanceof Map).toBe(true);
      });
    });

    describe("isProviderRegistered", () => {
      it("应该正确检测已注册的Provider", () => {
        // Arrange
        const mockProvider = { name: "test-provider" };
        service.registerProvider(mockProvider);

        // Act & Assert
        expect(service.isProviderRegistered("test-provider")).toBe(true);
        expect(service.isProviderRegistered("nonexistent-provider")).toBe(
          false,
        );
      });
    });
  });

  describe("getAllCapabilities", () => {
    it("应该返回所有注册的能力", () => {
      // Arrange
      const capability1 = {
        name: "capability1",
        description: "Test capability 1",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "capability2",
        description: "Test capability 2",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["US_FORMAT"],
        execute: jest.fn(),
      };

      service.registerCapability("provider1", capability1, 1, true);
      service.registerCapability("provider2", capability2, 1, true);

      // Act
      const result = service.getAllCapabilities();

      // Assert
      expect(result.size).toBe(2);
      expect(result.has("provider1")).toBe(true);
      expect(result.has("provider2")).toBe(true);
      expect(result.get("provider1")!.get("capability1")!.capability).toBe(
        capability1,
      );
      expect(result.get("provider2")!.get("capability2")!.capability).toBe(
        capability2,
      );
    });

    it("应该返回空Map当没有注册能力时", () => {
      // Act
      const result = service.getAllCapabilities();

      // Assert
      expect(result.size).toBe(0);
      expect(result instanceof Map).toBe(true);
    });
  });

  describe("getTotalCapabilitiesCount", () => {
    it("应该正确计算总能力数量", () => {
      // Arrange
      const capability1 = {
        name: "capability1",
        description: "Test",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "capability2",
        description: "Test",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };
      const capability3 = {
        name: "capability3",
        description: "Test",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["US_FORMAT"],
        execute: jest.fn(),
      };

      service.registerCapability("provider1", capability1, 1, true);
      service.registerCapability("provider1", capability2, 1, true);
      service.registerCapability("provider2", capability3, 1, true);

      // Act
      const result = (service as any).getTotalCapabilitiesCount();

      // Assert
      expect(result).toBe(3);
    });

    it("应该返回0当没有能力时", () => {
      // Act
      const result = (service as any).getTotalCapabilitiesCount();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe("loadProviderCapabilities", () => {
    it("应该处理缺少capabilities目录的提供商", async () => {
      // Arrange
      mockedFs.stat.mockRejectedValue(new Error("Directory not found"));

      const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
      loggerWarnSpy.mockImplementation(() => {});

      // Act
      await (service as any).loadProviderCapabilities(
        "provider-without-capabilities",
      );

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith({
        message:
          "提供商 provider-without-capabilities 缺少 'capabilities' 目录",
        provider: "provider-without-capabilities",
      });
    });

    it("应该成功加载提供商的所有能力文件", async () => {
      // Arrange
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockedFs.readdir.mockResolvedValue([
        "get-stock-quote.ts",
        "get-stock-info.ts",
        "README.md",
      ] as any);

      const loadCapabilitySpy = jest.spyOn(service as any, "loadCapability");
      loadCapabilitySpy.mockImplementation(async () => {});

      const loggerLogSpy = jest.spyOn((service as any).logger, "log");
      loggerLogSpy.mockImplementation(() => {});

      // Act
      await (service as any).loadProviderCapabilities("test-provider");

      // Assert
      expect(loadCapabilitySpy).toHaveBeenCalledTimes(2); // 只加载.ts文件
      expect(loadCapabilitySpy).toHaveBeenCalledWith(
        "test-provider",
        "get-stock-quote",
      );
      expect(loadCapabilitySpy).toHaveBeenCalledWith(
        "test-provider",
        "get-stock-info",
      );
      expect(loadCapabilitySpy).not.toHaveBeenCalledWith(
        "test-provider",
        "README",
      ); // 不加载非.ts文件

      expect(loggerLogSpy).toHaveBeenCalledWith({
        message: "已加载提供商 test-provider 的能力",
        provider: "test-provider",
        count: 2,
      });
    });

    it("应该处理loadProviderCapabilities过程中的错误", async () => {
      // Arrange
      mockedFs.stat.mockRejectedValue(new Error("Permission denied"));

      const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
      loggerWarnSpy.mockImplementation(() => {});

      // Act
      await (service as any).loadProviderCapabilities("error-provider");

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `提供商 error-provider 缺少 'capabilities' 目录`,
          provider: "error-provider",
        }),
      );
    });

    it("应该处理readdir失败的情况", async () => {
      // Arrange
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockedFs.readdir.mockRejectedValue(new Error("Read permission denied"));

      const loggerErrorSpy = jest.spyOn((service as any).logger, "error");
      loggerErrorSpy.mockImplementation(() => {});

      // Act
      await (service as any).loadProviderCapabilities("failing-provider");

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        { error: expect.any(String), provider: "failing-provider" },
        "无法加载提供商 failing-provider 的能力",
      );
    });
  });

  describe("getBestProvider edge cases", () => {
    it("应该在没有指定市场时返回最优提供商", () => {
      // Arrange
      const capability1 = {
        name: "get-stock-quote",
        description: "Provider 1 capability",
        supportedMarkets: ["HK", "US"],
        supportedSymbolFormats: ["FORMAT1"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "get-stock-quote",
        description: "Provider 2 capability",
        supportedMarkets: ["CN"],
        supportedSymbolFormats: ["FORMAT2"],
        execute: jest.fn(),
      };

      service.registerCapability("provider1", capability1, 2, true);
      service.registerCapability("provider2", capability2, 1, true);

      // Act - 不指定市场
      const result = service.getBestProvider("get-stock-quote");

      // Assert
      expect(result).toBe("provider2"); // 优先级更高
    });

    it("应该正确处理禁用的提供商", () => {
      // Arrange
      const capability1 = {
        name: "get-stock-quote",
        description: "Disabled capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["FORMAT1"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "get-stock-quote",
        description: "Enabled capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["FORMAT2"],
        execute: jest.fn(),
      };

      service.registerCapability("disabled-provider", capability1, 1, false); // 禁用
      service.registerCapability("enabled-provider", capability2, 2, true); // 启用

      // Act
      const result = service.getBestProvider("get-stock-quote", "HK");

      // Assert
      expect(result).toBe("enabled-provider"); // 跳过禁用的提供商
    });

    it("应该正确排序多个候选提供商", () => {
      // Arrange
      const capabilities = [
        { name: "provider-low", priority: 5 },
        { name: "provider-high", priority: 1 },
        { name: "provider-medium", priority: 3 },
      ];

      capabilities.forEach(({ name, priority }) => {
        const capability = {
          name: "get-stock-quote",
          description: `${name} capability`,
          supportedMarkets: ["HK"],
          supportedSymbolFormats: ["FORMAT"],
          execute: jest.fn(),
        };
        service.registerCapability(name, capability, priority, true);
      });

      // Act
      const result = service.getBestProvider("get-stock-quote", "HK");

      // Assert
      expect(result).toBe("provider-high"); // 优先级1最高
    });
  });

  describe("registerCapability edge cases", () => {
    it("应该能覆盖同一提供商的同名能力", () => {
      // Arrange
      const capability1 = {
        name: "get-stock-quote",
        description: "Original capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["FORMAT1"],
        execute: jest.fn(),
      };
      const capability2 = {
        name: "get-stock-quote",
        description: "Updated capability",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["FORMAT2"],
        execute: jest.fn(),
      };

      // Act
      service.registerCapability("test-provider", capability1, 1, true);
      service.registerCapability("test-provider", capability2, 2, false);

      // Assert
      const result = service.getCapability("test-provider", "get-stock-quote");
      expect(result).toBeNull(); // 因为第二次注册时isEnabled=false

      const allCapabilities = service.getAllCapabilities();
      const providerCapabilities = allCapabilities.get("test-provider");
      expect(providerCapabilities?.size).toBe(1); // 覆盖了原来的能力
      expect(providerCapabilities?.get("get-stock-quote")?.capability).toBe(
        capability2,
      );
    });
  });

  describe("onModuleInit", () => {
    it("应该在模块初始化时调用discoverCapabilities", async () => {
      // Arrange
      const discoverCapabilitiesSpy = jest.spyOn(
        service,
        "discoverCapabilities",
      );
      discoverCapabilitiesSpy.mockImplementation(async () => {});

      // Act
      await service.onModuleInit();

      // Assert
      expect(discoverCapabilitiesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("complex integration scenarios", () => {
    it("应该处理完整的能力发现和注册流程", async () => {
      // Arrange
      const mockDirents = [
        { name: "longport", isDirectory: () => true },
        { name: "test-provider", isDirectory: () => true },
      ];

      mockedFs.readdir.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes("capabilities")) {
          return ["get-stock-quote.ts", "get-market-info.ts"] as any;
        }
        return mockDirents as any;
      });

      mockedFs.stat.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes("capabilities")) {
          return { isDirectory: () => true } as any;
        }
        throw new Error("Directory not found");
      });

      const mockCapability1 = {
        name: "get-stock-quote",
        description: "Stock quote capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      const mockCapability2 = {
        name: "get-market-info",
        description: "Market info capability",
        supportedMarkets: ["HK", "US"],
        supportedSymbolFormats: ["HK_FORMAT", "US_FORMAT"],
        execute: jest.fn(),
      };

      mockDynamicImport.mockImplementation(
        async (providerName: string, capabilityName: string) => {
          if (capabilityName === "get-stock-quote") {
            return { default: mockCapability1 };
          } else if (capabilityName === "get-market-info") {
            return { getMarketInfo: mockCapability2 }; // camelCase export
          }
          throw new Error("Module not found");
        },
      );

      // Act
      await service.discoverCapabilities();

      // Assert
      const allCapabilities = service.getAllCapabilities();
      expect(allCapabilities.size).toBe(2); // longport 和 test-provider

      // 验证能力被正确注册
      expect(service.getCapability("longport", "get-stock-quote")).toBe(
        mockCapability1,
      );
      expect(service.getCapability("longport", "get-market-info")).toBe(
        mockCapability2,
      );
      expect(service.getCapability("test-provider", "get-stock-quote")).toBe(
        mockCapability1,
      );
      expect(service.getCapability("test-provider", "get-market-info")).toBe(
        mockCapability2,
      );

      // 验证getBestProvider工作正常
      expect(service.getBestProvider("get-stock-quote", "HK")).toBe("longport"); // 第一个注册的
      expect(service.getBestProvider("get-market-info", "US")).toBe("longport");
    });

    it("应该正确处理混合的成功和失败场景", async () => {
      // Arrange
      const mockDirents = [
        { name: "working-provider", isDirectory: () => true },
        { name: "failing-provider", isDirectory: () => true },
      ];

      mockedFs.readdir.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes("working-provider/capabilities")) {
          return ["working-capability.ts"] as any;
        } else if (pathStr.includes("failing-provider/capabilities")) {
          return ["failing-capability.ts"] as any;
        }
        return mockDirents as any;
      });

      mockedFs.stat.mockImplementation(async (dirPath: string) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes("capabilities")) {
          return { isDirectory: () => true } as any;
        }
        throw new Error("Directory not found");
      });

      const workingCapability = {
        name: "working-capability",
        description: "Working capability",
        supportedMarkets: ["HK"],
        supportedSymbolFormats: ["HK_FORMAT"],
        execute: jest.fn(),
      };

      mockDynamicImport.mockImplementation(async (providerName: string) => {
        if (providerName === "working-provider") {
          return { default: workingCapability };
        } else {
          throw new Error("Module load failed");
        }
      });

      const loggerErrorSpy = jest.spyOn((service as any).logger, "error");
      loggerErrorSpy.mockImplementation(() => {});

      // Act
      await service.discoverCapabilities();

      // Assert
      // 成功的提供商应该被正确注册
      expect(
        service.getCapability("working-provider", "working-capability"),
      ).toBe(workingCapability);

      // 失败的提供商不应该有能力被注册
      expect(
        service.getCapability("failing-provider", "failing-capability"),
      ).toBeNull();

      // 应该记录错误
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "failing-provider",
          capability: "failing-capability",
        }),
        "无法加载能力 failing-provider/failing-capability",
      );

      // 总体统计应该正确
      expect((service as any).getTotalCapabilitiesCount()).toBe(1);
    });
  });
});
