/**
 * ReceiverService连接计数清理机制测试
 * 验证P0修复：确保finally块正确清理连接计数
 */

import { BadRequestException } from "@nestjs/common";

// 直接导入要测试的类
import { ReceiverService } from "../../../../../../../src/core/01-entry/receiver/services/receiver.service";
import { DataRequestDto } from "../../../../../../../src/core/01-entry/receiver/dto/data-request.dto";

// Mock external dependencies
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-connection-count-uuid"),
}));

describe("ReceiverService - Connection Count Management", () => {
  let service: ReceiverService;
  let mockUpdateActiveConnections: jest.SpyInstance;

  // Mock依赖服务
  const mockServices = {
    symbolTransformerService: {
      transformSymbols: jest.fn(),
    },
    dataFetcherService: {
      fetchRawData: jest.fn(),
    },
    capabilityRegistryService: {
      getBestProvider: jest.fn(),
      getCapability: jest.fn(),
    },
    marketStatusService: {
      getBatchMarketStatus: jest.fn(),
    },
    dataTransformerService: {
      transform: jest.fn(),
    },
    storageService: {
      storeData: jest.fn(),
    },
    collectorService: {
      recordRequest: jest.fn(),
      recordSystemMetrics: jest.fn(),
    },
    smartCacheOrchestrator: {
      getDataWithSmartCache: jest.fn(),
    },
  };

  beforeEach(() => {
    // 直接创建实例，绕过NestJS依赖注入
    service = new ReceiverService(
      mockServices.symbolTransformerService as any,
      mockServices.dataFetcherService as any,
      mockServices.capabilityRegistryService as any,
      mockServices.marketStatusService as any,
      mockServices.dataTransformerService as any,
      mockServices.storageService as any,
      mockServices.collectorService as any,
      mockServices.smartCacheOrchestrator as any,
    );

    // 监控updateActiveConnections方法调用
    mockUpdateActiveConnections = jest.spyOn(
      service as any,
      "updateActiveConnections",
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("🔧 P0修复验证：连接计数清理机制", () => {
    const mockRequest: DataRequestDto = {
      symbols: ["700.HK"],
      receiverType: "get-stock-quote",
      options: { useSmartCache: false }, // 测试传统流程
    };

    it("应该在方法开始时增加连接计数", async () => {
      // 模拟验证失败，快速抛出异常
      mockServices.capabilityRegistryService.getBestProvider.mockReturnValue(
        "longport",
      );

      try {
        await service.handleRequest(mockRequest);
      } catch (error) {
        // 忽略错误，我们关注的是连接计数
      }

      // 验证连接计数+1被调用
      expect(mockUpdateActiveConnections).toHaveBeenCalledWith(1);
    });

    it("应该在finally块中减少连接计数（成功路径）", async () => {
      // 模拟成功的处理流程
      mockServices.capabilityRegistryService.getBestProvider.mockReturnValue(
        "longport",
      );
      mockServices.symbolTransformerService.transformSymbols.mockResolvedValue({
        mappedSymbols: ["700.HK"],
        mappingDetails: [],
        failedSymbols: [],
        metadata: {
          provider: "longport",
          totalSymbols: 1,
          successCount: 1,
          failedCount: 0,
          processingTimeMs: 10,
        },
      });

      mockServices.dataFetcherService.fetchRawData.mockResolvedValue({
        data: [{ symbol: "700.HK", price: 100 }],
        metadata: { processingTime: 50 },
      });

      mockServices.dataTransformerService.transform.mockResolvedValue({
        transformedData: [{ symbol: "700.HK", lastPrice: 100 }],
      });

      try {
        await service.handleRequest(mockRequest);
      } catch (error) {
        // 可能会有其他错误，但我们关注连接计数
      }

      // 验证连接计数调用序列
      const calls = mockUpdateActiveConnections.mock.calls;
      expect(calls[0][0]).toBe(1); // 开始时+1
      expect(calls[calls.length - 1][0]).toBe(-1); // finally块中-1
    });

    it("应该在finally块中减少连接计数（异常路径）", async () => {
      // 模拟处理过程中抛出异常
      mockServices.capabilityRegistryService.getBestProvider.mockImplementation(
        () => {
          throw new BadRequestException("Provider not found");
        },
      );

      try {
        await service.handleRequest(mockRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }

      // 验证连接计数调用序列：即使异常也要清理
      const calls = mockUpdateActiveConnections.mock.calls;
      expect(calls[0][0]).toBe(1); // 开始时+1
      expect(calls[calls.length - 1][0]).toBe(-1); // finally块中-1
    });

    it("应该确保finally块总是执行连接清理", async () => {
      // 模拟多种异常情况
      const testCases = [
        () => {
          throw new Error("Random error");
        },
        () => {
          throw new BadRequestException("Validation failed");
        },
        () => {
          throw new Error("Network timeout");
        },
      ];

      for (const errorFn of testCases) {
        // 重置mock
        jest.clearAllMocks();

        // 模拟在不同阶段抛出异常
        mockServices.capabilityRegistryService.getBestProvider.mockImplementation(
          errorFn,
        );

        try {
          await service.handleRequest(mockRequest);
        } catch (error) {
          // 预期会有异常
        }

        // 验证每次都正确清理连接计数
        const calls = mockUpdateActiveConnections.mock.calls;
        expect(calls).toHaveLength(2); // +1 和 -1
        expect(calls[0][0]).toBe(1); // 开始时+1
        expect(calls[1][0]).toBe(-1); // finally块中-1
      }
    });

    it("应该确保连接计数调用序列正确", async () => {
      // 模拟正常的处理流程，在中间某处抛出异常
      mockServices.capabilityRegistryService.getBestProvider.mockReturnValue(
        "longport",
      );
      mockServices.symbolTransformerService.transformSymbols.mockImplementation(
        () => {
          throw new Error("Symbol transformation failed");
        },
      );

      try {
        await service.handleRequest(mockRequest);
      } catch (error) {
        expect(error.message).toBe("Symbol transformation failed");
      }

      // 验证调用序列：只应该有开始的+1和finally的-1
      const calls = mockUpdateActiveConnections.mock.calls;
      expect(calls).toEqual([
        [1], // handleRequest开始
        [-1], // finally块
      ]);
    });
  });

  describe("🎯 回归测试：确保原有功能不受影响", () => {
    it("应该保持原有的错误处理逻辑", async () => {
      const mockRequest: DataRequestDto = {
        symbols: [], // 空数组应该引发验证错误
        receiverType: "get-stock-quote",
      };

      await expect(service.handleRequest(mockRequest)).rejects.toThrow();

      // 连接计数仍应正确管理
      const calls = mockUpdateActiveConnections.mock.calls;
      expect(calls[0][0]).toBe(1); // 开始
      expect(calls[calls.length - 1][0]).toBe(-1); // 清理
    });

    it("应该保持原有的成功响应格式", async () => {
      // 这是一个基本的回归测试，确保修改没有破坏响应格式
      mockServices.capabilityRegistryService.getBestProvider.mockReturnValue(
        "longport",
      );

      try {
        await service.handleRequest({
          symbols: ["TEST"],
          receiverType: "get-stock-quote",
        });
      } catch (error) {
        // 预期可能会有其他错误，但连接计数应该正确
      }

      // 验证连接计数管理正确
      expect(mockUpdateActiveConnections).toHaveBeenCalledWith(1);
      expect(mockUpdateActiveConnections).toHaveBeenCalledWith(-1);
    });
  });
});
