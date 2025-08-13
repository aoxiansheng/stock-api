/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { MARKETS } from '@common/constants/market.constants';

// 导入需要测试的服务和接口
import { AppModule } from '../../../../../src/app.module';
import { CapabilityRegistryService } from '../../../../../src/providers/services/capability-registry.service';
import { EnhancedCapabilityRegistryService } from '../../../../../src/providers/services/enhanced-capability-registry.service';
import { IStreamCapability, StreamDataCallbackParams } from '../../../../../src/providers/interfaces/stream-capability.interface';
import { LongportStreamContextService } from '../../../../../src/providers/longport/services/longport-stream-context.service';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock LongPort SDK
jest.mock('longport', () => {
  const mockSubType = {
    Quote: 'quote',
    Depth: 'depth',
    Brokers: 'brokers',
    Trade: 'trade'
  };
  
  // 创建模拟的QuoteContext
  const createMockQuoteContext = () => {
    return {
      // 模拟订阅和取消订阅方法
      subscribe: jest.fn().mockImplementation(() => Promise.resolve()),
      unsubscribe: jest.fn().mockImplementation(() => Promise.resolve()),
      
      // 模拟设置回调方法
      setOnQuote: jest.fn(),
      setOnDepth: jest.fn(),
      setOnBrokers: jest.fn(),
      setOnTrade: jest.fn(),
      setOnConnected: jest.fn(),
      setOnDisconnected: jest.fn()
    };
  };

  // 模拟Config类
  class MockConfig {
    constructor(appKey?: string, appSecret?: string, accessToken?: string) {
      this.appKey = appKey || 'test_app_key';
      this.appSecret = appSecret || 'test_app_secret';
      this.accessToken = accessToken || 'test_access_token';
    }
    
    appKey: string;
    appSecret: string;
    accessToken: string;

    static fromEnv() {
      return new MockConfig();
    }
  }

  return {
    Config: MockConfig,
    QuoteContext: {
      new: jest.fn().mockImplementation(() => {
        return Promise.resolve(createMockQuoteContext());
      })
    },
    SubType: mockSubType
  };
});

