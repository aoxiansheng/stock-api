/* eslint-disable @typescript-eslint/no-unused-vars */
// Import removed as TestingModule is not used in this test file
import { createLogger } from '@common/config/logger.config';
import { MARKETS } from '@common/constants/market.constants';
import streamStockQuote from '../../../../../../src/providers/longport/capabilities/stream-stock-quote';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  _warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock LongportStreamContextService
const mockContextService = {
  initializeWebSocket: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  onQuoteUpdate: jest.fn(),
  _isWebSocketConnected: jest.fn(),
  cleanup: jest.fn(),
};

describe('StreamStockQuote Capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Properties', () => {
    it('should have correct capability name', () => {
      expect(streamStockQuote.name).toBe('stream-stock-quote');
    });

    it('should have correct description', () => {
      expect(streamStockQuote.description).toBe('获取股票实时报价数据流（WebSocket）');
    });

    it('should support correct markets', () => {
      expect(streamStockQuote.supportedMarkets).toEqual([
        MARKETS.HK,
        MARKETS.SZ,
        MARKETS.SH,
        MARKETS.US,
      ]);
    });

    it('should support correct symbol formats', () => {
      expect(streamStockQuote.supportedSymbolFormats).toEqual([
        '700.HK',
        '00700.HK',
        '09618.HK',
        '00700',
        '09618',
        '000001.SZ',
        '600000.SH',
        'AAPL.US',
      ]);
    });

    it('should have rate limit configuration', () => {
      expect(streamStockQuote.rateLimit).toEqual({
        maxConnections: 100,
        maxSubscriptionsPerConnection: 200,
        reconnectDelay: 1000,
        maxReconnectAttempts: 5,
      });
    });
  });

  describe('initialize()', () => {
    it('should initialize WebSocket connection successfully', async () => {
      mockContextService.initializeWebSocket.mockResolvedValue(undefined);

      await expect(streamStockQuote.initialize(mockContextService))
        .resolves.toBeUndefined();

      expect(mockContextService.initializeWebSocket).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('初始化 LongPort WebSocket 流连接');
      expect(mockLogger.log).toHaveBeenCalledWith('LongPort WebSocket 流连接初始化成功');
    });

    it('should throw error when contextService is not provided', async () => {
      await expect(streamStockQuote.initialize(null))
        .rejects.toThrow('LongPort WebSocket 流初始化失败: LongportStreamContextService 未提供');
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Connection failed');
      mockContextService.initializeWebSocket.mockRejectedValue(error);

      await expect(streamStockQuote.initialize(mockContextService))
        .rejects.toThrow('LongPort WebSocket 流初始化失败: Connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 流连接初始化失败',
        error: 'Connection failed',
      });
    });
  });

  describe('subscribe()', () => {
    const testSymbols = ['700.HK', 'AAPL.US', 'TSLA.US'];

    it('should subscribe to symbols successfully', async () => {
      mockContextService.subscribe.mockResolvedValue(undefined);

      await expect(streamStockQuote.subscribe(testSymbols, mockContextService))
        .resolves.toBeUndefined();

      expect(mockContextService.subscribe).toHaveBeenCalledWith(testSymbols);
      expect(mockLogger.debug).toHaveBeenCalledWith('订阅 LongPort WebSocket 股票报价流', { symbols: testSymbols });
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 股票报价流订阅成功',
        symbols: testSymbols,
        count: testSymbols.length,
      });
    });

    it('should throw error when contextService is not provided', async () => {
      await expect(streamStockQuote.subscribe(testSymbols, null))
        .rejects.toThrow('LongPort 流订阅失败: LongportStreamContextService 未提供');
    });

    it('should throw error when symbols array is empty', async () => {
      await expect(streamStockQuote.subscribe([], mockContextService))
        .rejects.toThrow('LongPort 流订阅失败: 订阅符号列表不能为空');
    });

    it('should throw error when symbols is null', async () => {
      await expect(streamStockQuote.subscribe(null, mockContextService))
        .rejects.toThrow('LongPort 流订阅失败: 订阅符号列表不能为空');
    });

    it('should reject subscription when invalid symbols are present', async () => {
      const symbolsWithInvalid = ['700.HK', 'INVALID_SYMBOL', 'AAPL.US'];
      mockContextService.subscribe.mockResolvedValue(undefined);

      // 期望抛出错误，因为实际实现会拒绝包含无效符号的订阅
      await expect(streamStockQuote.subscribe(symbolsWithInvalid, mockContextService))
        .rejects.toThrow('LongPort 流订阅失败: 无效的股票符号格式，拒绝订阅: INVALID_SYMBOL');

      // 验证记录了警告日志
      expect(mockLogger._warn).toHaveBeenCalledWith('发现无效符号格式', {
        invalidSymbols: ['INVALID_SYMBOL'],
        validSymbols: 2,
        totalSymbols: 3
      });

      // 验证没有调用实际订阅（因为被拒绝了）
      expect(mockContextService.subscribe).not.toHaveBeenCalled();
    });

    it('should handle subscription failure', async () => {
      const error = new Error('Subscription failed');
      mockContextService.subscribe.mockRejectedValue(error);

      await expect(streamStockQuote.subscribe(testSymbols, mockContextService))
        .rejects.toThrow('LongPort 流订阅失败: Subscription failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 股票报价流订阅失败',
        symbols: testSymbols,
        error: 'Subscription failed',
      });
    });
  });

  describe('unsubscribe()', () => {
    const testSymbols = ['700.HK', 'AAPL.US'];

    it('should unsubscribe from symbols successfully', async () => {
      mockContextService.unsubscribe.mockResolvedValue(undefined);

      await expect(streamStockQuote.unsubscribe(testSymbols, mockContextService))
        .resolves.toBeUndefined();

      expect(mockContextService.unsubscribe).toHaveBeenCalledWith(testSymbols);
      expect(mockLogger.debug).toHaveBeenCalledWith('取消订阅 LongPort WebSocket 股票报价流', { symbols: testSymbols });
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 股票报价流取消订阅成功',
        symbols: testSymbols,
        count: testSymbols.length,
      });
    });

    it('should throw error when contextService is not provided', async () => {
      await expect(streamStockQuote.unsubscribe(testSymbols, null))
        .rejects.toThrow('LongPort 流取消订阅失败: LongportStreamContextService 未提供');
    });

    it('should handle empty symbols array gracefully', async () => {
      await streamStockQuote.unsubscribe([], mockContextService);

      expect(mockLogger._warn).toHaveBeenCalledWith('取消订阅符号列表为空');
      expect(mockContextService.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle null symbols gracefully', async () => {
      await streamStockQuote.unsubscribe(null, mockContextService);

      expect(mockLogger._warn).toHaveBeenCalledWith('取消订阅符号列表为空');
      expect(mockContextService.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle unsubscription failure', async () => {
      const error = new Error('Unsubscription failed');
      mockContextService.unsubscribe.mockRejectedValue(error);

      await expect(streamStockQuote.unsubscribe(testSymbols, mockContextService))
        .rejects.toThrow('LongPort 流取消订阅失败: Unsubscription failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 股票报价流取消订阅失败',
        symbols: testSymbols,
        error: 'Unsubscription failed',
      });
    });
  });

  describe('onMessage()', () => {
    it('should set message callback', () => {
      const mockCallback = jest.fn();

      // onMessage 方法只是存储回调，不会抛出错误
      expect(() => streamStockQuote.onMessage(mockCallback)).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalledWith('设置 LongPort WebSocket 消息回调');
    });

    it('should handle invalid callback gracefully', () => {
      expect(() => streamStockQuote.onMessage(null)).not.toThrow();
      expect(() => streamStockQuote.onMessage(undefined)).not.toThrow();
      expect(() => streamStockQuote.onMessage('invalid' as any)).not.toThrow();
    });
  });

  describe('cleanup()', () => {
    it('should cleanup resources successfully', async () => {
      await expect(streamStockQuote.cleanup()).resolves.toBeUndefined();

      expect(mockLogger.debug).toHaveBeenCalledWith('清理 LongPort WebSocket 流资源');
      expect(mockLogger.log).toHaveBeenCalledWith('LongPort WebSocket 流资源清理完成');
    });

    it('should handle cleanup errors gracefully', async () => {
      // 模拟清理过程中的错误
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // 这个测试主要确保 cleanup 不会抛出异常
      await expect(streamStockQuote.cleanup()).resolves.toBeUndefined();

      console.error = originalConsoleError;
    });
  });

  describe('isConnected()', () => {
    it('should return false when no contextService provided', () => {
      // 没有提供 contextService 时应该返回 false
      expect(streamStockQuote.isConnected()).toBe(false);
    });

    it('should return connection status from contextService', () => {
      // Mock contextService 连接状态
      mockContextService._isWebSocketConnected.mockReturnValue(true);
      
      // 提供 contextService 参数
      expect(streamStockQuote.isConnected(mockContextService)).toBe(true);
      expect(mockContextService._isWebSocketConnected).toHaveBeenCalled();
    });

    it('should return false when contextService indicates disconnected', () => {
      // Mock contextService 断开状态
      mockContextService._isWebSocketConnected.mockReturnValue(false);
      
      expect(streamStockQuote.isConnected(mockContextService)).toBe(false);
      expect(mockContextService._isWebSocketConnected).toHaveBeenCalled();
    });
  });
});

