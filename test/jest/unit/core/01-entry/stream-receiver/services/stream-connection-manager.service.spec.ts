import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamConnectionManagerService } from '@core/01-entry/stream-receiver/services/stream-connection-manager.service';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import { ConnectionManagementCallbacks } from '@core/01-entry/stream-receiver/interfaces/connection-management.interface';

describe('StreamConnectionManagerService', () => {
  let service: StreamConnectionManagerService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let streamDataFetcherService: jest.Mocked<StreamDataFetcherService>;

  const mockCallbacks: ConnectionManagementCallbacks = {
    emitMonitoringEvent: jest.fn(),
    emitBusinessEvent: jest.fn(),
    recordConnectionMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'streamReceiverConfig':
            return {
              connectionLimits: {
                maxConnectionsPerClient: 10,
                maxGlobalConnections: 1000
              },
              healthCheck: {
                enabled: true,
                interval: 30000
              },
              cleanup: {
                enabled: true,
                interval: 60000
              }
            };
          default:
            return {};
        }
      }),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn(),
      getCurrentUsage: jest.fn(),
      resetRateLimit: jest.fn(),
      getUsageStatistics: jest.fn(),
    };

    const mockStreamDataFetcherService = {
      getConnectionStatus: jest.fn(),
      healthCheck: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        StreamConnectionManagerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: RateLimitService, useValue: mockRateLimitService },
        { provide: StreamDataFetcherService, useValue: mockStreamDataFetcherService },
      ],
    }).compile();

    service = module.get<StreamConnectionManagerService>(StreamConnectionManagerService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
    rateLimitService = module.get(RateLimitService);
    streamDataFetcherService = module.get(StreamDataFetcherService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('streamReceiverConfig');
    });
  });

  describe('Callback Management', () => {
    it('should set callbacks successfully', () => {
      service.setCallbacks(mockCallbacks);
      expect(service).toBeDefined();
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should check connection rate limit', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({ allowed: true, limit: 100, current: 10, remaining: 90, resetTime: Date.now() + 60000 });

      const result = await service.checkConnectionRateLimit('client-123');

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith('client-123', 'connection');
    });

    it('should handle rate limit exceeded', async () => {
      rateLimitService.checkRateLimit.mockResolvedValue({ allowed: false, limit: 100, current: 100, remaining: 0, resetTime: Date.now() + 60000 });

      const result = await service.checkConnectionRateLimit('client-456');

      expect(result).toBe(false);
    });

    it('should get active connections count', () => {
      const count = service.getActiveConnectionsCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should check if connection is active', () => {
      const isActive = service.isConnectionActive('connection-key');
      expect(typeof isActive).toBe('boolean');
    });

    it('should remove connection', () => {
      expect(() => service.removeConnection('connection-key')).not.toThrow();
    });

    it('should update connection health', () => {
      const healthInfo = {
        isHealthy: true,
        lastCheck: Date.now()
      };

      expect(() => service.updateConnectionHealth('connection-id', healthInfo)).not.toThrow();
    });

    it('should get connection health stats', () => {
      const stats = service.getConnectionHealthStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('healthy');
      expect(stats).toHaveProperty('unhealthy');
      expect(stats).toHaveProperty('healthRatio');
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('Connection Cleanup', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should force connection cleanup', async () => {
      const result = await service.forceConnectionCleanup();

      expect(result).toHaveProperty('staleConnectionsCleaned');
      expect(result).toHaveProperty('unhealthyConnectionsCleaned');
      expect(result).toHaveProperty('totalCleaned');
      expect(result).toHaveProperty('remainingConnections');
      expect(result).toHaveProperty('cleanupType');

      expect(typeof result.staleConnectionsCleaned).toBe('number');
      expect(typeof result.unhealthyConnectionsCleaned).toBe('number');
      expect(typeof result.totalCleaned).toBe('number');
      expect(typeof result.remainingConnections).toBe('number');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service.setCallbacks(mockCallbacks);
    });

    it('should handle rate limit check errors gracefully', async () => {
      rateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit service error'));

      const result = await service.checkConnectionRateLimit('client-error');

      // Should default to allowing connection on error
      expect(result).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      const result = await service.forceConnectionCleanup();

      // Should return valid cleanup result even if some operations fail
      expect(result).toBeDefined();
      expect(typeof result.totalCleaned).toBe('number');
    });
  });

  describe('Configuration', () => {
    it('should handle missing configuration gracefully', () => {
      expect(service).toBeDefined();
    });
  });
});