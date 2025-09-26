import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import {
  Provider,
  ProviderConfig,
  HealthCheck,
  Initialize,
  getProviderMetadata,
  isProviderRegistered,
  getProviderConfig,
  getProviderHealthChecks,
  getProviderInitMethod,
  registerProviders,
} from '@providers/decorators/provider.decorator';
import { CapabilityCollector } from '@providers/decorators/capability-collector';
import { METADATA_KEYS } from '@providers/constants/metadata.constants';

// Mock the CapabilityCollector
jest.mock('@providers/decorators/capability-collector', () => ({
  CapabilityCollector: {
    registerProvider: jest.fn(),
  },
}));

describe('Provider Decorator', () => {
  let mockCapabilityCollector: jest.Mocked<typeof CapabilityCollector>;

  beforeEach(() => {
    mockCapabilityCollector = CapabilityCollector as any;
    mockCapabilityCollector.registerProvider.mockClear();

    // Clear any existing metadata
    jest.clearAllMocks();
  });

  describe('@Provider', () => {
    it('should apply provider metadata with default values', () => {
      @Provider({ name: 'test-provider' })
      class TestProvider {}

      const metadata = getProviderMetadata(TestProvider);
      expect(metadata).toEqual({
        name: 'test-provider',
        autoRegister: true,
        healthCheck: true,
        initPriority: 1,
      });
    });

    it('should override default values with provided options', () => {
      @Provider({
        name: 'test-provider',
        description: 'Test Provider Description',
        autoRegister: false,
        healthCheck: false,
        initPriority: 5,
      })
      class TestProvider {}

      const metadata = getProviderMetadata(TestProvider);
      expect(metadata).toEqual({
        name: 'test-provider',
        description: 'Test Provider Description',
        autoRegister: false,
        healthCheck: false,
        initPriority: 5,
      });
    });

    it('should register provider with CapabilityCollector', () => {
      const providerMetadata = { name: 'test-provider', autoRegister: true };

      @Provider(providerMetadata)
      class TestProvider {}

      expect(mockCapabilityCollector.registerProvider).toHaveBeenCalledWith(
        expect.objectContaining(providerMetadata),
        TestProvider
      );
    });

    it('should apply Injectable decorator', () => {
      @Provider({ name: 'test-provider' })
      class TestProvider {}

      // Check if the class has been decorated with @Injectable
      const injectableMetadata = Reflect.getMetadata('__injectable__', TestProvider);
      expect(injectableMetadata).toBeDefined();
    });

    it('should throw error if name is not provided', () => {
      expect(() => {
        @Provider({} as any)
        class TestProvider {}
      }).toThrow('提供商 TestProvider 必须指定 name 属性');
    });

    it('should mark provider as registered', () => {
      @Provider({ name: 'test-provider' })
      class TestProvider {}

      expect(isProviderRegistered(TestProvider)).toBe(true);
    });

    it('should store metadata using correct metadata keys', () => {
      @Provider({ name: 'test-provider' })
      class TestProvider {}

      const storedMetadata = Reflect.getMetadata(
        METADATA_KEYS.PROVIDER_METADATA,
        TestProvider
      );
      const registrationFlag = Reflect.getMetadata('provider:registered', TestProvider);

      expect(storedMetadata).toBeDefined();
      expect(storedMetadata.name).toBe('test-provider');
      expect(registrationFlag).toBe(true);
    });
  });

  describe('@ProviderConfig', () => {
    it('should store configuration metadata', () => {
      const config = { apiUrl: 'https://api.example.com', timeout: 5000 };

      @ProviderConfig(config)
      class TestProvider {}

      const storedConfig = getProviderConfig(TestProvider);
      expect(storedConfig).toEqual(config);
    });

    it('should merge multiple configurations', () => {
      @ProviderConfig({ apiUrl: 'https://api.example.com' })
      @ProviderConfig({ timeout: 5000, retries: 3 })
      class TestProvider {}

      const storedConfig = getProviderConfig(TestProvider);
      expect(storedConfig).toEqual({
        apiUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
      });
    });

    it('should override existing configuration values', () => {
      @ProviderConfig({ timeout: 3000, retries: 2 })
      @ProviderConfig({ timeout: 5000 }) // This should override the timeout
      class TestProvider {}

      const storedConfig = getProviderConfig(TestProvider);
      expect(storedConfig.timeout).toBe(5000);
      expect(storedConfig.retries).toBe(2);
    });

    it('should return empty object if no config is set', () => {
      class TestProvider {}

      const storedConfig = getProviderConfig(TestProvider);
      expect(storedConfig).toEqual({});
    });
  });

  describe('@HealthCheck', () => {
    it('should store health check metadata with default options', () => {
      class TestProvider {
        @HealthCheck()
        async checkHealth(): Promise<boolean> {
          return true;
        }
      }

      const healthChecks = getProviderHealthChecks(TestProvider);
      expect(healthChecks).toHaveLength(1);
      expect(healthChecks[0]).toEqual({
        methodName: 'checkHealth',
        options: {
          interval: 60000,
          timeout: expect.any(Number),
        },
      });
    });

    it('should override default options', () => {
      class TestProvider {
        @HealthCheck({ interval: 30000, timeout: 15000 })
        async checkHealth(): Promise<boolean> {
          return true;
        }
      }

      const healthChecks = getProviderHealthChecks(TestProvider);
      expect(healthChecks[0].options).toEqual({
        interval: 30000,
        timeout: 15000,
      });
    });

    it('should support multiple health check methods', () => {
      class TestProvider {
        @HealthCheck({ interval: 30000 })
        async checkHealth(): Promise<boolean> {
          return true;
        }

        @HealthCheck({ interval: 60000 })
        async checkConnection(): Promise<boolean> {
          return true;
        }
      }

      const healthChecks = getProviderHealthChecks(TestProvider);
      expect(healthChecks).toHaveLength(2);
      expect(healthChecks[0].methodName).toBe('checkHealth');
      expect(healthChecks[1].methodName).toBe('checkConnection');
    });

    it('should return empty array if no health checks are defined', () => {
      class TestProvider {}

      const healthChecks = getProviderHealthChecks(TestProvider);
      expect(healthChecks).toEqual([]);
    });

    it('should store metadata on constructor', () => {
      class TestProvider {
        @HealthCheck()
        async checkHealth(): Promise<boolean> {
          return true;
        }
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.HEALTH_CHECK_METADATA,
        TestProvider
      );
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(1);
    });
  });

  describe('@Initialize', () => {
    it('should store initialization metadata with default options', () => {
      class TestProvider {
        @Initialize()
        async setup(): Promise<void> {
          // Setup logic
        }
      }

      const initMethod = getProviderInitMethod(TestProvider);
      expect(initMethod).toEqual({
        methodName: 'setup',
        options: {
          priority: 1,
          timeout: expect.any(Number),
        },
      });
    });

    it('should override default options', () => {
      class TestProvider {
        @Initialize({ priority: 5, timeout: 20000 })
        async initialize(): Promise<void> {
          // Initialize logic
        }
      }

      const initMethod = getProviderInitMethod(TestProvider);
      expect(initMethod?.options).toEqual({
        priority: 5,
        timeout: 20000,
      });
    });

    it('should return undefined if no init method is defined', () => {
      class TestProvider {}

      const initMethod = getProviderInitMethod(TestProvider);
      expect(initMethod).toBeUndefined();
    });

    it('should only store the last decorated method as init method', () => {
      class TestProvider {
        @Initialize({ priority: 1 })
        async setup(): Promise<void> {
          // Setup logic
        }

        @Initialize({ priority: 2 })
        async initialize(): Promise<void> {
          // Initialize logic
        }
      }

      const initMethod = getProviderInitMethod(TestProvider);
      expect(initMethod?.methodName).toBe('initialize');
      expect(initMethod?.options.priority).toBe(2);
    });
  });

  describe('Utility Functions', () => {
    describe('getProviderMetadata', () => {
      it('should return undefined for non-decorated class', () => {
        class NonDecoratedProvider {}

        const metadata = getProviderMetadata(NonDecoratedProvider);
        expect(metadata).toBeUndefined();
      });
    });

    describe('isProviderRegistered', () => {
      it('should return false for non-decorated class', () => {
        class NonDecoratedProvider {}

        expect(isProviderRegistered(NonDecoratedProvider)).toBe(false);
      });
    });

    describe('registerProviders', () => {
      it('should register multiple providers in batch', () => {
        const providers = [
          {
            metadata: { name: 'provider-1', autoRegister: true },
            target: class Provider1 {} as any,
          },
          {
            metadata: { name: 'provider-2', autoRegister: false },
            target: class Provider2 {} as any,
          },
        ];

        registerProviders(providers);

        expect(mockCapabilityCollector.registerProvider).toHaveBeenCalledTimes(2);
        expect(mockCapabilityCollector.registerProvider).toHaveBeenCalledWith(
          providers[0].metadata,
          providers[0].target
        );
        expect(mockCapabilityCollector.registerProvider).toHaveBeenCalledWith(
          providers[1].metadata,
          providers[1].target
        );
      });

      it('should handle empty providers array', () => {
        registerProviders([]);

        expect(mockCapabilityCollector.registerProvider).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work with all decorators combined', () => {
      @Provider({
        name: 'integrated-provider',
        description: 'Fully integrated provider',
        autoRegister: true,
        healthCheck: true,
        initPriority: 3,
      })
      @ProviderConfig({
        apiUrl: 'https://api.example.com',
        timeout: 10000,
        retries: 2,
      })
      class IntegratedProvider {
        @Initialize({ priority: 3, timeout: 30000 })
        async initialize(): Promise<void> {
          // Initialize
        }

        @HealthCheck({ interval: 45000, timeout: 5000 })
        async checkHealth(): Promise<boolean> {
          return true;
        }
      }

      // Test provider metadata
      const metadata = getProviderMetadata(IntegratedProvider);
      expect(metadata?.name).toBe('integrated-provider');
      expect(metadata?.initPriority).toBe(3);

      // Test configuration
      const config = getProviderConfig(IntegratedProvider);
      expect(config.apiUrl).toBe('https://api.example.com');

      // Test initialization method
      const initMethod = getProviderInitMethod(IntegratedProvider);
      expect(initMethod?.methodName).toBe('initialize');
      expect(initMethod?.options.priority).toBe(3);

      // Test health check methods
      const healthChecks = getProviderHealthChecks(IntegratedProvider);
      expect(healthChecks).toHaveLength(1);
      expect(healthChecks[0].methodName).toBe('checkHealth');

      // Test registration
      expect(isProviderRegistered(IntegratedProvider)).toBe(true);
      expect(mockCapabilityCollector.registerProvider).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle reflection metadata errors gracefully', () => {
      // Mock Reflect.getMetadata to throw an error
      const originalGetMetadata = Reflect.getMetadata;
      Reflect.getMetadata = jest.fn().mockImplementation(() => {
        throw new Error('Reflection error');
      });

      expect(() => {
        class TestProvider {}
        isProviderRegistered(TestProvider);
      }).not.toThrow();

      // Restore original function
      Reflect.getMetadata = originalGetMetadata;
    });

    it('should handle missing name gracefully in error message', () => {
      // Create anonymous class to test error message
      const AnonymousClass = class {};
      Object.defineProperty(AnonymousClass, 'name', { value: '' });

      expect(() => {
        Provider({} as any)(AnonymousClass);
      }).toThrow('提供商  必须指定 name 属性');
    });
  });
});