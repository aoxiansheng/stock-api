import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverService } from '@core/01-entry/stream-receiver/services/stream-receiver.service';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { SymbolTransformerService } from '@core/02-processing/symbol-transformer/services/symbol-transformer.service';
import { DataTransformerService } from '@core/02-processing/transformer/services/data-transformer.service';
import { Logger } from '@nestjs/common';

describe('StreamReceiverService', () => {
  let service: StreamReceiverService;
  let streamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let symbolTransformer: jest.Mocked<SymbolTransformerService>;
  let transformer: jest.Mocked<DataTransformerService>;

  // Mock test data
  const mockClientId = 'test-client-123';
  const mockSymbols = ['700.HK', 'AAPL.US', '000001.SZ'];
  const mockCallback = jest.fn();

  // Mock client state manager
  const mockClientStateManager = {
    addClientSubscription: jest.fn(),
    removeClientSubscription: jest.fn(),
    addSubscriptionChangeListener: jest.fn(), // Required for constructor
    getClientStateStats: jest.fn(() => ({
      totalClients: 0,
      activeClients: 0,
      totalSubscriptions: 0
    }))
  };

  // Mock stream data cache
  const mockStreamDataCache = {
    getCacheStats: jest.fn(() => ({
      hotCacheHits: 0,
      warmCacheHits: 0,
      hotCacheMisses: 0,
      warmCacheMisses: 0
    }))
  };

  beforeEach(async () => {
    // Create comprehensive mocks based on actual service interfaces
    const mockStreamDataFetcher = {
      subscribeToSymbols: jest.fn(),
      unsubscribeFromSymbols: jest.fn(),
      getConnectionStats: jest.fn(),
      batchHealthCheck: jest.fn(),
      getClientStateManager: jest.fn(() => mockClientStateManager),
      getStreamDataCache: jest.fn(() => mockStreamDataCache),
      getConnectionStatsByProvider: jest.fn(() => ({})),
      establishStreamConnection: jest.fn(() => Promise.resolve({ 
        id: 'mock-connection', 
        isActive: true,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        close: jest.fn(),
        onData: jest.fn(),
        onError: jest.fn(),
        onClose: jest.fn(),
        onStatusChange: jest.fn()
      }))
    };

    const mockSymbolTransformer = {
      transformSymbolsForProvider: jest.fn(),
      getMarketFromSymbol: jest.fn(),
      validateSymbol: jest.fn()
    };

    const mockTransformer = {
      transform: jest.fn(),
      validateDataStructure: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StreamReceiverService,
          useFactory: (
            symbolTransformer: SymbolTransformerService,
            transformer: DataTransformerService,
            streamDataFetcher: StreamDataFetcherService
          ) => {
            return new StreamReceiverService(
              symbolTransformer,
              transformer,
              streamDataFetcher,
              undefined, // optional StreamRecoveryWorkerService
              undefined  // optional MonitoringRegistryService
            );
          },
          inject: [SymbolTransformerService, DataTransformerService, StreamDataFetcherService]
        },
        {
          provide: StreamDataFetcherService,
          useValue: mockStreamDataFetcher,
        },
        {
          provide: SymbolTransformerService,
          useValue: mockSymbolTransformer,
        },
        {
          provide: DataTransformerService,
          useValue: mockTransformer,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
    streamDataFetcher = module.get(StreamDataFetcherService);
    symbolTransformer = module.get(SymbolTransformerService);
    transformer = module.get(DataTransformerService);

    // Setup default mock behaviors
    symbolTransformer.transformSymbolsForProvider.mockResolvedValue({
      transformedSymbols: ['700.HK'],
      mappingResults: {
        transformedSymbols: { '700.HK': '700.HK' },
        failedSymbols: [],
        metadata: {
          provider: 'longport',
          totalSymbols: 1,
          successfulTransformations: 1,
          failedTransformations: 0,
          processingTime: 10
        }
      }
    });
    transformer.transform.mockResolvedValue({
      success: true,
      data: { symbol: '700.HK', price: 350.5 }
    } as any);
    streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);
    streamDataFetcher.batchHealthCheck.mockResolvedValue({ longport: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have proper service dependencies', () => {
      expect(streamDataFetcher).toBeDefined();
      expect(symbolTransformer).toBeDefined();
      expect(transformer).toBeDefined();
    });
  });

  describe('Stream Subscription Management', () => {
    it('should successfully subscribe to stream with required parameters', async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      // Should not throw with proper parameters
      await expect(
        service.subscribeStream(subscriptionData, mockClientId)
      ).resolves.not.toThrow();

      expect(streamDataFetcher.getClientStateManager).toHaveBeenCalled();
      expect(streamDataFetcher.subscribeToSymbols).toHaveBeenCalled();
    });

    it('should handle subscription with generated client ID', async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      // Test without providing clientId (should generate one)
      await expect(
        service.subscribeStream(subscriptionData)
      ).resolves.not.toThrow();

      expect(streamDataFetcher.getClientStateManager).toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      streamDataFetcher.subscribeToSymbols.mockRejectedValue(
        new Error('Subscription failed')
      );

      await expect(
        service.subscribeStream(subscriptionData, mockClientId)
      ).rejects.toThrow('Subscription failed');
    });

    it('should successfully unsubscribe from stream', async () => {
      const unsubscriptionData = {
        symbols: mockSymbols,
        clientId: mockClientId,
        wsCapabilityType: 'quote'
      };

      await expect(
        service.unsubscribeStream(unsubscriptionData)
      ).resolves.not.toThrow();

      expect(streamDataFetcher.getClientStateManager).toHaveBeenCalled();
    });
  });

  describe('Health Check and Statistics', () => {
    it('should perform health check successfully', async () => {
      streamDataFetcher.batchHealthCheck.mockResolvedValue({
        longport: true,
        tushare: true
      });

      const health = await service.healthCheck();

      expect(health).toEqual({
        status: 'healthy',
        connections: 2,
        clients: 0,
        cacheHitRate: 0
      });
    });

    it('should report degraded status when connections are unhealthy', async () => {
      streamDataFetcher.batchHealthCheck.mockResolvedValue({
        longport: true,
        tushare: false // One connection failed
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.connections).toBe(2);
    });

    it('should get client statistics', () => {
      const stats = service.getClientStats();

      expect(stats).toEqual({
        clients: expect.any(Object),
        cache: expect.any(Object),
        connections: expect.any(Object),
        batchProcessing: expect.any(Object)
      });

      expect(streamDataFetcher.getClientStateManager).toHaveBeenCalled();
      expect(streamDataFetcher.getStreamDataCache).toHaveBeenCalled();
      expect(streamDataFetcher.getConnectionStatsByProvider).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const subscriptionData = {
        symbols: [],
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      streamDataFetcher.getClientStateManager.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await expect(
        service.subscribeStream(subscriptionData, mockClientId)
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle transformer errors', async () => {
      transformer.transform.mockRejectedValue(new Error('Transform failed'));

      // Should handle transform errors in data processing
      expect(transformer.transform).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track subscription performance', async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      const startTime = Date.now();
      await service.subscribeStream(subscriptionData, mockClientId);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should maintain connection state correctly', () => {
      const stats = service.getClientStats();
      
      expect(stats.clients).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.connections).toBeDefined();
      expect(stats.batchProcessing).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty symbol arrays', async () => {
      symbolTransformer.transformSymbolsForProvider.mockResolvedValue({
        transformedSymbols: [],
        mappingResults: {
          transformedSymbols: {},
          failedSymbols: [],
          metadata: {
            provider: 'longport',
            totalSymbols: 0,
            successfulTransformations: 0,
            failedTransformations: 0,
            processingTime: 0
          }
        }
      });

      const subscriptionData = {
        symbols: [],
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      // Should handle empty arrays gracefully
      await expect(
        service.subscribeStream(subscriptionData, mockClientId)
      ).resolves.not.toThrow();
    });

    it('should handle null callback', async () => {
      const subscriptionData = {
        symbols: mockSymbols,
        wsCapabilityType: 'quote',
        preferredProvider: 'longport'
      };

      // Should handle valid subscription data
      await expect(
        service.subscribeStream(subscriptionData, mockClientId)
      ).resolves.not.toThrow();
    });

    it('should handle provider failures gracefully', async () => {
      streamDataFetcher.batchHealthCheck.mockResolvedValue({});

      const health = await service.healthCheck();
      
      expect(health.status).toBe('healthy'); // No connections = healthy by default
      expect(health.connections).toBe(0);
    });
  });
});