import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@common/config/logger.config';
import { LongportStreamContextService } from '../../../../../../src/providers/longport/services/longport-stream-context.service';

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
const mockQuoteContext = {
  setOnQuote: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

// 将mock移到模块顶部
jest.mock('longport', () => {
  const mockConfigConstructor = jest.fn();
  return {
    Config: Object.assign(mockConfigConstructor, {
      fromEnv: jest.fn(),
    }),
    QuoteContext: {
      new: jest.fn().mockImplementation(() => Promise.resolve(mockQuoteContext)),
    },
    SubType: {
      Quote: 'quote',
    },
  };
});

// Mock ConfigService
const mockConfigService = {
  get: jest.fn(),
};

describe('LongportStreamContextService', () => {
  let service: LongportStreamContextService;
  let configService: ConfigService;
  const { QuoteContext, Config } = require('longport');
  let timeoutSpy: jest.SpyInstance;
  
  // 回调函数变量，用于事件处理测试
  let onQuoteCallback: ((symbol: string, event: any) => void) | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // 重置回调变量
    onQuoteCallback = null;
    
    // Mock setOnQuote 以捕获回调函数
    mockQuoteContext.setOnQuote.mockImplementation((callback: (symbol: string, event: any) => void) => {
      onQuoteCallback = callback;
    });
    
    // Mock setTimeout to prevent actual timers in tests
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      // Execute immediately for testing
      if (typeof fn === 'function') {
        setImmediate(fn);
      }
      return 123 as any; // Mock timer ID
    });
    
    // Reset environment variables
    delete process.env.LONGPORT_APP_KEY;
    delete process.env.LONGPORT_APP_SECRET;
    delete process.env.LONGPORT_ACCESS_TOKEN;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LongportStreamContextService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LongportStreamContextService>(LongportStreamContextService);
    configService = module.get<ConfigService>(ConfigService);
  });
  
  afterEach(() => {
    // Restore setTimeout
    if (timeoutSpy) {
      timeoutSpy.mockRestore();
    }
    // Clear any pending timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initializeWebSocket()', () => {
    it('should initialize WebSocket connection successfully with environment variables', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });

      // Execute
      await service.initializeWebSocket();

      // Verify
      expect(Config.fromEnv).toHaveBeenCalledTimes(1);
      expect(QuoteContext.new).toHaveBeenCalledWith({ test: 'config' });
      expect(mockQuoteContext.setOnQuote).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'LongPort WebSocket 初始化成功',
          connectionId: expect.stringContaining('longport_'),
          status: 'connected',
          quotContextCreated: true,
          configCreated: true,
          messageCallbacksCount: expect.any(Number),
        })
      );
    });

    it('should initialize WebSocket connection successfully with ConfigService values', async () => {
      // Setup - no environment variables
      mockConfigService.get.mockImplementation((key: string) => {
        const values = {
          'LONGPORT_APP_KEY': 'config_key',
          'LONGPORT_APP_SECRET': 'config_secret',
          'LONGPORT_ACCESS_TOKEN': 'config_token',
        };
        return values[key];
      });
      
      // Mock Config constructor to return a config object
      Config.mockReturnValue({ test: 'constructed_config' });

      // Execute
      await service.initializeWebSocket();

      // Verify
      expect(mockConfigService.get).toHaveBeenCalledWith('LONGPORT_APP_KEY');
      expect(mockConfigService.get).toHaveBeenCalledWith('LONGPORT_APP_SECRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('LONGPORT_ACCESS_TOKEN');
      expect(QuoteContext.new).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'LongPort WebSocket 初始化成功',
          connectionId: expect.stringContaining('longport_'),
          status: 'connected',
          quotContextCreated: true,
          configCreated: true,
          messageCallbacksCount: expect.any(Number),
        })
      );
    });

    it('should skip initialization if already connected', async () => {
      // Setup - first initialization
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      
      await service.initializeWebSocket();
      jest.clearAllMocks();

      // Execute - second initialization
      await service.initializeWebSocket();

      // Verify
      expect(QuoteContext.new).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('LongPort WebSocket 已连接，跳过初始化');
    });

    it('should throw error when LongPort configuration is incomplete', async () => {
      // Setup - incomplete configuration
      mockConfigService.get.mockReturnValue(null);

      // Execute & Verify
      await expect(service.initializeWebSocket())
        .rejects.toThrow('LongPort WebSocket 初始化失败: LongPort 配置不完整：缺少 APP_KEY、APP_SECRET 或 ACCESS_TOKEN');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 初始化失败',
        error: 'LongPort 配置不完整：缺少 APP_KEY、APP_SECRET 或 ACCESS_TOKEN',
        connectionState: expect.objectContaining({
          status: 'failed',
          healthStatus: 'failed',
          isInitialized: false,
          connectionId: null,
        }),
      });
    });

    it('should handle QuoteContext creation failure', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      QuoteContext.new.mockImplementationOnce(() => Promise.reject(new Error('Connection failed')));

      // Execute & Verify
      await expect(service.initializeWebSocket())
        .rejects.toThrow('LongPort WebSocket 初始化失败: Connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 初始化失败',
        error: 'Connection failed',
        connectionState: expect.objectContaining({
          status: 'failed',
          healthStatus: 'failed',
          isInitialized: false,
          connectionId: null,
        }),
      });
    });
  });

  describe('subscribe()', () => {
    beforeEach(async () => {
      // Initialize service first
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      jest.clearAllMocks();
    });

    it('should subscribe to new symbols successfully', async () => {
      // Setup
      const symbols = ['700.HK', 'AAPL.US'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);

      // Execute
      await service.subscribe(symbols);

      // Verify
      expect(mockQuoteContext.subscribe).toHaveBeenCalledWith(symbols, ['quote'], true);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 订阅成功',
        connectionId: expect.stringContaining('longport_'),
        symbols,
        subTypes: ['quote'],
        isFirstPush: true,
        totalSubscribed: symbols.length,
        subscribedSymbolsList: expect.arrayContaining(symbols),
      });
    });

    it('should skip already subscribed symbols', async () => {
      // Setup - first subscription
      const symbols1 = ['700.HK', 'AAPL.US'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      await service.subscribe(symbols1);
      jest.clearAllMocks();

      // Execute - second subscription with overlap
      const symbols2 = ['700.HK', 'TSLA.US']; // 700.HK already subscribed
      await service.subscribe(symbols2);

      // Verify - only new symbol should be subscribed
      expect(mockQuoteContext.subscribe).toHaveBeenCalledWith(['TSLA.US'], ['quote'], true);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 订阅成功',
        connectionId: expect.stringContaining('longport_'),
        symbols: ['TSLA.US'],
        subTypes: ['quote'],
        isFirstPush: true,
        totalSubscribed: 3,
        subscribedSymbolsList: expect.arrayContaining(['700.HK', 'AAPL.US', 'TSLA.US']),
      });
    });

    it('should skip subscription when all symbols already subscribed', async () => {
      // Setup - first subscription
      const symbols = ['700.HK', 'AAPL.US'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      await service.subscribe(symbols);
      jest.clearAllMocks();

      // Execute - same symbols again
      await service.subscribe(symbols);

      // Verify
      expect(mockQuoteContext.subscribe).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: '当前连接下所有符号已订阅，跳过',
        connectionId: expect.stringContaining('longport_'),
        requestedSymbols: symbols,
        alreadySubscribed: symbols.length,
      });
    });

    it('should throw error when not connected', async () => {
      // Setup - create new service without initialization
      const newService = new LongportStreamContextService(configService);

      // Execute & Verify
      await expect(newService.subscribe(['700.HK']))
        .rejects.toThrow('LongPort WebSocket 订阅失败: LongPort WebSocket 未连接');
    });

    it('should handle subscription failure', async () => {
      // Setup
      const symbols = ['700.HK'];
      const error = new Error('Subscription failed');
      mockQuoteContext.subscribe.mockRejectedValue(error);

      // Execute & Verify
      await expect(service.subscribe(symbols))
        .rejects.toThrow('LongPort WebSocket 订阅失败: Subscription failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 订阅失败',
        connectionId: expect.stringContaining('longport_'),
        symbols,
        error: 'Subscription failed',
        errorCode: null,
        connectionState: expect.objectContaining({
          healthStatus: 'degraded',
          status: 'connected',
        }),
      });
    });
  });

  describe('unsubscribe()', () => {
    beforeEach(async () => {
      // Initialize service and subscribe to some symbols
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      await service.subscribe(['700.HK', 'AAPL.US', 'TSLA.US']);
      jest.clearAllMocks();
    });

    it('should unsubscribe from subscribed symbols successfully', async () => {
      // Setup
      const symbols = ['700.HK', 'AAPL.US'];
      mockQuoteContext.unsubscribe.mockResolvedValue(undefined);

      // Execute
      await service.unsubscribe(symbols);

      // Verify
      expect(mockQuoteContext.unsubscribe).toHaveBeenCalledWith(symbols, ['quote']);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 取消订阅成功',
        symbols,
        subTypes: ['quote'],
        totalSubscribed: 1, // Only TSLA.US remains
      });
    });

    it('should skip unsubscribing from non-subscribed symbols', async () => {
      // Setup
      const symbols = ['MSFT.US', 'GOOGL.US']; // Not subscribed
      mockQuoteContext.unsubscribe.mockResolvedValue(undefined);

      // Execute
      await service.unsubscribe(symbols);

      // Verify
      expect(mockQuoteContext.unsubscribe).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('没有符号需要取消订阅');
    });

    it('should handle partial symbol lists', async () => {
      // Setup
      const symbols = ['700.HK', 'MSFT.US']; // One subscribed, one not
      mockQuoteContext.unsubscribe.mockResolvedValue(undefined);

      // Execute
      await service.unsubscribe(symbols);

      // Verify - only subscribed symbol should be unsubscribed
      expect(mockQuoteContext.unsubscribe).toHaveBeenCalledWith(['700.HK'], ['quote']);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 取消订阅成功',
        symbols: ['700.HK'],
        subTypes: ['quote'],
        totalSubscribed: 2, // AAPL.US and TSLA.US remain
      });
    });

    it('should handle unsubscription when not connected', async () => {
      // Setup - create new service without initialization
      const newService = new LongportStreamContextService(configService);

      // Execute
      await newService.unsubscribe(['700.HK']);

      // Verify
      expect(mockLogger.warn).toHaveBeenCalledWith('LongPort WebSocket 未连接，无法取消订阅');
    });

    it('should handle unsubscription failure', async () => {
      // Setup
      const symbols = ['700.HK'];
      const error = new Error('Unsubscription failed');
      mockQuoteContext.unsubscribe.mockRejectedValue(error);

      // Execute & Verify
      await expect(service.unsubscribe(symbols))
        .rejects.toThrow('LongPort WebSocket 取消订阅失败: Unsubscription failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 取消订阅失败',
        symbols,
        error: 'Unsubscription failed',
        errorCode: null,
      });
    });
  });

  describe('onQuoteUpdate()', () => {
    it('should add message callback', () => {
      // Setup
      const callback = jest.fn();

      // Execute
      service.onQuoteUpdate(callback);

      // Verify - callback should be stored (we can't directly test private array)
      expect(() => service.onQuoteUpdate(callback)).not.toThrow();
    });

    it('should handle multiple callbacks', () => {
      // Setup
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Execute
      service.onQuoteUpdate(callback1);
      service.onQuoteUpdate(callback2);

      // Verify
      expect(() => service.onQuoteUpdate(callback1)).not.toThrow();
      expect(() => service.onQuoteUpdate(callback2)).not.toThrow();
    });
  });

  describe('isWebSocketConnected()', () => {
    it('should return false when not connected', () => {
      // Execute & Verify
      expect(service.isWebSocketConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      
      // Execute
      await service.initializeWebSocket();

      // Verify
      expect(service.isWebSocketConnected()).toBe(true);
    });
  });

  describe('getSubscribedSymbols()', () => {
    it('should return empty array when no symbols subscribed', () => {
      // Execute & Verify
      expect(service.getSubscribedSymbols()).toEqual([]);
    });

    it('should return subscribed symbols', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      
      const symbols = ['700.HK', 'AAPL.US'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      await service.subscribe(symbols);

      // Execute & Verify
      expect(service.getSubscribedSymbols()).toEqual(expect.arrayContaining(symbols));
      expect(service.getSubscribedSymbols()).toHaveLength(2);
    });
  });

  describe('cleanup()', () => {
    it('should cleanup resources when connected', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      
      const symbols = ['700.HK', 'AAPL.US'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      mockQuoteContext.unsubscribe.mockResolvedValue(undefined);
      await service.subscribe(symbols);
      
      jest.clearAllMocks();

      // Execute
      await service.cleanup();

      // Verify
      expect(mockQuoteContext.unsubscribe).toHaveBeenCalledWith(symbols, ['quote']);
      expect(service.isWebSocketConnected()).toBe(false);
      expect(service.getSubscribedSymbols()).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'LongPort WebSocket 资源清理完成',
        connectionState: expect.objectContaining({
          status: 'not_started',
          healthStatus: 'healthy',
          isInitialized: false,
          connectionId: null,
        }),
        callbacksCleared: true,
        subscriptionsCleared: true,
      });
    });

    it('should handle cleanup when not connected', async () => {
      // Execute
      await service.cleanup();

      // Verify - should not throw error
      expect(mockLogger.log).not.toHaveBeenCalledWith('LongPort WebSocket 资源清理完成');
    });

    it('should handle cleanup errors gracefully', async () => {
      // Setup
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      
      const symbols = ['700.HK'];
      mockQuoteContext.subscribe.mockResolvedValue(undefined);
      await service.subscribe(symbols);
      
      // Mock unsubscribe to fail
      mockQuoteContext.unsubscribe.mockRejectedValue(new Error('Cleanup failed'));
      jest.clearAllMocks();

      // Execute
      await service.cleanup();

      // Verify - cleanup should continue even with unsubscribe errors
      // unsubscribe error is logged as warning, not error
      expect(mockLogger.warn).toHaveBeenCalledWith('取消订阅时出错: LongPort WebSocket 取消订阅失败: Cleanup failed');
      
      // Cleanup should still complete successfully
      expect(service.isWebSocketConnected()).toBe(false);
      expect(service.getSubscribedSymbols()).toEqual([]);
    });
  });

  describe('onModuleDestroy()', () => {
    it('should call cleanup on module destroy', async () => {
      // Setup
      const cleanupSpy = jest.spyOn(service, 'cleanup').mockResolvedValue(undefined);

      // Execute
      await service.onModuleDestroy();

      // Verify
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quote Event Handlers', () => {
    beforeEach(async () => {
      // Initialize service
      process.env.LONGPORT_APP_KEY = 'test_key';
      Config.fromEnv.mockReturnValue({ test: 'config' });
      await service.initializeWebSocket();
      jest.clearAllMocks();
    });

    it('should handle quote update event', () => {
      // Setup
      const callback = jest.fn();
      service.onQuoteUpdate(callback);
      
      const mockEvent = {
        symbol: '700.HK',
        last_done: 350.5,
        volume: 1000,
        timestamp: 1640995200000,
      };

      // Execute - 使用捕获的回调函数
      expect(onQuoteCallback).toBeDefined();
      onQuoteCallback!('700.HK', mockEvent);

      // Verify - 基于实际的 parseLongportQuoteEvent 输出格式
      expect(callback).toHaveBeenCalledWith({
        symbol: '700.HK',
        last_done: 350.5,
        prev_close: undefined,
        open: undefined,
        high: undefined,
        low: undefined,
        volume: 1000,
        turnover: undefined,
        timestamp: expect.any(Number),
        trade_status: undefined,
        trade_session: undefined,
        current_volume: undefined,
        current_turnover: undefined,
        _raw: expect.objectContaining({
          originalEvent: mockEvent,
          extractedSymbol: '700.HK',
          parsedQuoteData: expect.any(Object),
        }),
        _provider: 'longport',
      });
    });

    it('should handle malformed quote update event', () => {
      // Setup
      const callback = jest.fn();
      service.onQuoteUpdate(callback);
      
      const mockEvent = 'invalid json';

      // Execute
      expect(onQuoteCallback).toBeDefined();
      onQuoteCallback!('UNKNOWN', mockEvent);

      // Verify - 基于实际的解析失败处理
      expect(callback).toHaveBeenCalledWith({
        symbol: 'UNKNOWN',
        timestamp: expect.any(Number),
        last_done: undefined,
        prev_close: undefined,
        open: undefined,
        high: undefined,
        low: undefined,
        volume: undefined,
        turnover: undefined,
        trade_status: undefined,
        trade_session: undefined,
        current_volume: undefined,
        current_turnover: undefined,
        _raw: expect.objectContaining({
          originalEvent: 'invalid json',
          extractedSymbol: null,
          parsedQuoteData: null,
        }),
        _provider: 'longport',
      });
    });

    it('should handle callback errors gracefully', () => {
      // Setup
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      service.onQuoteUpdate(errorCallback);
      
      const mockEvent = {
        toString: () => JSON.stringify({ symbol: '700.HK' }),
      };

      // Execute
      expect(onQuoteCallback).toBeDefined();
      onQuoteCallback!('700.HK', mockEvent);

      // Verify - 基于实际的错误日志格式
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: '报价回调处理失败',
        callbackIndex: 0,
        error: 'Callback error',
        eventData: expect.objectContaining({
          symbol: 'UNKNOWN', // 因为解析失败会设为 UNKNOWN
          _provider: 'longport',
          _raw: expect.any(Object),
        }),
      });
    });
  });
});