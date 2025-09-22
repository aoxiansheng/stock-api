import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { StreamCacheService } from '@core/05-caching/stream-cache/services/stream-cache.service';
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN
} from '@monitoring/contracts';

describe('StreamCacheService - Memory Leak Prevention', () => {
  let service: StreamCacheService;
  let module: TestingModule;
  let mockRedis: jest.Mocked<Redis>;
  let mockEventBus: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      pipeline: jest.fn(() => ({
        get: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      })),
    } as any;

    // Mock EventEmitter2
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    const moduleBuilder = await Test.createTestingModule({
      providers: [
        StreamCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedis,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: STREAM_CACHE_CONFIG_TOKEN,
          useValue: {
            hotCacheTTL: 300,
            warmCacheTTL: 3600,
            maxHotCacheSize: 100,
            maxBatchSize: 50
          },
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<StreamCacheService>(StreamCacheService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('内存泄漏防护测试', () => {
    it('应该在服务销毁后阻止新的异步操作', async () => {
      // 销毁服务
      await service.onModuleDestroy();

      // 尝试触发需要异步操作的方法
      await service.setData('test-key', []);

      // 验证没有新的事件被发送（因为异步操作被阻止）
      await new Promise(resolve => setTimeout(resolve, 50));

      // 事件发送应该被阻止
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('应该清理所有待执行的异步操作', async () => {
      const originalClearImmediate = global.clearImmediate;
      const clearImmediateSpy = jest.fn();
      global.clearImmediate = clearImmediateSpy;

      try {
        // 触发一些异步操作
        await service.setData('test-key-1', []);
        await service.setData('test-key-2', []);
        await service.setData('test-key-3', []);

        // 销毁服务
        await service.onModuleDestroy();

        // 验证clearImmediate被调用来清理待执行的操作
        expect(clearImmediateSpy).toHaveBeenCalled();
      } finally {
        global.clearImmediate = originalClearImmediate;
      }
    });

    it('应该在销毁后的异步操作中进行双重检查', async () => {
      // 获取一个引用来测试私有方法的行为
      const serviceAny = service as any;

      // 销毁服务
      await service.onModuleDestroy();

      // 直接调用安全异步执行器
      const mockOperation = jest.fn();
      serviceAny.safeAsyncExecute(mockOperation);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 操作不应该被执行，因为服务已经被销毁
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('应该正确跟踪和清理异步操作引用', async () => {
      const serviceAny = service as any;

      // 初始状态：没有待执行的操作
      expect(serviceAny.pendingAsyncOperations.size).toBe(0);

      // 触发异步操作
      await service.setData('test-key', []);

      // 应该有待执行的操作被跟踪
      // 注意：由于setImmediate的异步性质，我们需要等待一下
      await new Promise(resolve => setTimeout(resolve, 10));

      // 销毁服务
      await service.onModuleDestroy();

      // 所有异步操作引用应该被清理
      expect(serviceAny.pendingAsyncOperations.size).toBe(0);
    });

    it('应该在异步操作完成后自动移除引用', async () => {
      const serviceAny = service as any;

      // 触发异步操作
      await service.setData('test-key', []);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 异步操作完成后，引用应该被自动移除
      expect(serviceAny.pendingAsyncOperations.size).toBe(0);
    });

    it('应该在服务销毁时设置正确的销毁标志', async () => {
      const serviceAny = service as any;

      // 初始状态：未销毁
      expect(serviceAny.isDestroyed).toBe(false);

      // 销毁服务
      await service.onModuleDestroy();

      // 销毁标志应该被设置
      expect(serviceAny.isDestroyed).toBe(true);
    });

    it('应该在异步操作中处理异常而不崩溃', async () => {
      const serviceAny = service as any;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        // 创建一个会抛出异常的操作
        const faultyOperation = () => {
          throw new Error('Test error');
        };

        // 调用安全异步执行器
        serviceAny.safeAsyncExecute(faultyOperation);

        // 等待异步操作完成
        await new Promise(resolve => setTimeout(resolve, 50));

        // 服务应该仍然正常运行，不会崩溃
        expect(serviceAny.isDestroyed).toBe(false);
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('事件发送安全性测试', () => {
    it('应该在正常情况下发送缓存指标事件', async () => {
      // 触发缓存操作
      await service.setData('test-key', []);

      // 等待异步事件发送
      await new Promise(resolve => setTimeout(resolve, 50));

      // 验证事件被正确发送
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('METRIC_COLLECTED'),
        expect.objectContaining({
          source: 'stream-cache',
          metricType: 'cache'
        })
      );
    });

    it('应该在销毁后阻止事件发送', async () => {
      // 销毁服务
      await service.onModuleDestroy();

      // 重置mock
      mockEventBus.emit.mockClear();

      // 尝试触发操作
      await service.setData('test-key', []);

      // 等待可能的异步操作
      await new Promise(resolve => setTimeout(resolve, 50));

      // 事件不应该被发送
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('性能影响测试', () => {
    it('安全异步执行器的性能开销应该很小', async () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      // 执行大量安全异步操作
      for (let i = 0; i < iterations; i++) {
        await service.setData(`test-key-${i}`, []);
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒

      // 平均每次操作应该在合理范围内（< 1ms）
      const averageTime = duration / iterations;
      expect(averageTime).toBeLessThan(1);

      // 清理
      await service.onModuleDestroy();
    });
  });
});