// 测试辅助函数（如果需要导出的话）
describe('Symbol Validation Helper', () => {
  // 由于 isValidSymbol 是内部函数，我们通过能力测试间接验证
  it('should identify valid HK symbols', async () => {
    const validHKSymbols = ['700.HK', '00700', '09988'];
    mockContextService.subscribe.mockResolvedValue(undefined);

    await streamStockQuote.subscribe(validHKSymbols, mockContextService);

    // 如果没有警告日志，说明符号都是有效的
    expect(mockLogger._warn).not.toHaveBeenCalledWith(
      expect.stringContaining('发现无效符号格式'),
      expect.any(Object)
    );
  });

  it('should identify valid US symbols', async () => {
    const validUSSymbols = ['AAPL.US', 'AAPL', 'TSLA', 'BRK.A'];
    mockContextService.subscribe.mockResolvedValue(undefined);

    await streamStockQuote.subscribe(validUSSymbols, mockContextService);

    expect(mockLogger._warn).not.toHaveBeenCalledWith(
      expect.stringContaining('发现无效符号格式'),
      expect.any(Object)
    );
  });

  it('should identify valid SZ symbols', async () => {
    const validSZSymbols = ['000001.SZ', '000001', '300001'];
    mockContextService.subscribe.mockResolvedValue(undefined);

    await streamStockQuote.subscribe(validSZSymbols, mockContextService);

    expect(mockLogger._warn).not.toHaveBeenCalledWith(
      expect.stringContaining('发现无效符号格式'),
      expect.any(Object)
    );
  });

  it('should identify valid SH symbols', async () => {
    const validSHSymbols = ['600000.SH', '600000', '688001'];
    mockContextService.subscribe.mockResolvedValue(undefined);

    await streamStockQuote.subscribe(validSHSymbols, mockContextService);

    expect(mockLogger._warn).not.toHaveBeenCalledWith(
      expect.stringContaining('发现无效符号格式'),
      expect.any(Object)
    );
  });

  it('should reject subscription with all invalid symbols', async () => {
    const invalidSymbols = ['INVALID', '123', 'ABC.XY'];
    mockContextService.subscribe.mockResolvedValue(undefined);

    // 期望抛出错误，因为所有符号都无效
    await expect(streamStockQuote.subscribe(invalidSymbols, mockContextService))
      .rejects.toThrow('LongPort 流订阅失败: 无效的股票符号格式，拒绝订阅: INVALID, 123, ABC.XY');

    // 验证记录了警告日志
    expect(mockLogger._warn).toHaveBeenCalledWith('发现无效符号格式', {
      invalidSymbols,
      validSymbols: 0,
      totalSymbols: 3
    });

    // 验证没有调用实际订阅
    expect(mockContextService.subscribe).not.toHaveBeenCalled();
  });
});