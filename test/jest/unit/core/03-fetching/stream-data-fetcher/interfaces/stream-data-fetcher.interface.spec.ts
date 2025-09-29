import {
  StreamConnectionStatus,
  StreamDataFetcherException,
  StreamConnectionException,
  StreamSubscriptionException,
  BaseStreamOperationResult,
  StreamOperationResult,
  SubscriptionResult,
  UnsubscriptionResult,
  IStreamDataFetcher,
  StreamConnection,
  StreamConnectionParams,
  StreamConnectionOptions,
  StreamConnectionStats
} from '@core/03-fetching/stream-data-fetcher/interfaces/stream-data-fetcher.interface';

describe('StreamDataFetcher Interface Module', () => {
  describe('StreamConnectionStatus Enum', () => {
    it('应该定义所有连接状态', () => {
      expect(StreamConnectionStatus.CONNECTING).toBe('connecting');
      expect(StreamConnectionStatus.CONNECTED).toBe('connected');
      expect(StreamConnectionStatus.DISCONNECTED).toBe('disconnected');
      expect(StreamConnectionStatus.RECONNECTING).toBe('reconnecting');
      expect(StreamConnectionStatus.ERROR).toBe('error');
      expect(StreamConnectionStatus.CLOSED).toBe('closed');
    });

    it('应该有正确的枚举值数量', () => {
      const values = Object.values(StreamConnectionStatus);
      expect(values).toHaveLength(6);
    });

    it('应该包含所有预期的状态值', () => {
      const expectedStatuses = [
        'connecting',
        'connected',
        'disconnected',
        'reconnecting',
        'error',
        'closed'
      ];

      const actualStatuses = Object.values(StreamConnectionStatus);
      expectedStatuses.forEach(status => {
        expect(actualStatuses).toContain(status);
      });
    });

    it('应该支持字符串比较', () => {
      expect(StreamConnectionStatus.CONNECTED === 'connected').toBe(true);
      expect(StreamConnectionStatus.ERROR === 'error').toBe(true);
    });
  });

  describe('StreamDataFetcherException Class', () => {
    it('应该正确创建基础异常', () => {
      const message = 'Test error';
      const code = 'TEST_ERROR';

      const exception = new StreamDataFetcherException(message, code);

      expect(exception.message).toBe(message);
      expect(exception.code).toBe(code);
      expect(exception.name).toBe('StreamDataFetcherException');
      expect(exception).toBeInstanceOf(Error);
      expect(exception.provider).toBeUndefined();
      expect(exception.capability).toBeUndefined();
    });

    it('应该创建包含提供商和能力信息的异常', () => {
      const message = 'Provider error';
      const code = 'PROVIDER_ERROR';
      const provider = 'longport';
      const capability = 'ws-stock-quote';

      const exception = new StreamDataFetcherException(message, code, provider, capability);

      expect(exception.message).toBe(message);
      expect(exception.code).toBe(code);
      expect(exception.provider).toBe(provider);
      expect(exception.capability).toBe(capability);
      expect(exception.name).toBe('StreamDataFetcherException');
    });

    it('应该支持Error原型链', () => {
      const exception = new StreamDataFetcherException('test', 'TEST');

      expect(exception instanceof Error).toBe(true);
      expect(exception instanceof StreamDataFetcherException).toBe(true);
    });

    it('应该保持错误堆栈', () => {
      const exception = new StreamDataFetcherException('test', 'TEST');

      expect(exception.stack).toBeDefined();
      expect(typeof exception.stack).toBe('string');
    });
  });

  describe('StreamConnectionException Class', () => {
    it('应该正确创建连接异常', () => {
      const message = 'Connection failed';
      const connectionId = 'conn-123';

      const exception = new StreamConnectionException(message, connectionId);

      expect(exception.message).toBe(message);
      expect(exception.code).toBe('STREAM_CONNECTION_ERROR');
      expect(exception.connectionId).toBe(connectionId);
      expect(exception.name).toBe('StreamConnectionException');
    });

    it('应该继承自StreamDataFetcherException', () => {
      const exception = new StreamConnectionException('test');

      expect(exception instanceof StreamDataFetcherException).toBe(true);
      expect(exception instanceof StreamConnectionException).toBe(true);
      expect(exception instanceof Error).toBe(true);
    });

    it('应该包含提供商和能力信息', () => {
      const message = 'Connection timeout';
      const connectionId = 'conn-456';
      const provider = 'itick';
      const capability = 'ws-option-quote';

      const exception = new StreamConnectionException(message, connectionId, provider, capability);

      expect(exception.provider).toBe(provider);
      expect(exception.capability).toBe(capability);
      expect(exception.connectionId).toBe(connectionId);
    });

    it('应该处理可选参数', () => {
      const exception = new StreamConnectionException('error');

      expect(exception.connectionId).toBeUndefined();
      expect(exception.provider).toBeUndefined();
      expect(exception.capability).toBeUndefined();
    });
  });

  describe('StreamSubscriptionException Class', () => {
    it('应该正确创建订阅异常', () => {
      const message = 'Subscription failed';
      const symbols = ['AAPL', 'GOOGL'];

      const exception = new StreamSubscriptionException(message, symbols);

      expect(exception.message).toBe(message);
      expect(exception.code).toBe('STREAM_SUBSCRIPTION_ERROR');
      expect(exception.symbols).toEqual(symbols);
      expect(exception.name).toBe('StreamSubscriptionException');
    });

    it('应该继承自StreamDataFetcherException', () => {
      const exception = new StreamSubscriptionException('test');

      expect(exception instanceof StreamDataFetcherException).toBe(true);
      expect(exception instanceof StreamSubscriptionException).toBe(true);
      expect(exception instanceof Error).toBe(true);
    });

    it('应该包含完整的上下文信息', () => {
      const message = 'Invalid symbols';
      const symbols = ['INVALID1', 'INVALID2'];
      const provider = 'longport';
      const capability = 'ws-stock-quote';

      const exception = new StreamSubscriptionException(message, symbols, provider, capability);

      expect(exception.symbols).toEqual(symbols);
      expect(exception.provider).toBe(provider);
      expect(exception.capability).toBe(capability);
    });

    it('应该处理空符号列表', () => {
      const exception = new StreamSubscriptionException('error', []);

      expect(exception.symbols).toEqual([]);
    });

    it('应该处理undefined符号列表', () => {
      const exception = new StreamSubscriptionException('error');

      expect(exception.symbols).toBeUndefined();
    });
  });

  describe('Type Safety and Interface Validation', () => {
    it('应该验证BaseStreamOperationResult接口结构', () => {
      const result: BaseStreamOperationResult = {
        success: true,
        failedSymbols: ['INVALID'],
        error: 'Some error',
        operationId: 'op-123',
        timestamp: Date.now(),
        metadata: { extra: 'data' }
      };

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.failedSymbols)).toBe(true);
      expect(typeof result.error).toBe('string');
      expect(typeof result.operationId).toBe('string');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.metadata).toBe('object');
    });

    it('应该验证SubscriptionResult类型', () => {
      const result: SubscriptionResult = {
        success: true,
        subscribedSymbols: ['AAPL', 'GOOGL'],
        failedSymbols: ['INVALID'],
        operationId: 'sub-123'
      };

      expect(result.success).toBe(true);
      expect(Array.isArray(result.subscribedSymbols)).toBe(true);
      expect(result.subscribedSymbols).toEqual(['AAPL', 'GOOGL']);
    });

    it('应该验证UnsubscriptionResult类型', () => {
      const result: UnsubscriptionResult = {
        success: true,
        unsubscribedSymbols: ['AAPL'],
        operationId: 'unsub-123'
      };

      expect(result.success).toBe(true);
      expect(Array.isArray(result.unsubscribedSymbols)).toBe(true);
      expect(result.unsubscribedSymbols).toEqual(['AAPL']);
    });

    it('应该验证StreamConnectionParams接口', () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        requestId: 'req-123',
        options: {
          autoReconnect: true,
          maxReconnectAttempts: 3
        }
      };

      expect(typeof params.provider).toBe('string');
      expect(typeof params.capability).toBe('string');
      expect(typeof params.requestId).toBe('string');
      expect(typeof params.options).toBe('object');
    });

    it('应该验证StreamConnectionOptions接口', () => {
      const options: StreamConnectionOptions = {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectIntervalMs: 1000,
        heartbeatIntervalMs: 30000,
        connectionTimeoutMs: 10000,
        compressionEnabled: false,
        batchSize: 100
      };

      expect(typeof options.autoReconnect).toBe('boolean');
      expect(typeof options.maxReconnectAttempts).toBe('number');
      expect(typeof options.reconnectIntervalMs).toBe('number');
      expect(typeof options.heartbeatIntervalMs).toBe('number');
      expect(typeof options.connectionTimeoutMs).toBe('number');
      expect(typeof options.compressionEnabled).toBe('boolean');
      expect(typeof options.batchSize).toBe('number');
    });

    it('应该验证StreamConnectionStats接口', () => {
      const stats: StreamConnectionStats = {
        connectionId: 'conn-123',
        status: StreamConnectionStatus.CONNECTED,
        connectionDurationMs: 5000,
        messagesReceived: 100,
        messagesSent: 20,
        errorCount: 1,
        reconnectCount: 0,
        lastHeartbeat: new Date(),
        avgProcessingLatencyMs: 10,
        subscribedSymbolsCount: 5,
        memoryUsageBytes: 1024
      };

      expect(typeof stats.connectionId).toBe('string');
      expect(Object.values(StreamConnectionStatus)).toContain(stats.status);
      expect(typeof stats.connectionDurationMs).toBe('number');
      expect(typeof stats.messagesReceived).toBe('number');
      expect(typeof stats.messagesSent).toBe('number');
      expect(typeof stats.errorCount).toBe('number');
      expect(typeof stats.reconnectCount).toBe('number');
      expect(stats.lastHeartbeat instanceof Date).toBe(true);
      expect(typeof stats.avgProcessingLatencyMs).toBe('number');
      expect(typeof stats.subscribedSymbolsCount).toBe('number');
      expect(typeof stats.memoryUsageBytes).toBe('number');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('应该处理异常的序列化', () => {
      const exception = new StreamDataFetcherException('test', 'TEST', 'provider', 'capability');

      const serialized = JSON.stringify(exception);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('test');
      expect(parsed.code).toBe('TEST');
      expect(parsed.provider).toBe('provider');
      expect(parsed.capability).toBe('capability');
    });

    it('应该处理空字符串参数', () => {
      const exception = new StreamDataFetcherException('', '');

      expect(exception.message).toBe('');
      expect(exception.code).toBe('');
    });

    it('应该处理特殊字符in参数', () => {
      const message = 'Error with 特殊字符 and émojis 🚨';
      const code = 'SPECIAL_CHAR_ERROR';

      const exception = new StreamDataFetcherException(message, code);

      expect(exception.message).toBe(message);
      expect(exception.code).toBe(code);
    });

    it('应该处理长符号列表', () => {
      const longSymbolList = Array.from({ length: 1000 }, (_, i) => `SYMBOL${i}`);
      const exception = new StreamSubscriptionException('Too many symbols', longSymbolList);

      expect(exception.symbols).toHaveLength(1000);
      expect(exception.symbols?.[0]).toBe('SYMBOL0');
      expect(exception.symbols?.[999]).toBe('SYMBOL999');
    });
  });

  describe('Interface Completeness', () => {
    it('应该导出所有必需的接口和类型', () => {
      // 验证主要接口存在
      expect(StreamConnectionStatus).toBeDefined();
      expect(StreamDataFetcherException).toBeDefined();
      expect(StreamConnectionException).toBeDefined();
      expect(StreamSubscriptionException).toBeDefined();

      // 验证枚举值
      expect(typeof StreamConnectionStatus.CONNECTED).toBe('string');
      expect(typeof StreamConnectionStatus.ERROR).toBe('string');
    });

    it('应该支持类型推断', () => {
      // TypeScript编译时验证
      const result: SubscriptionResult = {
        success: true,
        subscribedSymbols: ['TEST']
      };

      // 运行时验证推断的类型
      expect(result.subscribedSymbols).toBeDefined();
      expect(Array.isArray(result.subscribedSymbols)).toBe(true);
    });

    it('应该维持异常类型层次结构', () => {
      const base = new StreamDataFetcherException('base', 'BASE');
      const connection = new StreamConnectionException('connection');
      const subscription = new StreamSubscriptionException('subscription');

      // 验证继承链
      expect(connection instanceof StreamDataFetcherException).toBe(true);
      expect(subscription instanceof StreamDataFetcherException).toBe(true);
      expect(base instanceof Error).toBe(true);
      expect(connection instanceof Error).toBe(true);
      expect(subscription instanceof Error).toBe(true);

      // 验证类型区分
      expect(connection instanceof StreamConnectionException).toBe(true);
      expect(connection instanceof StreamSubscriptionException).toBe(false);
      expect(subscription instanceof StreamSubscriptionException).toBe(true);
      expect(subscription instanceof StreamConnectionException).toBe(false);
    });
  });
});
