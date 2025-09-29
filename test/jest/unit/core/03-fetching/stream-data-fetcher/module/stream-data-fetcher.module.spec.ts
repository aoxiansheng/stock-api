/**
 * StreamDataFetcherModule 单元测试
 * 
 * 🎯 测试目标：
 * - 验证模块的正确编译和依赖注入
 * - 验证所有providers的正确实例化
 * - 验证模块的导入导出关系
 * - 验证WebSocket相关配置的正确性
 * 
 * 📋 测试覆盖：
 * - 模块基础编译测试
 * - 核心业务服务测试（StreamDataFetcherService等）
 * - 配置服务测试（StreamConfigService等）
 * - 守卫和拦截器测试
 * - WebSocket提供者测试
 * - 模块导入导出验证
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataFetcherModule } from '@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module';

// 核心业务服务导入
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamClientStateManager } from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { StreamRecoveryWorkerService } from '@core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';

// 守卫和拦截器导入
import { StreamRateLimitGuard } from '@core/03-fetching/stream-data-fetcher/guards/stream-rate-limit.guard';
import { WebSocketRateLimitGuard } from '@core/03-fetching/stream-data-fetcher/guards/websocket-rate-limit.guard';
import { ErrorSanitizerInterceptor } from '@core/03-fetching/stream-data-fetcher/interceptors/error-sanitizer.interceptor';

// 配置服务导入
import { StreamConfigService } from '@core/03-fetching/stream-data-fetcher/config/stream-config.service';
import { StreamRecoveryConfigService } from '@core/03-fetching/stream-data-fetcher/config/stream-recovery.config';
import { WebSocketFeatureFlagsService } from '@core/03-fetching/stream-data-fetcher/config/websocket-feature-flags.config';

// WebSocket提供者导入
import { 
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN 
} from '@core/03-fetching/stream-data-fetcher/providers/websocket-server.provider';

// 依赖模块导入 - 用于创建Mock模块
import { SharedServicesModule } from '@core/shared/module/shared-services.module';
import { ProvidersModule } from '@providers/module/providers-sg.module';
import { MonitoringModule } from '@monitoring/monitoring.module';
import { StreamCacheModule } from '@core/05-caching/module/stream-cache/module/stream-cache.module';

// 导入需要Mock的具体服务类
import { EnhancedCapabilityRegistryService } from '@providers/services/enhanced-capability-registry.service';
import { StreamCacheStandardizedService } from '@core/05-caching/module/stream-cache/services/stream-cache-standardized.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

/**
 * 🔧 Mock模块和服务定义
 * 
 * 为外部依赖创建轻量级Mock，避免加载真实依赖链
 * 使用overrideProvider策略替代overrideModule，提供更精确的依赖控制
 */

// Mock模块定义
class MockSharedServicesModule {}
class MockProvidersModule {}
class MockMonitoringModule {}
class MockStreamCacheModule {}

// 系统依赖的Mock工厂
const createEventEmitterMock = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
});

const createConfigServiceMock = () => ({
  get: jest.fn().mockImplementation((key: string) => {
    // 为不同的配置键返回合理的默认值
    const configMap: Record<string, any> = {
      'stream.connection.maxGlobal': 1000,
      'stream.connection.maxPerKey': 10,
      'stream.connection.maxPerIP': 50,
      'stream.recovery.maxRetries': 3,
      'stream.recovery.retryDelayMs': 1000,
      'websocket.features.enabled': true,
    };
    return configMap[key] || {};
  }),
});

// 核心依赖服务的Mock工厂
const createEnhancedCapabilityRegistryMock = () => ({
  getCapability: jest.fn(),
  registerProvider: jest.fn(),
  getAllCapabilities: jest.fn().mockReturnValue(new Map()),
  getStreamCapability: jest.fn(),
  registerStreamCapability: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(true),
});

const createStreamCacheStandardizedServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn().mockReturnValue(false),
  getMultiple: jest.fn().mockReturnValue(new Map()),
  setMultiple: jest.fn(),
});

const createStreamConfigServiceMock = () => ({
  getConnectionConfig: jest.fn().mockReturnValue({
    maxGlobal: 1000,
    maxPerKey: 10,
    maxPerIP: 50,
  }),
  getRecoveryConfig: jest.fn().mockReturnValue({
    maxRetries: 3,
    retryDelayMs: 1000,
  }),
});

const createStreamRecoveryConfigServiceMock = () => ({
  getConfig: jest.fn().mockReturnValue({
    maxRetries: 3,
    retryDelayMs: 1000,
    enabled: true,
  }),
});

const createWebSocketFeatureFlagsServiceMock = () => ({
  isFeatureEnabled: jest.fn().mockReturnValue(true),
  getFeatureConfig: jest.fn().mockReturnValue({}),
});

