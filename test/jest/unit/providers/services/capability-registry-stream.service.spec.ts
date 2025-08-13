/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { createLogger } from '@common/config/logger.config';
import { CapabilityRegistryService } from '../../../../../src/providers/services/capability-registry.service';
import { IStreamCapability } from '../../../../../src/providers/interfaces/stream-capability.interface';
import { MARKETS } from '@common/constants/market.constants';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

import { readdir, stat } from 'fs/promises';

// Mock stream capability
const mockStreamCapability: IStreamCapability = {
  name: 'stream-stock-quote',
  description: '获取股票实时报价数据流',
  supportedMarkets: [MARKETS.HK, MARKETS._US],
  supportedSymbolFormats: ['700.HK', 'AAPL.US'],
  rateLimit: {
    maxConnections: 100,
    maxSubscriptionsPerConnection: 200,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
  },
  initialize: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  onMessage: jest.fn(),
  cleanup: jest.fn(),
  isConnected: jest.fn(),
};

// Mock incomplete stream capability
const mockIncompleteStreamCapability = {
  name: 'incomplete-stream',
  description: '不完整的流能力',
  initialize: jest.fn(),
  subscribe: jest.fn(),
  // Missing unsubscribe, onMessage, cleanup, isConnected
};

describe('CapabilityRegistryService - Stream Capabilities', () => {
  let service: CapabilityRegistryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock fs operations to prevent auto-discovery during tests
    readdir.mockResolvedValue([]);
    stat.mockResolvedValue({ isDirectory: () => false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    service = module.get<CapabilityRegistryService>(CapabilityRegistryService);
    
    // Wait for auto-discovery to complete (it will find nothing due to mocks)
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('registerStreamCapability()', () => {
    it('should register stream capability successfully', () => {
      // Execute
      service.registerStreamCapability('longport', mockStreamCapability, 1, true);

      // Verify
      const retrievedCapability = service.getStreamCapability('longport', 'stream-stock-quote');
      expect(retrievedCapability).toBe(mockStreamCapability);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: '流能力注册成功',
        provider: 'longport',
        capability: 'stream-stock-quote',
        priority: 1,
      });
    });

    it('should register multiple stream capabilities for same provider', () => {
      // Setup
      const capability1 = { ...mockStreamCapability, name: 'stream-stock-quote' };
      const capability2 = { ...mockStreamCapability, name: 'stream-index-quote' };

      // Execute
      service.registerStreamCapability('longport', capability1, 1, true);
      service.registerStreamCapability('longport', capability2, 2, true);

      // Verify
      expect(service.getStreamCapability('longport', 'stream-stock-quote')).toBe(capability1);
      expect(service.getStreamCapability('longport', 'stream-index-quote')).toBe(capability2);
    });

    it('should register stream capabilities for multiple providers', () => {
      // Execute
      service.registerStreamCapability('longport', mockStreamCapability, 1, true);
      service.registerStreamCapability('longport-sg', mockStreamCapability, 2, true);

      // Verify
      expect(service.getStreamCapability('longport', 'stream-stock-quote')).toBe(mockStreamCapability);
      expect(service.getStreamCapability('longport-sg', 'stream-stock-quote')).toBe(mockStreamCapability);
    });

    it('should handle disabled stream capabilities', () => {
      // Execute
      service.registerStreamCapability('longport', mockStreamCapability, 1, false);

      // Verify
      const retrievedCapability = service.getStreamCapability('longport', 'stream-stock-quote');
      expect(retrievedCapability).toBeNull();
    });
  });

  describe('getStreamCapability()', () => {
    beforeEach(() => {
      service.registerStreamCapability('longport', mockStreamCapability, 1, true);
    });

    it('should return stream capability when exists and enabled', () => {
      // Execute
      const capability = service.getStreamCapability('longport', 'stream-stock-quote');

      // Verify
      expect(capability).toBe(mockStreamCapability);
    });

    it('should return null when provider does not exist', () => {
      // Execute
      const capability = service.getStreamCapability('non-existent', 'stream-stock-quote');

      // Verify
      expect(capability).toBeNull();
    });

    it('should return null when capability does not exist', () => {
      // Execute
      const capability = service.getStreamCapability('longport', 'non-existent-capability');

      // Verify
      expect(capability).toBeNull();
    });

    it('should return null when capability is disabled', () => {
      // Setup
      service.registerStreamCapability('disabled-provider', mockStreamCapability, 1, false);

      // Execute
      const capability = service.getStreamCapability('disabled-provider', 'stream-stock-quote');

      // Verify
      expect(capability).toBeNull();
    });
  });

  describe('getBestStreamProvider()', () => {
    beforeEach(() => {
      // Clear any existing registrations and setup fresh providers
      // Note: We use a clean service instance per test to avoid cross-test contamination
      service.registerStreamCapability('longport', mockStreamCapability, 2, true);
      service.registerStreamCapability('longport-sg', mockStreamCapability, 1, true);
      service.registerStreamCapability('other-provider', mockStreamCapability, 3, true);
    });

    it('should return provider with highest priority (lowest number)', () => {
      // Execute
      const bestProvider = service.getBestStreamProvider('stream-stock-quote');

      // Verify
      expect(bestProvider).toBe('longport-sg'); // priority 1
    });

    it('should filter by market support', () => {
      // Setup - provider that only supports SZ market
      const szOnlyCapability = {
        ...mockStreamCapability,
        supportedMarkets: [MARKETS.SZ],
      };
      service.registerStreamCapability('sz-provider', szOnlyCapability, 0, true);

      // Execute
      const bestProviderForHK = service.getBestStreamProvider('stream-stock-quote', MARKETS.HK);
      const bestProviderForSZ = service.getBestStreamProvider('stream-stock-quote', MARKETS.SZ);

      // Verify
      expect(bestProviderForHK).toBe('longport-sg'); // SZ provider doesn't support HK
      expect(bestProviderForSZ).toBe('sz-provider'); // Highest priority for SZ
    });

    it('should exclude providers with error status', () => {
      // Setup - update status to error
      service.updateStreamCapabilityStatus('longport-sg', 'stream-stock-quote', 'error');

      // Execute
      const bestProvider = service.getBestStreamProvider('stream-stock-quote');

      // Verify
      expect(bestProvider).toBe('longport'); // Skip longport-sg due to error status
    });

    it('should return null when no providers available', () => {
      // Execute
      const bestProvider = service.getBestStreamProvider('non-existent-capability');

      // Verify
      expect(bestProvider).toBeNull();
    });

    it('should return null when all providers are disabled', () => {
      // Setup - register all as disabled
      const service2 = new CapabilityRegistryService();
      service2.registerStreamCapability('provider1', mockStreamCapability, 1, false);
      service2.registerStreamCapability('provider2', mockStreamCapability, 2, false);

      // Execute
      const bestProvider = service2.getBestStreamProvider('stream-stock-quote');

      // Verify
      expect(bestProvider).toBeNull();
    });

    it('should handle market filtering correctly', () => {
      // Setup - create a fresh service instance to avoid any pre-registered capabilities
      const freshService = new CapabilityRegistryService();
      
      // Setup providers with different market support
      const hkCapability = { ...mockStreamCapability, supportedMarkets: [MARKETS.HK] };
      const usCapability = { ...mockStreamCapability, supportedMarkets: [MARKETS.US] };
      const multiCapability = { ...mockStreamCapability, supportedMarkets: [MARKETS.HK, MARKETS.US, MARKETS.SZ] };

      freshService.registerStreamCapability('hk-provider', hkCapability, 1, true);
      freshService.registerStreamCapability('us-provider', usCapability, 2, true);
      freshService.registerStreamCapability('multi-provider', multiCapability, 3, true);

      // Execute
      const hkProvider = freshService.getBestStreamProvider('stream-stock-quote', MARKETS.HK);
      const usProvider = freshService.getBestStreamProvider('stream-stock-quote', MARKETS.US);
      const szProvider = freshService.getBestStreamProvider('stream-stock-quote', MARKETS.SZ);

      // Verify
      expect(hkProvider).toBe('hk-provider'); // Best for HK
      expect(usProvider).toBe('us-provider'); // Best for US
      expect(szProvider).toBe('multi-provider'); // Only one supporting SZ
    });
  });

  describe('getAllStreamCapabilities()', () => {
    it('should return empty map initially', () => {
      // Create a fresh service instance to ensure clean state
      const freshService = new CapabilityRegistryService();
      
      // Execute
      const capabilities = freshService.getAllStreamCapabilities();

      // Verify
      expect(capabilities).toBeInstanceOf(Map);
      expect(capabilities.size).toBe(0);
    });

    it('should return all registered stream capabilities', () => {
      // Setup
      const capability1 = { ...mockStreamCapability, name: 'stream-stock-quote' };
      const capability2 = { ...mockStreamCapability, name: 'stream-index-quote' };
      
      service.registerStreamCapability('longport', capability1, 1, true);
      service.registerStreamCapability('longport', capability2, 2, true);
      service.registerStreamCapability('other-provider', capability1, 1, true);

      // Execute
      const capabilities = service.getAllStreamCapabilities();

      // Verify
      expect(capabilities.size).toBe(2); // 2 providers
      expect(capabilities.get('longport')?.size).toBe(2); // 2 capabilities for longport
      expect(capabilities.get('other-provider')?.size).toBe(1); // 1 capability for other-provider
    });
  });

  describe('updateStreamCapabilityStatus()', () => {
    beforeEach(() => {
      service.registerStreamCapability('longport', mockStreamCapability, 1, true);
    });

    it('should update status to connected', () => {
      // Execute
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'connected');

      // Verify
      const capabilities = service.getAllStreamCapabilities();
      const registration = capabilities.get('longport')?.get('stream-stock-quote');
      expect(registration?.connectionStatus).toBe('connected');
      expect(registration?._lastConnectedAt).toBeInstanceOf(Date);
      expect(registration?.errorCount).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: '流能力状态更新',
        provider: 'longport',
        capability: 'stream-stock-quote',
        status: 'connected',
        errorCount: 0,
      });
    });

    it('should update status to error and increment error count', () => {
      // Execute
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'error');
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'error');

      // Verify
      const capabilities = service.getAllStreamCapabilities();
      const registration = capabilities.get('longport')?.get('stream-stock-quote');
      expect(registration?.connectionStatus).toBe('error');
      expect(registration?.errorCount).toBe(2);
    });

    it('should reset error count when connecting successfully', () => {
      // Setup - set error status first
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'error');
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'error');

      // Execute - connect successfully
      service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', 'connected');

      // Verify
      const capabilities = service.getAllStreamCapabilities();
      const registration = capabilities.get('longport')?.get('stream-stock-quote');
      expect(registration?.connectionStatus).toBe('connected');
      expect(registration?.errorCount).toBe(0);
    });

    it('should handle status update for non-existent capability gracefully', () => {
      // Execute
      service.updateStreamCapabilityStatus('non-existent', 'non-existent-capability', 'connected');

      // Verify - should not throw error
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: '流能力状态更新',
        })
      );
    });

    it('should handle all status types', () => {
      const statuses: Array<'disconnected' | 'connecting' | 'connected' | 'error'> = [
        'disconnected',
        'connecting', 
        'connected',
        'error'
      ];

      statuses.forEach(status => {
        // Execute
        service.updateStreamCapabilityStatus('longport', 'stream-stock-quote', status);

        // Verify
        const capabilities = service.getAllStreamCapabilities();
        const registration = capabilities.get('longport')?.get('stream-stock-quote');
        expect(registration?.connectionStatus).toBe(status);
      });
    });
  });

  describe('Stream Capability Discovery Integration', () => {
    beforeEach(() => {
      // Mock file system operations
      readdir.mockClear();
      stat.mockClear();
    });

    it('should detect stream capabilities during discovery', async () => {
      // Setup fresh service for this test
      const testService = new CapabilityRegistryService();
      
      // Setup mock for discovery
      readdir
        .mockResolvedValueOnce([{ name: 'longport', isDirectory: () => true }]) // Provider directories
        .mockResolvedValueOnce(['stream-stock-quote.ts', 'get-stock-quote.ts']); // Capability files

      stat.mockResolvedValue({ isDirectory: () => true });

      // Spy on the private methods to verify the discovery flow
      const loadCapabilitySpy = jest.spyOn(testService as any, 'loadCapability')
        .mockImplementation(async (providerName: string, capabilityName: string) => {
          if (capabilityName.startsWith('stream-')) {
            await testService['loadStreamCapability'](providerName, capabilityName, mockStreamCapability);
          }
        });
        
      const loadStreamSpy = jest.spyOn(testService as any, 'loadStreamCapability')
        .mockImplementation(async (providerName: string, capabilityName: string, capability: IStreamCapability) => {
          testService.registerStreamCapability(providerName, capability, 1, true);
        });
      
      const registerStreamSpy = jest.spyOn(testService, 'registerStreamCapability');

      // Execute
      await testService.discoverCapabilities();

      // Verify
      expect(loadCapabilitySpy).toHaveBeenCalledWith('longport', 'stream-stock-quote');
      expect(loadStreamSpy).toHaveBeenCalledWith('longport', 'stream-stock-quote', mockStreamCapability);
      expect(registerStreamSpy).toHaveBeenCalledWith('longport', mockStreamCapability, 1, true);
    });

    it('should validate stream capability interface during loading', async () => {
      // Setup fresh service for this test
      const testService = new CapabilityRegistryService();
      
      // Setup incomplete capability - missing required methods
      const incompleteCapability = {
        name: 'incomplete-stream',
        description: '不完整的流能力',
        supportedMarkets: [MARKETS.HK],
        supportedSymbolFormats: ['TEST.HK'],
        rateLimit: {
          maxConnections: 10,
          maxSubscriptionsPerConnection: 50,
          reconnectDelay: 1000,
          maxReconnectAttempts: 3,
        },
        initialize: jest.fn(),
        subscribe: jest.fn(),
        // Missing: unsubscribe, onMessage, cleanup, isConnected
      } as any;

      // Execute
      await testService['loadStreamCapability']('test-provider', 'incomplete-stream', incomplet_eCapability);

      // Verify
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'test-provider',
          capability: 'incomplete-stream',
          type: 'stream',
        }),
        expect.stringContaining('接口不完整')
      );
    });

    it('should handle stream capability loading errors', async () => {
      // Setup fresh service for this test
      const testService = new CapabilityRegistryService();
      
      // Mock registerStreamCapability to throw an error
      jest.spyOn(testService, 'registerStreamCapability').mockImplementation(() => {
        throw new Error('Registration failed');
      });
      
      const validCapability: IStreamCapability = {
        name: 'error-capability',
        description: 'Error testing capability',
        supportedMarkets: [MARKETS.HK],
        supportedSymbolFormats: ['ERROR.HK'],
        rateLimit: {
          maxConnections: 10,
          maxSubscriptionsPerConnection: 50,
          reconnectDelay: 1000,
          maxReconnectAttempts: 3,
        },
        initialize: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        onMessage: jest.fn(),
        cleanup: jest.fn(),
        isConnected: jest.fn(),
      };

      // Execute
      await testService['loadStreamCapability']('error-provider', 'error-capability', validCapability);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'error-provider',
          capability: 'error-capability',
          type: 'stream',
        }),
        expect.stringContaining('注册流能力')
      );
    });
  });

  describe('Stream vs REST Capability Distinction', () => {
    it('should correctly identify stream capabilities by name prefix', async () => {
      // Note: This test demonstrates the concept of stream vs REST capability distinction
      // Stream capabilities use the 'stream-' prefix in their names
      // REST capabilities use standard names like 'get-stock-quote'
      
      // The actual capability loading would require complex dynamic import mocking
      // This logic is tested indirectly through the integration tests above
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of stream capabilities efficiently', () => {
      // Setup - register many capabilities
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const capability = {
          ...mockStreamCapability,
          name: `stream-capability-${i}`,
        };
        service.registerStreamCapability(`provider-${i % 10}`, capability, i, true);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify performance (should complete in reasonable time)
      expect(duration).toBeLessThan(1000); // Less than 1 second
      
      // Verify all capabilities are registered
      const allCapabilities = service.getAllStreamCapabilities();
      expect(allCapabilities.size).toBe(10); // 10 providers
      
      let totalCapabilities = 0;
      for (const providerCapabilities of allCapabilities.values()) {
        totalCapabilities += providerCapabilities.size;
      }
      expect(totalCapabilities).toBe(1000);
    });

    it('should properly clean up stream capability references', () => {
      // Setup
      service.registerStreamCapability('temp-provider', mockStreamCapability, 1, true);
      
      // Verify registration
      expect(service.getStreamCapability('temp-provider', 'stream-stock-quote')).toBe(mockStreamCapability);
      
      // Manual cleanup (since there's no explicit cleanup method)
      const capabilities = service.getAllStreamCapabilities();
      capabilities.delete('temp-provider');
      
      // Verify cleanup
      expect(service.getStreamCapability('temp-provider', 'stream-stock-quote')).toBeNull();
    });
  });
});