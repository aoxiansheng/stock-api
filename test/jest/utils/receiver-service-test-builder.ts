import { REFERENCE_DATA } from '@common/constants/domain';
/**
 * ReceiverService测试工具类
 * 简化单元测试的依赖注入复杂度
 */

import { ReceiverService } from "../../../src/core/01-entry/receiver/services/receiver.service";

// 定义依赖类型
export interface ReceiverServiceDeps {
  symbolTransformerService?: any;
  dataFetcherService?: any;
  capabilityRegistryService?: any;
  marketStatusService?: any;
  dataTransformerService?: any;
  storageService?: any;
  collectorService?: any;
  smartCacheOrchestrator?: any;
}

/**
 * ReceiverService测试构建器
 * 提供便捷的实例创建和mock管理
 */
export class ReceiverServiceTestBuilder {
  /**
   * 创建具有默认mock的ReceiverService实例
   *
   * @param overrides 覆盖特定依赖的mock实现
   * @returns ReceiverService实例
   */
  static createWithDefaults(
    overrides: Partial<ReceiverServiceDeps> = {},
  ): ReceiverService {
    const defaultMocks = ReceiverServiceTestBuilder.createDefaultMocks();

    const finalDeps = {
      ...defaultMocks,
      ...overrides,
    };

    return new ReceiverService(
      finalDeps.symbolTransformerService,
      finalDeps.dataFetcherService,
      finalDeps.capabilityRegistryService,
      finalDeps.marketStatusService,
      finalDeps.dataTransformerService,
      finalDeps.storageService,
      finalDeps.collectorService,
      finalDeps.smartCacheOrchestrator,
    );
  }

  /**
   * 创建默认的mock实现
   */
  private static createDefaultMocks(): ReceiverServiceDeps {
    return {
      symbolTransformerService: {
        transformSymbols: jest.fn().mockResolvedValue({
          mappedSymbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
          mappingDetails: [],
          failedSymbols: [],
          metadata: {
            provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            totalSymbols: 1,
            successCount: 1,
            failedCount: 0,
            processingTimeMs: 10,
          },
        }),
      },

      dataFetcherService: {
        fetchRawData: jest.fn().mockResolvedValue({
          data: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, price: 100 }],
          metadata: { processingTime: 50 },
        }),
      },

      capabilityRegistryService: {
        getBestProvider: jest.fn().mockReturnValue(REFERENCE_DATA.PROVIDER_IDS.LONGPORT),
        getCapability: jest.fn().mockReturnValue({
          supportedMarkets: ["HK", "US"],
        }),
        getProvider: jest.fn(),
      },

      marketStatusService: {
        getBatchMarketStatus: jest.fn().mockResolvedValue({
          HK: { isOpen: true, nextOpen: null, nextClose: null },
        }),
      },

      dataTransformerService: {
        transform: jest.fn().mockResolvedValue({
          transformedData: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, lastPrice: 100 }],
        }),
      },

      storageService: {
        storeData: jest.fn().mockResolvedValue(undefined),
      },

      collectorService: {
        recordRequest: jest.fn(),
        recordSystemMetrics: jest.fn(),
      },

      smartCacheOrchestrator: {
        getDataWithSmartCache: jest.fn().mockResolvedValue({
          data: [{ symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, lastPrice: 100 }],
          fromCache: false,
        }),
      },
    };
  }

  /**
   * 创建只有特定mock的最小化实例
   * 用于专门测试某个特定功能
   *
   * @param specificMocks 特定的mock实现
   * @returns ReceiverService实例
   */
  static createMinimal(
    specificMocks: Partial<ReceiverServiceDeps>,
  ): ReceiverService {
    const minimalMocks = ReceiverServiceTestBuilder.createMinimalMocks();

    const finalDeps = {
      ...minimalMocks,
      ...specificMocks,
    };

    return new ReceiverService(
      finalDeps.symbolTransformerService,
      finalDeps.dataFetcherService,
      finalDeps.capabilityRegistryService,
      finalDeps.marketStatusService,
      finalDeps.dataTransformerService,
      finalDeps.storageService,
      finalDeps.collectorService,
      finalDeps.smartCacheOrchestrator,
    );
  }

  /**
   * 创建最小化的mock实现
   * 只提供基本的方法避免运行时错误
   */
  private static createMinimalMocks(): ReceiverServiceDeps {
    return {
      symbolTransformerService: { transformSymbols: jest.fn() },
      dataFetcherService: { fetchRawData: jest.fn() },
      capabilityRegistryService: {
        getBestProvider: jest.fn(),
        getCapability: jest.fn(),
        getProvider: jest.fn(),
      },
      marketStatusService: { getBatchMarketStatus: jest.fn() },
      dataTransformerService: { transform: jest.fn() },
      storageService: { storeData: jest.fn() },
      collectorService: {
        recordRequest: jest.fn(),
        recordSystemMetrics: jest.fn(),
      },
      smartCacheOrchestrator: { getDataWithSmartCache: jest.fn() },
    };
  }
}

// 便利的工厂函数
export const createMockSymbolTransformer = () => ({
  transformSymbols: jest.fn().mockResolvedValue({
    mappedSymbols: ["MOCK_SYMBOL"],
    mappingDetails: [],
    failedSymbols: [],
    metadata: {
      provider: "mock",
      totalSymbols: 1,
      successCount: 1,
      failedCount: 0,
      processingTimeMs: 5,
    },
  }),
});

export const createMockDataFetcher = () => ({
  fetchRawData: jest.fn().mockResolvedValue({
    data: [{ symbol: "MOCK", price: 999 }],
    metadata: { processingTime: 10 },
  }),
});

export const createMockCapabilityRegistry = () => ({
  getBestProvider: jest.fn().mockReturnValue("mock-provider"),
  getCapability: jest.fn().mockReturnValue({ supportedMarkets: ["MOCK"] }),
  getProvider: jest.fn(),
});

export const createMockMarketStatus = () => ({
  getBatchMarketStatus: jest.fn().mockResolvedValue({ MOCK: { isOpen: true } }),
});

export const createMockDataTransformer = () => ({
  transform: jest.fn().mockResolvedValue({
    transformedData: [{ symbol: "MOCK", lastPrice: 999 }],
  }),
});

export const createMockStorage = () => ({
  storeData: jest.fn().mockResolvedValue(undefined),
});

export const createMockCollector = () => ({
  recordRequest: jest.fn(),
  recordSystemMetrics: jest.fn(),
});

export const createMockSmartCache = () => ({
  getDataWithSmartCache: jest.fn().mockResolvedValue({
    data: [{ symbol: "MOCK", lastPrice: 999 }],
    fromCache: false,
  }),
});