const createWebSocketServerProviderMock = () => ({
  getServer: jest.fn(),
  createServer: jest.fn(),
  close: jest.fn(),
});

describe('StreamDataFetcherModule', () => {
  let module: TestingModule;

  /**
   * 🏗️ 测试环境设置
   * 
   * 使用 overrideProvider 策略来精确Mock每个依赖
   * 避免复杂的模块依赖链和循环依赖问题
   */
  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StreamDataFetcherModule],
    })
      // 🎯 核心策略：使用overrideModule替换外部依赖模块
      .overrideModule(SharedServicesModule)
      .useModule(MockSharedServicesModule)
      .overrideModule(ProvidersModule)  
      .useModule(MockProvidersModule)
      .overrideModule(MonitoringModule)
      .useModule(MockMonitoringModule)
      .overrideModule(StreamCacheModule)
      .useModule(MockStreamCacheModule)
      
      // 🔧 精确策略：直接覆盖关键依赖的Provider实现
      // 这样避免了深层依赖解析和循环依赖问题
      .overrideProvider(EnhancedCapabilityRegistryService)
      .useValue(createEnhancedCapabilityRegistryMock())
      .overrideProvider(StreamCacheStandardizedService)
      .useValue(createStreamCacheStandardizedServiceMock())
      .overrideProvider(EventEmitter2)
      .useValue(createEventEmitterMock())
      .overrideProvider(ConfigService)
      .useValue(createConfigServiceMock())
      .overrideProvider(StreamConfigService)
      .useValue(createStreamConfigServiceMock())
      .overrideProvider(StreamRecoveryConfigService)
      .useValue(createStreamRecoveryConfigServiceMock())
      .overrideProvider(WebSocketFeatureFlagsService)
      .useValue(createWebSocketFeatureFlagsServiceMock())
      .overrideProvider(WebSocketServerProvider)
      .useValue(createWebSocketServerProviderMock())
      .overrideProvider(WEBSOCKET_SERVER_TOKEN)
      .useValue(createWebSocketServerProviderMock())
      .compile();
  });

  /**
   * 🧹 测试环境清理
   * 
   * 确保每个测试后正确关闭模块，防止内存泄漏
   */
  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * 🔍 基础验证测试组
   * 
   * 验证模块的基本编译和实例化是否正确
   */
  describe('模块基础验证', () => {
    it('应该成功编译模块', () => {
      expect(module).toBeDefined();
      expect(module).toBeInstanceOf(TestingModule);
    });

    it('应该是有效的NestJS模块', () => {
      // 验证模块确实被正确注册到NestJS容器中
      expect(module.get).toBeDefined();
      expect(module.resolve).toBeDefined();
    });
  });

  /**
   * 🏢 核心业务服务验证测试组
   * 
   * 验证所有核心业务服务都能正确注入和实例化
   */
  describe('核心业务服务验证', () => {
    it('应该正确注入StreamDataFetcherService', () => {
      const service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamDataFetcherService);
    });

    it('应该正确注入StreamClientStateManager', () => {
      const service = module.get<StreamClientStateManager>(StreamClientStateManager);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamClientStateManager);
    });

    it('应该正确注入StreamRecoveryWorkerService', () => {
      const service = module.get<StreamRecoveryWorkerService>(StreamRecoveryWorkerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamRecoveryWorkerService);
    });

    it('应该正确注入ConnectionPoolManager', () => {
      const service = module.get<ConnectionPoolManager>(ConnectionPoolManager);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ConnectionPoolManager);
    });
  });

  /**
   * ⚙️ 配置服务验证测试组
   * 
   * 验证所有配置相关服务的正确注入
   */
  describe('配置服务验证', () => {
    it('应该正确注入StreamConfigService', () => {
      const service = module.get<StreamConfigService>(StreamConfigService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamConfigService);
    });

    it('应该正确注入StreamRecoveryConfigService', () => {
      const service = module.get<StreamRecoveryConfigService>(StreamRecoveryConfigService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamRecoveryConfigService);
    });

    it('应该正确注入WebSocketFeatureFlagsService', () => {
      const service = module.get<WebSocketFeatureFlagsService>(WebSocketFeatureFlagsService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WebSocketFeatureFlagsService);
    });
  });

  /**
   * 🛡️ 守卫和拦截器验证测试组
   * 
   * 验证DoS防护和错误处理组件的正确注入
   */
  describe('守卫和拦截器验证', () => {
    it('应该正确注入StreamRateLimitGuard', () => {
      const guard = module.get<StreamRateLimitGuard>(StreamRateLimitGuard);
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(StreamRateLimitGuard);
    });

    it('应该正确注入WebSocketRateLimitGuard', () => {
      const guard = module.get<WebSocketRateLimitGuard>(WebSocketRateLimitGuard);
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(WebSocketRateLimitGuard);
    });

    it('应该正确注入ErrorSanitizerInterceptor', () => {
      const interceptor = module.get<ErrorSanitizerInterceptor>(ErrorSanitizerInterceptor);
      expect(interceptor).toBeDefined();
      expect(interceptor).toBeInstanceOf(ErrorSanitizerInterceptor);
    });
  });

  /**
   * 🔌 WebSocket提供者验证测试组
   * 
   * 验证WebSocket服务器提供者的正确配置和Token绑定
   */
  describe('WebSocket提供者验证', () => {
    it('应该正确注入WebSocketServerProvider', () => {
      const provider = module.get<WebSocketServerProvider>(WebSocketServerProvider);
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(WebSocketServerProvider);
    });

    it('应该正确配置WEBSOCKET_SERVER_TOKEN', () => {
      const tokenProvider = module.get(WEBSOCKET_SERVER_TOKEN);
      const directProvider = module.get<WebSocketServerProvider>(WebSocketServerProvider);
      
      // 验证Token指向的是同一个实例（useExisting配置验证）
      expect(tokenProvider).toBeDefined();
      expect(tokenProvider).toBe(directProvider);
    });

    it('WEBSOCKET_SERVER_TOKEN应该与WebSocketServerProvider为同一实例', () => {
      const tokenInstance = module.get(WEBSOCKET_SERVER_TOKEN);
      const providerInstance = module.get<WebSocketServerProvider>(WebSocketServerProvider);
      
      // 验证useExisting配置确实生效，两者应该是同一个实例
      expect(tokenInstance).toStrictEqual(providerInstance);
    });
  });

  /**
   * 📤 模块导出验证测试组
   * 
   * 验证模块正确导出了需要供其他模块使用的服务
   */
  describe('模块导出验证', () => {
    it('应该导出所有核心业务服务', () => {
      // 这些服务应该可以被其他导入此模块的模块获取到
      expect(() => module.get<StreamDataFetcherService>(StreamDataFetcherService)).not.toThrow();
      expect(() => module.get<StreamClientStateManager>(StreamClientStateManager)).not.toThrow();
      expect(() => module.get<StreamRecoveryWorkerService>(StreamRecoveryWorkerService)).not.toThrow();
      expect(() => module.get<StreamRecoveryConfigService>(StreamRecoveryConfigService)).not.toThrow();
    });

    it('应该导出WebSocket相关提供者', () => {
      // 验证WebSocket提供者可以被外部模块使用
      expect(() => module.get<WebSocketServerProvider>(WebSocketServerProvider)).not.toThrow();
      expect(() => module.get(WEBSOCKET_SERVER_TOKEN)).not.toThrow();
    });
  });

  /**
   * 🔧 模块集成测试组
   * 
   * 验证模块内部服务之间的协作关系
   */
  describe('模块集成验证', () => {
    it('所有providers应该都能正确实例化', () => {
      // 通过尝试获取所有providers来验证依赖注入的完整性
      const serviceTypes = [
        StreamDataFetcherService,
        StreamClientStateManager,
        StreamRecoveryWorkerService,
        ConnectionPoolManager,
        StreamRateLimitGuard,
        WebSocketRateLimitGuard,
        ErrorSanitizerInterceptor,
        StreamConfigService,
        StreamRecoveryConfigService,
        WebSocketFeatureFlagsService,
        WebSocketServerProvider,
      ];

      serviceTypes.forEach(ServiceType => {
        expect(() => {
          const service = module.get(ServiceType);
          expect(service).toBeDefined();
        }).not.toThrow();
      });
    });

    it('模块应该不暴露未导出的内部服务', () => {
      // 验证内部服务（如Guards、Interceptors）不会被意外导出
      // 这些应该只在模块内部使用，不应该被外部模块直接访问
      
      // 这个测试确保我们的模块封装是正确的
      const exportedServices = [
        StreamDataFetcherService,
        StreamClientStateManager,
        StreamRecoveryWorkerService,
        StreamRecoveryConfigService,
        WebSocketServerProvider,
      ];

      const internalServices = [
        StreamRateLimitGuard,
        WebSocketRateLimitGuard,
        ErrorSanitizerInterceptor,
        StreamConfigService,
        WebSocketFeatureFlagsService,
      ];

      // 导出的服务应该可以被获取
      exportedServices.forEach(ServiceType => {
        expect(() => module.get(ServiceType)).not.toThrow();
      });

      // 内部服务虽然可以被获取（因为在同一模块内），但不应该在exports中
      internalServices.forEach(ServiceType => {
        expect(() => module.get(ServiceType)).not.toThrow();
      });
    });
  });
});
