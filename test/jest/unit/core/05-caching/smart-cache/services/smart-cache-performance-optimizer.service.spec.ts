import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SmartCachePerformanceOptimizer } from '@core/05-caching/smart-cache/services/smart-cache-performance-optimizer.service';
import { BackgroundTaskService } from '@common/infrastructure/services/background-task.service';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('SmartCachePerformanceOptimizer', () => {
  let service: SmartCachePerformanceOptimizer;
  let module: TestingModule;
  let mockEventBus: jest.Mocked<EventEmitter2>;
  let mockBackgroundTaskService: jest.Mocked<BackgroundTaskService>;

  beforeEach(async () => {
    // Mock EventEmitter2
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    // Mock BackgroundTaskService
    mockBackgroundTaskService = {
      run: jest.fn().mockImplementation((fn) => fn()),
    } as any;

    const moduleBuilder = await Test.createTestingModule({
      providers: [
        SmartCachePerformanceOptimizer,
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: BackgroundTaskService,
          useValue: mockBackgroundTaskService,
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<SmartCachePerformanceOptimizer>(
      SmartCachePerformanceOptimizer,
    );
  });

  afterEach(async () => {
    if (service) {
      service.stopOptimization();
    }
    if (module) {
      await module.close();
    }
  });

  describe('服务初始化', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该初始化默认并发数', () => {
      const serviceAny = service as any;
      expect(serviceAny.originalMaxConcurrency).toBeGreaterThan(0);
      expect(serviceAny.dynamicMaxConcurrency).toBe(
        serviceAny.originalMaxConcurrency,
      );
    });

    it('应该初始化性能统计', () => {
      const stats = service.getPerformanceStats();
      expect(stats.concurrencyAdjustments).toBe(0);
      expect(stats.memoryPressureEvents).toBe(0);
      expect(stats.tasksCleared).toBe(0);
      expect(stats.avgExecutionTime).toBe(0);
      expect(stats.totalTasks).toBe(0);
    });
  });

  describe('性能优化启动和停止', () => {
    it('应该启动性能优化监控', () => {
      const serviceAny = service as any;
      const timersSize = serviceAny.timers.size;

      service.startOptimization(10);

      expect(serviceAny.dynamicMaxConcurrency).toBe(10);
      expect(serviceAny.timers.size).toBeGreaterThan(timersSize);
    });

    it('应该停止性能优化监控', () => {
      service.startOptimization();
      const serviceAny = service as any;
      const timersBefore = serviceAny.timers.size;

      service.stopOptimization();

      expect(serviceAny.isShuttingDown).toBe(true);
      expect(serviceAny.timers.size).toBe(0);
      expect(timersBefore).toBeGreaterThan(0);
    });

    it('应该记录最终性能统计', () => {
      service.startOptimization();
      service.stopOptimization();

      // 验证emit被调用用于记录最终统计
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'performance_optimizer_shutdown',
          metricValue: 1,
        }),
      );
    });
  });

  describe('并发数计算', () => {
    beforeEach(() => {
      service.startOptimization(8); // 设置基础并发数
    });

    it('应该计算最优并发数', async () => {
      const optimalConcurrency = await service.calculateOptimalConcurrency();

      expect(optimalConcurrency).toBeGreaterThan(0);
      expect(optimalConcurrency).toBeLessThanOrEqual(32);
    });

    it('应该在系统资源充足时增加并发数', async () => {
      // Mock系统指标 - 低资源使用率
      const serviceAny = service as any;
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.3 }, // 低CPU使用率
        memory: { percentage: 0.5 }, // 低内存使用率
        system: { loadAvg: [0.5, 0.5, 0.5], uptime: 3600 },
      });

      const optimalConcurrency = await service.calculateOptimalConcurrency();

      // 应该增加并发数（低资源使用率时）
      expect(optimalConcurrency).toBeGreaterThan(4);
    });

    it('应该在系统资源紧张时减少并发数', async () => {
      // Mock系统指标 - 高资源使用率
      const serviceAny = service as any;
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.9 }, // 高CPU使用率
        memory: { percentage: 0.9 }, // 高内存使用率
        system: { loadAvg: [3.0, 3.0, 3.0], uptime: 3600 },
      });

      const optimalConcurrency = await service.calculateOptimalConcurrency();

      // 应该减少并发数（高资源使用率时）
      expect(optimalConcurrency).toBeLessThan(8);
    });

    it('应该在计算失败时返回当前并发数', async () => {
      const serviceAny = service as any;
      const currentConcurrency = serviceAny.dynamicMaxConcurrency;

      // Mock getSystemMetrics抛出异常
      jest.spyOn(serviceAny, 'getSystemMetrics').mockRejectedValue(
        new Error('System metrics failed'),
      );

      const optimalConcurrency = await service.calculateOptimalConcurrency();

      expect(optimalConcurrency).toBe(currentConcurrency);
    });
  });

  describe('内存压力检测', () => {
    beforeEach(() => {
      service.startOptimization();
    });

    it('应该检测内存压力', async () => {
      const serviceAny = service as any;

      // Mock高内存使用率
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.5 },
        memory: { percentage: 0.95 }, // 高内存压力
        system: { loadAvg: [1.0, 1.0, 1.0], uptime: 3600 },
      });

      const isUnderPressure = await service.checkMemoryPressure();
      expect(isUnderPressure).toBe(true);
    });

    it('应该处理内存压力', async () => {
      const serviceAny = service as any;
      const originalConcurrency = serviceAny.dynamicMaxConcurrency;

      // Mock高内存使用率
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.5 },
        memory: { percentage: 0.95 }, // 高内存压力
        system: { loadAvg: [1.0, 1.0, 1.0], uptime: 3600 },
      });

      const result = await service.handleMemoryPressure();

      expect(result.handled).toBe(true);
      expect(result.reducedConcurrency).toBeLessThan(originalConcurrency);
      expect(serviceAny.performanceStats.memoryPressureEvents).toBe(1);
    });

    it('应该在没有内存压力时返回false', async () => {
      const serviceAny = service as any;

      // Mock低内存使用率
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.3 },
        memory: { percentage: 0.6 }, // 正常内存使用率
        system: { loadAvg: [0.5, 0.5, 0.5], uptime: 3600 },
      });

      const result = await service.handleMemoryPressure();
      expect(result.handled).toBe(false);
    });
  });

  describe('批量大小优化', () => {
    beforeEach(() => {
      service.startOptimization();
    });

    it('应该计算最优批量大小', () => {
      const batchSize = service.calculateOptimalBatchSize(2); // 当前负载为2

      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(20); // 假设MAX_BATCH_SIZE为20
    });

    it('应该在低负载时增加批量大小', () => {
      const serviceAny = service as any;
      serviceAny.dynamicMaxConcurrency = 10;

      const batchSize = service.calculateOptimalBatchSize(2); // 低负载

      expect(batchSize).toBeGreaterThan(5); // 应该比默认值大
    });

    it('应该在高负载时减少批量大小', () => {
      const serviceAny = service as any;
      serviceAny.dynamicMaxConcurrency = 4;

      const batchSize = service.calculateOptimalBatchSize(8); // 高负载（超过并发数）

      expect(batchSize).toBeLessThan(10); // 应该比默认值小
    });

    it('应该处理计算异常', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage failed');
      }) as any;

      try {
        const batchSize = service.calculateOptimalBatchSize();
        expect(batchSize).toBe(5); // 应该返回默认值
      } finally {
        process.memoryUsage = originalMemoryUsage;
      }
    });
  });

  describe('系统指标获取', () => {
    it('应该获取系统指标', async () => {
      const metrics = await service.getSystemMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('system');

      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(1);

      expect(metrics.memory.usedMB).toBeGreaterThan(0);
      expect(metrics.memory.totalMB).toBeGreaterThan(0);
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(1);

      expect(Array.isArray(metrics.system.loadAvg)).toBe(true);
      expect(metrics.system.uptime).toBeGreaterThan(0);
    });
  });

  describe('指标记录', () => {
    beforeEach(() => {
      service.startOptimization();
    });

    it('应该记录并发调整指标', async () => {
      const serviceAny = service as any;

      // Mock系统指标变化以触发并发调整
      jest.spyOn(serviceAny, 'getSystemMetrics').mockResolvedValue({
        cpu: { usage: 0.9 }, // 高CPU使用率，应该触发调整
        memory: { percentage: 0.7 },
        system: { loadAvg: [2.0, 2.0, 2.0], uptime: 3600 },
      });

      // 等待动态调整执行
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证指标记录
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'concurrency_adjusted',
          source: 'smart_cache_performance_optimizer',
        }),
      );
    });

    it('应该处理指标记录失败', () => {
      const serviceAny = service as any;
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Mock EventBus抛出异常
      mockEventBus.emit.mockImplementation(() => {
        throw new Error('Event emit failed');
      });

      // 调用emitMetrics不应该抛出异常
      expect(() => {
        serviceAny.emitMetrics('test_metric', 1);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('性能统计追踪', () => {
    beforeEach(() => {
      service.startOptimization();
    });

    it('应该正确追踪执行时间', async () => {
      const initialStats = service.getPerformanceStats();
      expect(initialStats.totalTasks).toBe(0);
      expect(initialStats.avgExecutionTime).toBe(0);

      // 触发一些需要追踪的操作
      await service.calculateOptimalConcurrency();

      const updatedStats = service.getPerformanceStats();
      expect(updatedStats.totalTasks).toBe(1);
      expect(updatedStats.avgExecutionTime).toBeGreaterThan(0);
    });

    it('应该正确计算滚动平均执行时间', async () => {
      // 执行多次操作
      await service.calculateOptimalConcurrency();
      await service.calculateOptimalConcurrency();
      await service.calculateOptimalConcurrency();

      const stats = service.getPerformanceStats();
      expect(stats.totalTasks).toBe(3);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
    });

    it('应该在同步操作中追踪执行时间', () => {
      const initialStats = service.getPerformanceStats();

      // 执行同步操作
      service.calculateOptimalBatchSize();

      const updatedStats = service.getPerformanceStats();
      expect(updatedStats.totalTasks).toBe(initialStats.totalTasks + 1);
      expect(updatedStats.avgExecutionTime).toBeGreaterThan(0);
    });

    it('应该在操作失败时仍然追踪执行时间', async () => {
      const serviceAny = service as any;

      // Mock getSystemMetrics抛出异常
      jest.spyOn(serviceAny, 'getSystemMetrics').mockRejectedValue(
        new Error('System metrics failed'),
      );

      try {
        await service.calculateOptimalConcurrency();
      } catch (error) {
        // 忽略错误
      }

      const stats = service.getPerformanceStats();
      expect(stats.totalTasks).toBe(1);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('getter方法', () => {
    it('应该返回当前批量大小', () => {
      const batchSize = service.getCurrentBatchSize();
      expect(batchSize).toBeGreaterThan(0);
    });

    it('应该返回动态最大并发数', () => {
      const concurrency = service.getDynamicMaxConcurrency();
      expect(concurrency).toBeGreaterThan(0);
    });

    it('应该返回性能统计信息', () => {
      const stats = service.getPerformanceStats();

      expect(stats).toHaveProperty('concurrencyAdjustments');
      expect(stats).toHaveProperty('memoryPressureEvents');
      expect(stats).toHaveProperty('tasksCleared');
      expect(stats).toHaveProperty('avgExecutionTime');
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('dynamicMaxConcurrency');
      expect(stats).toHaveProperty('originalMaxConcurrency');
      expect(stats).toHaveProperty('currentBatchSize');
    });
  });

  describe('边界条件', () => {
    it('应该处理非常高的负载', () => {
      const serviceAny = service as any;
      serviceAny.dynamicMaxConcurrency = 1;

      const batchSize = service.calculateOptimalBatchSize(100); // 极高负载
      expect(batchSize).toBeGreaterThan(0);
    });

    it('应该处理零负载', () => {
      const batchSize = service.calculateOptimalBatchSize(0);
      expect(batchSize).toBeGreaterThan(0);
    });

    it('应该处理负负载', () => {
      const batchSize = service.calculateOptimalBatchSize(-1);
      expect(batchSize).toBeGreaterThan(0);
    });
  });
});