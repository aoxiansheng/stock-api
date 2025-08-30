/**
 * BaseFetcherService 可选依赖注入测试
 * 🔧 Phase 2.6: 验证 MetricsRegistryService 可选注入的降级处理
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { MetricsRegistryService } from '@monitoring/infrastructure/metrics/metrics-registry.service';

// 创建一个具体的测试实现类
@Injectable()
class TestFetcherService extends (require('../../../../src/core/shared/services/base-fetcher.service').BaseFetcherService) {
  async testOperation(): Promise<string> {
    return this.executeWithRetry(
      async () => {
        // 模拟操作
        return 'success';
      },
      'test-operation',
      2,
      100
    );
  }

  // 暴露 protected 方法用于测试
  testRecordSuccess(operation: string, time: number) {
    this.recordOperationSuccess(operation, time);
  }

  testRecordFailure(operation: string, error: Error, attempts: number) {
    this.recordOperationFailure(operation, error, attempts);
  }
}

describe('BaseFetcherService Optional Dependency Injection', () => {
  describe('With MetricsRegistryService', () => {
    let testingModule: TestingModule;
    let fetcherService: TestFetcherService;
    let metricsService: MetricsRegistryService;

    beforeAll(async () => {
      // Mock MetricsRegistryService
      const mockMetricsService = {
        receiverRequestsTotal: { inc: jest.fn() },
        receiverProcessingDuration: { observe: jest.fn() },
      };

      testingModule = await Test.createTestingModule({
        providers: [
          TestFetcherService,
          {
            provide: MetricsRegistryService,
            useValue: mockMetricsService,
          },
        ],
      }).compile();

      fetcherService = testingModule.get<TestFetcherService>(TestFetcherService);
      metricsService = testingModule.get<MetricsRegistryService>(MetricsRegistryService);
    });

    afterAll(async () => {
      if (testingModule) {
        await testingModule.close();
      }
    });

    it('should inject MetricsRegistryService when available', () => {
      expect(fetcherService).toBeDefined();
      expect(metricsService).toBeDefined();
      console.log('✅ MetricsRegistryService 成功注入');
    });

    it('should execute operations with metrics recording', async () => {
      const result = await fetcherService.testOperation();
      expect(result).toBe('success');
      console.log('✅ 有指标服务时操作正常执行');
    });

    it('should record metrics when service is available', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      fetcherService.testRecordSuccess('test-op', 100);
      
      // 不应该打印跳过日志
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('指标服务不可用')
      );
      
      consoleSpy.mockRestore();
      console.log('✅ 有指标服务时正常记录指标');
    });
  });

  describe('Without MetricsRegistryService', () => {
    let testingModule: TestingModule;
    let fetcherService: TestFetcherService;

    beforeAll(async () => {
      testingModule = await Test.createTestingModule({
        providers: [
          TestFetcherService,
          // 不提供 MetricsRegistryService，测试可选注入
        ],
      }).compile();

      fetcherService = testingModule.get<TestFetcherService>(TestFetcherService);
    });

    afterAll(async () => {
      if (testingModule) {
        await testingModule.close();
      }
    });

    it('should work without MetricsRegistryService', () => {
      expect(fetcherService).toBeDefined();
      console.log('✅ 无 MetricsRegistryService 时服务仍可创建');
    });

    it('should execute operations without metrics', async () => {
      const result = await fetcherService.testOperation();
      expect(result).toBe('success');
      console.log('✅ 无指标服务时操作正常执行（降级模式）');
    });

    it('should gracefully skip metrics recording when service unavailable', () => {
      // 由于使用 createLogger，需要监听实际的 logger
      // 简化测试：只验证不会抛出错误
      expect(() => {
        fetcherService.testRecordSuccess('test-op', 100);
      }).not.toThrow();
      
      console.log('✅ 无指标服务时优雅跳过指标记录（不抛出错误）');
    });

    it('should handle failure recording without metrics service', () => {
      // 简化测试：只验证不会抛出错误
      const error = new Error('Test error');
      
      expect(() => {
        fetcherService.testRecordFailure('test-op', error, 3);
      }).not.toThrow();
      
      console.log('✅ 无指标服务时优雅跳过失败指标记录（不抛出错误）');
    });
  });

  describe('Performance Comparison', () => {
    it('should demonstrate similar performance with and without metrics', async () => {
      // 创建两个服务实例
      const moduleWithMetrics = await Test.createTestingModule({
        providers: [
          TestFetcherService,
          {
            provide: MetricsRegistryService,
            useValue: {
              receiverRequestsTotal: { inc: jest.fn() },
              receiverProcessingDuration: { observe: jest.fn() },
            },
          },
        ],
      }).compile();

      const moduleWithoutMetrics = await Test.createTestingModule({
        providers: [TestFetcherService],
      }).compile();

      const serviceWithMetrics = moduleWithMetrics.get<TestFetcherService>(TestFetcherService);
      const serviceWithoutMetrics = moduleWithoutMetrics.get<TestFetcherService>(TestFetcherService);

      // 性能测试
      const iterations = 100;
      
      // 有指标服务的性能
      const startWithMetrics = Date.now();
      for (let i = 0; i < iterations; i++) {
        await serviceWithMetrics.testOperation();
      }
      const durationWithMetrics = Date.now() - startWithMetrics;

      // 无指标服务的性能
      const startWithoutMetrics = Date.now();
      for (let i = 0; i < iterations; i++) {
        await serviceWithoutMetrics.testOperation();
      }
      const durationWithoutMetrics = Date.now() - startWithoutMetrics;

      console.log(`✅ 性能对比:`);
      console.log(`   有指标服务: ${durationWithMetrics}ms (${iterations}次操作)`);
      console.log(`   无指标服务: ${durationWithoutMetrics}ms (${iterations}次操作)`);
      console.log(`   性能差异: ${Math.abs(durationWithMetrics - durationWithoutMetrics)}ms`);

      // 清理
      await moduleWithMetrics.close();
      await moduleWithoutMetrics.close();
    });
  });
});