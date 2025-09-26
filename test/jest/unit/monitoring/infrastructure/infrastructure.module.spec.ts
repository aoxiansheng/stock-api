/**
 * InfrastructureModule Unit Tests
 * 测试监控基础设施模块的配置和依赖注入
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InfrastructureModule } from '@monitoring/infrastructure/infrastructure.module';
// RedisModule import removed - Redis functionality is handled through CacheModule
import { MetricsModule } from '@monitoring/infrastructure/metrics/metrics.module';
import { FeatureFlags } from '@appcore/config/feature-flags.config';
import { MonitoringEventBridgeService } from '@monitoring/infrastructure/bridge/monitoring-event-bridge.service';
import { ApiMonitoringInterceptor } from '@monitoring/infrastructure/interceptors/api-monitoring.interceptor';

// Mock external modules
// RedisModule mock removed - Redis functionality is handled through CacheModule
jest.mock('@monitoring/infrastructure/metrics/metrics.module');
jest.mock('@appcore/config/feature-flags.config');
jest.mock('@monitoring/infrastructure/bridge/monitoring-event-bridge.service');
jest.mock('@monitoring/infrastructure/interceptors/api-monitoring.interceptor');

describe('InfrastructureModule', () => {
  let module: TestingModule;
  let moduleRef: ModuleRef;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    const moduleRefMock = {
      get: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [InfrastructureModule],
    })
      .overrideProvider(ModuleRef)
      .useValue(moduleRefMock)
      .overrideProvider(EventEmitter2)
      .useValue(mockEventEmitter)
      .compile();

    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should import required modules', () => {
      const imports = Reflect.getMetadata('imports', InfrastructureModule) || [];

      // RedisModule check removed - Redis functionality is handled through CacheModule
      expect(imports).toContain(MetricsModule);
    });

    it('should export required services', () => {
      const exports = Reflect.getMetadata('exports', InfrastructureModule) || [];

      // RedisModule check removed - Redis functionality is handled through CacheModule
      expect(exports).toContain(MetricsModule);
      expect(exports).toContain(FeatureFlags);
      expect(exports).toContain(MonitoringEventBridgeService);
      expect(exports).toContain(ApiMonitoringInterceptor);
    });

    it('should configure required providers', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];

      expect(providers).toContainEqual(FeatureFlags);
      expect(providers).toContainEqual(MonitoringEventBridgeService);
      expect(providers).toContainEqual(ApiMonitoringInterceptor);
    });
  });

  describe('EventEmitter2 Factory', () => {
    it('should configure EventEmitter2 with custom factory', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const eventEmitterProvider = providers.find(
        (p: any) => p && typeof p === 'object' && p.provide === EventEmitter2
      );

      expect(eventEmitterProvider).toBeDefined();
      expect(eventEmitterProvider.useFactory).toBeDefined();
      expect(eventEmitterProvider.inject).toContain(ModuleRef);
    });

    it('should use global EventEmitter2 instance when available', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const eventEmitterProvider = providers.find(
        (p: any) => p && typeof p === 'object' && p.provide === EventEmitter2
      );

      // Mock successful retrieval
      const mockModuleRef = { get: jest.fn().mockReturnValue(mockEventEmitter) };

      const result = eventEmitterProvider.useFactory(mockModuleRef);

      expect(mockModuleRef.get).toHaveBeenCalledWith(EventEmitter2, { strict: false });
      expect(result).toBe(mockEventEmitter);
    });

    it('should create fallback EventEmitter2 instance when global not available', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const eventEmitterProvider = providers.find(
        (p: any) => p && typeof p === 'object' && p.provide === EventEmitter2
      );

      // Mock failed retrieval
      const mockModuleRef = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('EventEmitter2 not found');
        })
      };

      // Mock console.warn to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = eventEmitterProvider.useFactory(mockModuleRef);

      expect(mockModuleRef.get).toHaveBeenCalledWith(EventEmitter2, { strict: false });
      expect(consoleSpy).toHaveBeenCalledWith('无法获取全局EventEmitter2，创建本地实例');
      expect(result).toBeInstanceOf(EventEmitter2);

      consoleSpy.mockRestore();
    });
  });

  describe('Module Integration', () => {
    it('should successfully compile the module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [InfrastructureModule],
      }).compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should allow getting FeatureFlags from providers', async () => {
      const testModule = await Test.createTestingModule({
        imports: [InfrastructureModule],
      }).compile();

      expect(() => testModule.get(FeatureFlags)).not.toThrow();
      await testModule.close();
    });

    it('should allow getting MonitoringEventBridgeService from providers', async () => {
      const testModule = await Test.createTestingModule({
        imports: [InfrastructureModule],
      }).compile();

      expect(() => testModule.get(MonitoringEventBridgeService)).not.toThrow();
      await testModule.close();
    });

    it('should allow getting ApiMonitoringInterceptor from providers', async () => {
      const testModule = await Test.createTestingModule({
        imports: [InfrastructureModule],
      }).compile();

      expect(() => testModule.get(ApiMonitoringInterceptor)).not.toThrow();
      await testModule.close();
    });
  });

  describe('Provider Dependencies', () => {
    it('should inject ModuleRef into EventEmitter2 factory', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const eventEmitterProvider = providers.find(
        (p: any) => p && typeof p === 'object' && p.provide === EventEmitter2
      );

      expect(eventEmitterProvider.inject).toEqual([ModuleRef]);
    });

    it('should have all required providers configured', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const providerTypes = providers.map((p: any) =>
        typeof p === 'object' && p.provide ? p.provide : p
      );

      expect(providerTypes).toContain(FeatureFlags);
      expect(providerTypes).toContain(MonitoringEventBridgeService);
      expect(providerTypes).toContain(ApiMonitoringInterceptor);
      expect(providerTypes).toContain(EventEmitter2);
    });
  });

  describe('Error Handling', () => {
    it('should handle EventEmitter2 factory errors gracefully', () => {
      const providers = Reflect.getMetadata('providers', InfrastructureModule) || [];
      const eventEmitterProvider = providers.find(
        (p: any) => p && typeof p === 'object' && p.provide === EventEmitter2
      );

      const mockModuleRef = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Module not found');
        })
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => {
        const result = eventEmitterProvider.useFactory(mockModuleRef);
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(EventEmitter2);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
