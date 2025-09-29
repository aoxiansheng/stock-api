import { GatewayBroadcastError } from '@core/03-fetching/stream-data-fetcher/exceptions/gateway-broadcast.exception';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier, BusinessException } from '@common/core/exceptions';

// Mock UniversalExceptionFactory
jest.mock('@common/core/exceptions', () => {
  const actualModule = jest.requireActual('@common/core/exceptions');
  return {
    ...actualModule,
    UniversalExceptionFactory: {
      createBusinessException: jest.fn()
    }
  };
});

describe('GatewayBroadcastError', () => {
  const mockUniversalExceptionFactory = UniversalExceptionFactory as jest.Mocked<typeof UniversalExceptionFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建具有正确参数的Gateway广播错误', () => {
      const symbol = 'AAPL';
      const healthStatus = { status: 'healthy' };
      const reason = 'Connection timeout';

      const mockException = new BusinessException({
        message: 'Mock exception',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      const result = GatewayBroadcastError.create(symbol, healthStatus, reason);

      expect(mockUniversalExceptionFactory.createBusinessException).toHaveBeenCalledWith({
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        message: `Gateway broadcast failed for symbol ${symbol}: ${reason}`,
        context: {
          symbol,
          healthStatus,
          reason,
          timestamp: expect.any(String),
          isCritical: false,
          recommendation: expect.any(String)
        }
      });

      expect(result).toBe(mockException);
    });

    it('应该为严重错误设置isCritical为true', () => {
      const symbol = 'TSLA';
      const healthStatus = { status: 'unhealthy' };
      const reason = 'No server instance available';

      const mockException = new BusinessException({
        message: 'Mock exception',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      GatewayBroadcastError.create(symbol, healthStatus, reason);

      const callArgs = mockUniversalExceptionFactory.createBusinessException.mock.calls[0][0];
      expect(callArgs.context.isCritical).toBe(true);
    });

    it('应该生成有效的ISO时间戳', () => {
      const symbol = 'GOOGL';
      const healthStatus = { status: 'healthy' };
      const reason = 'Network error';

      const mockException = new BusinessException({
        message: 'Mock exception',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      GatewayBroadcastError.create(symbol, healthStatus, reason);

      const callArgs = mockUniversalExceptionFactory.createBusinessException.mock.calls[0][0];
      const timestamp = callArgs.context.timestamp;

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).getTime()).not.toBeNaN();
    });

    it('应该包含正确的错误消息格式', () => {
      const symbol = 'MSFT';
      const healthStatus = { status: 'degraded' };
      const reason = 'Gateway服务未集成';

      const mockException = new BusinessException({
        message: 'Mock exception',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      GatewayBroadcastError.create(symbol, healthStatus, reason);

      const callArgs = mockUniversalExceptionFactory.createBusinessException.mock.calls[0][0];
      expect(callArgs.message).toBe(`Gateway broadcast failed for symbol ${symbol}: ${reason}`);
    });
  });

  describe('isCritical', () => {
    it('应该对unhealthy状态返回true', () => {
      const healthStatus = { status: 'unhealthy' };
      const reason = 'General error';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(true);
    });

    it('应该对"No server instance"原因返回true', () => {
      const healthStatus = { status: 'healthy' };
      const reason = 'No server instance available';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(true);
    });

    it('应该对包含"未集成"的原因返回true', () => {
      const healthStatus = { status: 'healthy' };
      const reason = 'Gateway服务未集成到系统';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(true);
    });

    it('应该对healthy状态和一般错误返回false', () => {
      const healthStatus = { status: 'healthy' };
      const reason = 'Temporary network issue';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(false);
    });

    it('应该对degraded状态和一般错误返回false', () => {
      const healthStatus = { status: 'degraded' };
      const reason = 'Slow response';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(false);
    });

    it('应该对undefined healthStatus处理正确', () => {
      const healthStatus = undefined;
      const reason = 'General error';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(false);
    });

    it('应该对null healthStatus处理正确', () => {
      const healthStatus = null;
      const reason = 'General error';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(false);
    });

    it('应该对缺少status属性的healthStatus处理正确', () => {
      const healthStatus = { otherProperty: 'value' };
      const reason = 'General error';

      const result = GatewayBroadcastError.isCritical(healthStatus, reason);

      expect(result).toBe(false);
    });
  });

  describe('getRecommendation', () => {
    it('应该为"No server instance"错误返回正确建议', () => {
      const reason = 'No server instance available';
      const healthStatus = { status: 'healthy' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check if Gateway server is properly started and integrated with WebSocketServerProvider');
    });

    it('应该为"未集成"错误返回正确建议', () => {
      const reason = 'Gateway服务未集成';
      const healthStatus = { status: 'healthy' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Ensure StreamReceiverGateway.afterInit() correctly calls webSocketProvider.setGatewayServer()');
    });

    it('应该为degraded状态返回正确建议', () => {
      const reason = 'General error';
      const healthStatus = { status: 'degraded' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check Gateway server initialization status, ensure all components are loaded correctly');
    });

    it('应该为unhealthy状态返回正确建议', () => {
      const reason = 'General error';
      const healthStatus = { status: 'unhealthy' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Immediately check Gateway health status, review detailed error information and fix root cause');
    });

    it('应该为一般情况返回默认建议', () => {
      const reason = 'General error';
      const healthStatus = { status: 'healthy' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check Gateway connection status and network configuration, ensure WebSocket server is running properly');
    });

    it('应该优先匹配reason模式而不是healthStatus', () => {
      const reason = 'No server instance found';
      const healthStatus = { status: 'unhealthy' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check if Gateway server is properly started and integrated with WebSocketServerProvider');
    });

    it('应该处理未集成优先于healthStatus', () => {
      const reason = 'Gateway服务未集成到WebSocket';
      const healthStatus = { status: 'degraded' };

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Ensure StreamReceiverGateway.afterInit() correctly calls webSocketProvider.setGatewayServer()');
    });

    it('应该对undefined healthStatus处理正确', () => {
      const reason = 'General error';
      const healthStatus = undefined;

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check Gateway connection status and network configuration, ensure WebSocket server is running properly');
    });

    it('应该对null healthStatus处理正确', () => {
      const reason = 'General error';
      const healthStatus = null;

      const result = GatewayBroadcastError.getRecommendation(reason, healthStatus);

      expect(result).toBe('Check Gateway connection status and network configuration, ensure WebSocket server is running properly');
    });
  });

  describe('集成测试', () => {
    it('应该创建完整的异常对象包含所有必需信息', () => {
      const symbol = 'BTC-USD';
      const healthStatus = {
        status: 'degraded',
        lastCheck: new Date(),
        errors: ['Connection slow']
      };
      const reason = 'Gateway响应超时';

      const mockException = new BusinessException({
        message: `Gateway broadcast failed for symbol ${symbol}: ${reason}`,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      const result = GatewayBroadcastError.create(symbol, healthStatus, reason);

      expect(result).toBe(mockException);

      const callArgs = mockUniversalExceptionFactory.createBusinessException.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        message: expect.stringContaining(symbol),
        context: {
          symbol: expect.any(String),
          healthStatus: expect.any(Object),
          reason: expect.any(String),
          timestamp: expect.any(String),
          isCritical: expect.any(Boolean),
          recommendation: expect.any(String)
        }
      });
    });

    it('应该正确处理复杂的healthStatus对象', () => {
      const symbol = 'ETH-USD';
      const healthStatus = {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: ['Multiple connection failures'],
        metrics: { uptime: 0.95, latency: 150 }
      };
      const reason = 'Critical gateway failure';

      const mockException = new BusinessException({
        message: 'Mock exception',
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: 'gatewayBroadcast',
        component: ComponentIdentifier.STREAM_DATA_FETCHER
      });
      mockUniversalExceptionFactory.createBusinessException.mockReturnValue(mockException);

      GatewayBroadcastError.create(symbol, healthStatus, reason);

      const callArgs = mockUniversalExceptionFactory.createBusinessException.mock.calls[0][0];
      expect(callArgs.context.healthStatus).toEqual(healthStatus);
      expect(callArgs.context.isCritical).toBe(true);
    });

    it('应该为错误原因组合提供正确的优先级', () => {
      // 测试原因匹配的优先级顺序
      const healthStatus = { status: 'unhealthy' };

      // "No server instance" 应该优先于 healthStatus
      const reason1 = 'No server instance available for gateway';
      const rec1 = GatewayBroadcastError.getRecommendation(reason1, healthStatus);
      expect(rec1).toContain('Gateway server is properly started');

      // "未集成" 应该优先于 healthStatus
      const reason2 = 'Gateway服务未集成到系统';
      const rec2 = GatewayBroadcastError.getRecommendation(reason2, healthStatus);
      expect(rec2).toContain('StreamReceiverGateway.afterInit()');

      // 没有特殊原因时应该使用 healthStatus
      const reason3 = 'General connection error';
      const rec3 = GatewayBroadcastError.getRecommendation(reason3, healthStatus);
      expect(rec3).toContain('Immediately check Gateway health status');
    });
  });
});