describe('StreamStockQuote Capability Integration', () => {
  let module: TestingModule;
  let capabilityRegistryService: CapabilityRegistryService;
  let enhancedRegistryService: EnhancedCapabilityRegistryService;
  let longportStreamService: LongportStreamContextService;
  
  let streamCapability: IStreamCapability;
  
  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // 确保模块完全初始化
    await module.init();
    
    // 获取服务
    capabilityRegistryService = module.get<CapabilityRegistryService>(CapabilityRegistryService);
    enhancedRegistryService = module.get<EnhancedCapabilityRegistryService>(EnhancedCapabilityRegistryService);
    longportStreamService = module.get<LongportStreamContextService>(LongportStreamContextService);
    
    // 等待流能力注册完成 - 修复时序问题
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      const allStreamCaps = capabilityRegistryService.getAllStreamCapabilities();
      const longportCaps = allStreamCaps.get('longport');
      const streamQuoteCap = longportCaps?.get('stream-stock-quote');
      
      if (streamQuoteCap) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      retryCount++;
    }
    
    // 获取流能力
    const provider = capabilityRegistryService.getBestStreamProvider('stream-stock-quote');
    streamCapability = capabilityRegistryService.getStreamCapability(provider, 'stream-stock-quote');
    
  }, 30000);
  
  afterAll(async () => {
    await module.close();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该正确获取stream-stock-quote能力', () => {
      expect(streamCapability).toBeDefined();
      expect(streamCapability.name).toBe('stream-stock-quote');
      expect(Array.isArray(streamCapability.supportedMarkets)).toBe(true);
      expect(streamCapability.supportedMarkets).toContain(MARKETS.HK);
    });
    
    it('应该能够初始化WebSocket连接', async () => {
      await streamCapability.initialize(longportStreamService);
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('LongPort WebSocket 流连接初始化成功')
      );
    });
  });

  describe('订阅和数据流测试', () => {
    it('应该能订阅单个股票符号', async () => {
      const symbols = ['700.HK'];
      await streamCapability.subscribe(symbols, longportStreamService);
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'LongPort WebSocket 股票报价流订阅成功',
          symbols,
          count: 1,
        })
      );
    });
    
    it('应该能订阅多个股票符号', async () => {
      const symbols = ['700.HK', 'AAPL.US', '09988.HK'];
      await streamCapability.subscribe(symbols, longportStreamService);
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'LongPort WebSocket 股票报价流订阅成功',
          symbols,
          count: 3,
        })
      );
    });
    
    it('应该验证符号格式并拒绝无效符号', async () => {
      const symbols = ['700.HK', 'INVALID_FORMAT', '09988.HK'];
      
      await streamCapability.subscribe(symbols, longportStreamService);
      
      // 验证记录了无效符号警告
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '发现无效符号格式',
        expect.objectContaining({
          invalidSymbols: ['INVALID_FORMAT'],
        })
      );
    });
    
    it('应该能够正确处理符号数量超过限制的情况', async () => {
      // 创建超过500个符号的数组
      const symbols = Array(510).fill('').map((_, i) => `${i}.HK`);
      
      // 应该抛出错误
      await expect(streamCapability.subscribe(symbols, longportStreamService))
        .rejects
        .toThrow('符号数量超过LongPort限制');
    });
    
    it('应该能取消订阅符号', async () => {
      const symbols = ['700.HK', 'AAPL.US'];
      await streamCapability.subscribe(symbols, longportStreamService);
      await streamCapability.unsubscribe(symbols, longportStreamService);
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'LongPort WebSocket 股票报价流取消订阅成功',
          symbols,
          count: 2,
        })
      );
    });
  });

  describe('消息处理测试', () => {
    it('应该能设置消息回调', () => {
      const mockCallback = jest.fn();
      streamCapability.onMessage(mockCallback);
      
      // 验证回调被存储
      expect((streamCapability as any)._messageCallback).toBe(mockCallback);
    });
    
    it('应该能清理资源', async () => {
      const mockCallback = jest.fn();
      streamCapability.onMessage(mockCallback);
      
      await streamCapability.cleanup();
      
      // 验证回调被清理
      expect((streamCapability as any)._messageCallback).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith('LongPort WebSocket 流资源清理完成');
    });
    
    it('应该能检查连接状态', () => {
      const isConnected = streamCapability.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('流数据集成测试', () => {
    it('应该通过LongportStreamContextService注册回调', async () => {
      // 订阅符号
      await streamCapability.subscribe(['700.HK'], longportStreamService);
      
      // 设置回调
      const mockCallback = jest.fn();
      streamCapability.onMessage(mockCallback);
      
      // 手动注册回调到服务 (正常情况下这是由StreamReceiverService完成)
      longportStreamService.onQuoteUpdate(mockCallback);
      
      // 验证可以正确注册
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理初始化错误', async () => {
      // 模拟上下文服务初始化失败
      const originalInitialize = longportStreamService.initializeWebSocket;
      longportStreamService.initializeWebSocket = jest.fn().mockRejectedValue(new Error('初始化失败'));
      
      await expect(streamCapability.initialize(longportStreamService))
        .rejects
        .toThrow('LongPort WebSocket 流初始化失败');
      
      // 还原原始方法
      longportStreamService.initializeWebSocket = originalInitialize;
    });
    
    it('应该处理订阅错误', async () => {
      // 模拟订阅失败
      const originalSubscribe = longportStreamService.subscribe;
      longportStreamService.subscribe = jest.fn().mockRejectedValue(new Error('订阅失败'));
      
      await expect(streamCapability.subscribe(['700.HK'], longportStreamService))
        .rejects
        .toThrow('LongPort 流订阅失败');
      
      // 还原原始方法
      longportStreamService.subscribe = originalSubscribe;
    });
    
    it('应该处理取消订阅错误', async () => {
      // 模拟取消订阅失败
      const originalUnsubscribe = longportStreamService.unsubscribe;
      longportStreamService.unsubscribe = jest.fn().mockRejectedValue(new Error('取消订阅失败'));
      
      await expect(streamCapability.unsubscribe(['700.HK'], longportStreamService))
        .rejects
        .toThrow('LongPort 流取消订阅失败');
      
      // 还原原始方法
      longportStreamService.unsubscribe = originalUnsubscribe;
    });
  });
}); 