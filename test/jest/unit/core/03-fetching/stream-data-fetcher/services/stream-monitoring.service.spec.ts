import { Test, TestingModule } from '@nestjs/testing';
import { StreamMonitoringService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-monitoring.service';
import { StreamMetricsService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-metrics.service';
import { StreamConnection, StreamConnectionStatus } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/interfaces';

describe('StreamMonitoringService', () => {
  let service: StreamMonitoringService;
  let mockStreamMetrics: jest.Mocked<StreamMetricsService>;

  beforeEach(async () => {
    mockStreamMetrics = {
      recordConnectionStatusChange: jest.fn(),
      recordErrorEvent: jest.fn(),
      recordConnectionEvent: jest.fn(),
      getMetricsSummary: jest.fn().mockReturnValue({ total: 0, errors: 0 }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamMonitoringService,
        {
          provide: StreamMetricsService,
          useValue: mockStreamMetrics,
        },
      ],
    }).compile();

    service = module.get<StreamMonitoringService>(StreamMonitoringService);
  });

  afterEach(async () => {
    // Cleanup service after each test
    if (service) {
      await service.onModuleDestroy();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with proper state', () => {
      expect(service['isServiceDestroyed']).toBe(false);
      expect(service['connectionMonitors'].size).toBe(0);
    });
  });

  describe('Connection Monitoring Setup', () => {
    const createMockConnection = (id: string): StreamConnection => ({
      id,
      provider: 'test-provider',
      capability: 'test-capability',
      isConnected: true,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      subscribedSymbols: new Set(),
      options: {},
      onData: jest.fn(),
      onStatusChange: jest.fn(),
      onError: jest.fn(),
      sendHeartbeat: jest.fn(),
      getStats: jest.fn(),
      isAlive: jest.fn(),
      close: jest.fn(),
    });

    it('should setup connection monitoring successfully', () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection-123');
      const mockStatusChangeCallback = jest.fn();
      const mockErrorCallback = jest.fn();
      const mockCleanupCallback = jest.fn();

      // Act
      service.setupConnectionMonitoring(
        mockConnection,
        mockStatusChangeCallback,
        mockErrorCallback,
        mockCleanupCallback
      );

      // Assert
      expect(service['connectionMonitors'].has('test-connection-123')).toBe(true);
      expect(mockConnection.onStatusChange).toHaveBeenCalled();
      expect(mockConnection.onError).toHaveBeenCalled();
    });

    it('should skip monitoring setup when service is destroyed', async () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection');
      await service.onModuleDestroy(); // Destroy service first

      // Act
      service.setupConnectionMonitoring(mockConnection);

      // Assert
      expect(service['connectionMonitors'].has('test-connection')).toBe(false);
      expect(mockConnection.onStatusChange).not.toHaveBeenCalled();
    });

    it('should handle status change events correctly', () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection');
      const mockStatusChangeCallback = jest.fn();
      let statusChangeHandler: (status: string) => void;

      mockConnection.onStatusChange = jest.fn().mockImplementation((handler) => {
        statusChangeHandler = handler;
      });

      service.setupConnectionMonitoring(mockConnection, mockStatusChangeCallback);

      // Act
      statusChangeHandler('CONNECTED');

      // Assert
      expect(mockStatusChangeCallback).toHaveBeenCalledWith('CONNECTED');
      expect(mockStreamMetrics.recordConnectionStatusChange).toHaveBeenCalledWith(
        'test-provider',
        'connecting',
        'CONNECTED'
      );
    });

    it('should handle error events correctly', () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection');
      const mockErrorCallback = jest.fn();
      let errorHandler: (error: Error) => void;

      mockConnection.onError = jest.fn().mockImplementation((handler) => {
        errorHandler = handler;
      });

      service.setupConnectionMonitoring(mockConnection, undefined, mockErrorCallback);

      // Act
      const testError = new Error('Test connection error');
      errorHandler(testError);

      // Assert
      expect(mockErrorCallback).toHaveBeenCalledWith(testError);
      expect(mockStreamMetrics.recordErrorEvent).toHaveBeenCalledWith('Error', 'test-provider');
      expect(mockStreamMetrics.recordConnectionEvent).toHaveBeenCalledWith('failed', 'test-provider');
    });

    it('should trigger cleanup callback on connection closed', () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection');
      const mockCleanupCallback = jest.fn();
      let statusChangeHandler: (status: string) => void;

      mockConnection.onStatusChange = jest.fn().mockImplementation((handler) => {
        statusChangeHandler = handler;
      });

      service.setupConnectionMonitoring(mockConnection, undefined, undefined, mockCleanupCallback);

      // Act
      statusChangeHandler(StreamConnectionStatus.CLOSED);

      // Assert
      expect(mockCleanupCallback).toHaveBeenCalledWith('test-connection');
    });

    it('should handle monitoring setup errors gracefully', () => {
      // Arrange
      const mockConnection = createMockConnection('test-connection');
      mockConnection.onStatusChange = jest.fn().mockImplementation(() => {
        throw new Error('Setup failed');
      });

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      // Act & Assert - should not throw
      expect(() => {
        service.setupConnectionMonitoring(mockConnection);
      }).not.toThrow();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '连接监控设置失败',
        expect.objectContaining({
          connectionId: expect.stringContaining('test-con'),
        })
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Connection Establishment Waiting', () => {
    const createMockConnection = (isConnected = false): StreamConnection => ({
      id: 'test-connection',
      provider: 'test-provider',
      capability: 'test-capability',
      isConnected,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      subscribedSymbols: new Set(),
      options: {},
      onData: jest.fn(),
      onStatusChange: jest.fn(),
      onError: jest.fn(),
      sendHeartbeat: jest.fn(),
      getStats: jest.fn(),
      isAlive: jest.fn(),
      close: jest.fn(),
    });

    it('should resolve immediately if connection is already established', async () => {
      // Arrange
      const mockConnection = createMockConnection(true); // Already connected

      // Act
      const startTime = Date.now();
      await service.waitForConnectionEstablished(mockConnection, 5000);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should wait for connection status change to CONNECTED', async () => {
      // Arrange
      const mockConnection = createMockConnection(false); // Not connected
      let statusChangeHandler: (status: string) => void;

      mockConnection.onStatusChange = jest.fn().mockImplementation((handler) => {
        statusChangeHandler = handler;
      });

      // Act
      const waitPromise = service.waitForConnectionEstablished(mockConnection, 5000);
      
      // Simulate connection establishment after 100ms
      setTimeout(() => {
        mockConnection.isConnected = true;
        statusChangeHandler('CONNECTED');
      }, 100);

      await waitPromise;

      // Assert
      expect(mockConnection.onStatusChange).toHaveBeenCalled();
    });

    it('should timeout when connection is not established in time', async () => {
      // Arrange
      const mockConnection = createMockConnection(false);
      mockConnection.onStatusChange = jest.fn();
      mockConnection.onError = jest.fn();

      // Act & Assert
      await expect(
        service.waitForConnectionEstablished(mockConnection, 100)
      ).rejects.toThrow('连接建立超时');
    }, 10000);

    it('should reject on connection error', async () => {
      // Arrange
      const mockConnection = createMockConnection(false);
      let errorHandler: (error: Error) => void;

      mockConnection.onStatusChange = jest.fn();
      mockConnection.onError = jest.fn().mockImplementation((handler) => {
        errorHandler = handler;
      });

      // Act
      const waitPromise = service.waitForConnectionEstablished(mockConnection, 5000);
      
      // Simulate error after 100ms
      setTimeout(() => {
        errorHandler(new Error('Connection failed'));
      }, 100);

      // Assert
      await expect(waitPromise).rejects.toThrow('Connection failed');
    });

    it('should fallback to polling when event setup fails', async () => {
      // Arrange
      const mockConnection = createMockConnection(false);
      mockConnection.onStatusChange = jest.fn().mockImplementation(() => {
        throw new Error('Event setup failed');
      });

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
      
      // Simulate connection establishment
      setTimeout(() => {
        mockConnection.isConnected = true;
      }, 200);

      // Act
      await service.waitForConnectionEstablished(mockConnection, 1000);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'RxJS事件流创建失败，回退到轮询模式',
        expect.any(Object)
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Connection Monitoring Management', () => {
    it('should stop connection monitoring successfully', () => {
      // Arrange
      const mockConnection: StreamConnection = {
        id: 'test-connection',
        provider: 'test-provider',
        capability: 'test-capability',
        isConnected: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        subscribedSymbols: new Set(),
        options: {},
        onData: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        sendHeartbeat: jest.fn(),
        getStats: jest.fn(),
        isAlive: jest.fn(),
        close: jest.fn(),
      };

      service.setupConnectionMonitoring(mockConnection);
      expect(service['connectionMonitors'].has('test-connection')).toBe(true);

      // Act
      service.stopConnectionMonitoring('test-connection');

      // Assert
      expect(service['connectionMonitors'].has('test-connection')).toBe(false);
    });

    it('should handle stopping non-existent monitoring gracefully', () => {
      // Act & Assert - should not throw
      expect(() => {
        service.stopConnectionMonitoring('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Monitoring Statistics', () => {
    it('should return monitoring statistics', () => {
      // Arrange
      const mockConnection: StreamConnection = {
        id: 'test-connection',
        provider: 'test-provider',
        capability: 'test-capability',
        isConnected: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        subscribedSymbols: new Set(),
        options: {},
        onData: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        sendHeartbeat: jest.fn(),
        getStats: jest.fn(),
        isAlive: jest.fn(),
        close: jest.fn(),
      };

      service.setupConnectionMonitoring(mockConnection);

      // Act
      const stats = service.getMonitoringStats();

      // Assert
      expect(stats).toHaveProperty('activeMonitors', 1);
      expect(stats).toHaveProperty('avgMonitoringDuration');
      expect(stats).toHaveProperty('longestMonitoringDuration');
      expect(stats).toHaveProperty('streamMetricsSummary');
      expect(stats).toHaveProperty('timestamp');
    });

    it('should return empty statistics when no connections monitored', () => {
      // Act
      const stats = service.getMonitoringStats();

      // Assert
      expect(stats.activeMonitors).toBe(0);
      expect(stats.avgMonitoringDuration).toBe('0ms');
      expect(stats.longestMonitoringDuration).toBe('0ms');
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should properly cleanup resources on service destruction', async () => {
      // Arrange
      const mockConnection: StreamConnection = {
        id: 'test-connection',
        provider: 'test-provider',
        capability: 'test-capability',
        isConnected: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        subscribedSymbols: new Set(),
        options: {},
        onData: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        sendHeartbeat: jest.fn(),
        getStats: jest.fn(),
        isAlive: jest.fn(),
        close: jest.fn(),
      };

      service.setupConnectionMonitoring(mockConnection);
      expect(service['connectionMonitors'].size).toBe(1);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(service['isServiceDestroyed']).toBe(true);
      expect(service['connectionMonitors'].size).toBe(0);
    });

    it('should complete destroy subject on module destruction', async () => {
      // Arrange
      const destroySubject = service['destroy$'];
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(completeSpy).toHaveBeenCalled();

      completeSpy.mockRestore();
    });

    it('should prevent operations after service destruction', async () => {
      // Arrange
      await service.onModuleDestroy();

      const mockConnection: StreamConnection = {
        id: 'test-after-destroy',
        provider: 'test-provider',
        capability: 'test-capability',
        isConnected: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        subscribedSymbols: new Set(),
        options: {},
        onData: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        sendHeartbeat: jest.fn(),
        getStats: jest.fn(),
        isAlive: jest.fn(),
        close: jest.fn(),
      };

      // Act
      service.setupConnectionMonitoring(mockConnection);

      // Assert
      expect(service['connectionMonitors'].size).toBe(0);
      expect(mockConnection.onStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle multiple connections efficiently', () => {
      // Arrange
      const connectionCount = 50;
      const startTime = Date.now();

      // Act
      for (let i = 0; i < connectionCount; i++) {
        const mockConnection: StreamConnection = {
          id: `conn-${i}`,
          provider: 'test-provider',
          capability: 'test-capability',
          isConnected: true,
          createdAt: new Date(),
          lastActiveAt: new Date(),
          subscribedSymbols: new Set(),
          options: {},
          onData: jest.fn(),
          onStatusChange: jest.fn(),
          onError: jest.fn(),
          sendHeartbeat: jest.fn(),
          getStats: jest.fn(),
          isAlive: jest.fn(),
          close: jest.fn(),
        };

        service.setupConnectionMonitoring(mockConnection);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(service['connectionMonitors'].size).toBe(connectionCount);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cleanup resources efficiently for multiple connections', async () => {
      // Arrange
      const connectionCount = 30;
      const connections: StreamConnection[] = [];

      for (let i = 0; i < connectionCount; i++) {
        const mockConnection: StreamConnection = {
          id: `conn-${i}`,
          provider: 'test-provider',
          capability: 'test-capability',
          isConnected: true,
          createdAt: new Date(),
          lastActiveAt: new Date(),
          subscribedSymbols: new Set(),
          options: {},
          onData: jest.fn(),
          onStatusChange: jest.fn(),
          onError: jest.fn(),
          sendHeartbeat: jest.fn(),
          getStats: jest.fn(),
          isAlive: jest.fn(),
          close: jest.fn(),
        };

        service.setupConnectionMonitoring(mockConnection);
        connections.push(mockConnection);
      }

      const startTime = Date.now();

      // Act
      await service.onModuleDestroy();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(service['connectionMonitors'].size).toBe(0);
      expect(service['isServiceDestroyed']).toBe(true);
      expect(duration).toBeLessThan(500); // Should cleanup within 500ms
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event callbacks gracefully', () => {
      // Arrange
      const mockConnection: StreamConnection = {
        id: 'error-test-conn',
        provider: 'test-provider',
        capability: 'test-capability',
        isConnected: true,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        subscribedSymbols: new Set(),
        options: {},
        onData: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        sendHeartbeat: jest.fn(),
        getStats: jest.fn(),
        isAlive: jest.fn(),
        close: jest.fn(),
      };

      // Act & Assert - should not throw when setting up monitoring
      expect(() => {
        service.setupConnectionMonitoring(mockConnection);
      }).not.toThrow();

      expect(service['connectionMonitors'].size).toBe(1);
      expect(service['isServiceDestroyed']).toBe(false);
    });
  });
});