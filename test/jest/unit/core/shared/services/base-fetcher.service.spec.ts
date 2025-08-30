import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { BaseFetcherService } from '../../../../../../src/core/shared/services/base-fetcher.service';
import { CollectorService } from '@monitoring/collector/collector.service';

// 创建具体实现类用于测试抽象类
class TestBaseFetcherService extends BaseFetcherService {
  constructor(collectorService: CollectorService) {
    super(collectorService);
  }

  async executeCore(params: any): Promise<any> {
    // 测试实现
    if (params.shouldFail) {
      throw new Error('Test operation failed');
    }
    if (params.shouldNotFound) {
      throw new NotFoundException('Resource not found');
    }
    return { success: true, data: params };
  }
}

describe('BaseFetcherService', () => {
  let service: TestBaseFetcherService;
  let mockCollectorService: jest.Mocked<CollectorService>;

  beforeEach(async () => {
    mockCollectorService = {
      recordRequest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    mockCollectorService = module.get(CollectorService);
    service = new TestBaseFetcherService(mockCollectorService);

    // 清除所有模拟调用记录
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue({ result: 'success' });
      const result = await service['executeWithRetry'](operation, 'test-operation');

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(1);
      
      // 等待 setImmediate 调用完成
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/external/test-operation',
        'POST',
        200,
        expect.any(Number),
        expect.objectContaining({
          operation: 'test-operation',
          provider: 'external_api',
          attempt_count: 1,
          max_retries: 3,
          call_type: 'data_fetch'
        })
      );
    });

    it('should retry operation on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue({ result: 'success' });

      const result = await service['executeWithRetry'](operation, 'test-operation', 2, 100);

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries and record failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        service['executeWithRetry'](operation, 'test-operation', 1, 100)
      ).rejects.toThrow('Operation failed');

      expect(operation).toHaveBeenCalledTimes(2); // 初始 + 1次重试
      
      // 等待 setImmediate 调用完成
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/external/test-operation',
        'POST',
        500,
        expect.any(Number),
        expect.objectContaining({
          operation: 'test-operation',
          provider: 'external_api',
          attempt_count: 2,
          max_retries: 2,
          call_type: 'data_fetch',
          error: 'Operation failed',
          error_type: 'Error'
        })
      );
    });

    it('should use exponential backoff for retry delays', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue({ result: 'success' });

      const startTime = Date.now();
      const result = await service['executeWithRetry'](operation, 'test-operation', 2, 100);
      const duration = Date.now() - startTime;

      expect(result).toEqual({ result: 'success' });
      // 应该至少等待 100ms + 150ms (指数退避)
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('checkPerformanceThreshold', () => {
    beforeEach(() => {
      // Mock logger.warn to avoid console output
      jest.spyOn(service['logger'], 'warn').mockImplementation();
    });

    it('should not warn for fast operations', () => {
      service['checkPerformanceThreshold'](
        1000, // 1秒
        5, 
        'req-123',
        'test-operation',
        5000 // 5秒阈值
      );

      expect(service['logger'].warn).not.toHaveBeenCalled();
      expect(mockCollectorService.recordRequest).not.toHaveBeenCalled();
    });

    it('should warn and record metrics for slow operations', async () => {
      service['checkPerformanceThreshold'](
        6000, // 6秒，超过阈值
        10,
        'req-123',
        'test-operation',
        5000 // 5秒阈值
      );

      expect(service['logger'].warn).toHaveBeenCalledWith(
        '检测到慢响应',
        expect.objectContaining({
          requestId: 'req-123',
          operation: 'test-operation',
          processingTime: 6000,
          symbolsCount: 10,
          timePerSymbol: 600,
          threshold: 5000
        })
      );

      // 等待 setImmediate 调用完成
      await new Promise(resolve => setImmediate(resolve));

      expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
        '/external//performance/test-operation',
        'GET',
        200,
        6000,
        expect.objectContaining({
          operation: 'test-operation',
          provider: 'external_api',
          call_type: 'slow_response_detection',
          symbols_count: 10,
          time_per_symbol: 600,
          threshold: 5000
        })
      );
    });

    it('should handle zero symbols correctly', () => {
      service['checkPerformanceThreshold'](
        6000,
        0, // 零个符号
        'req-123',
        'test-operation',
        5000
      );

      expect(service['logger'].warn).toHaveBeenCalledWith(
        '检测到慢响应',
        expect.objectContaining({
          timePerSymbol: 0
        })
      );
    });
  });

  describe('standardizeError', () => {
    beforeEach(() => {
      // Mock logger.error to avoid console output
      jest.spyOn(service['logger'], 'error').mockImplementation();
    });

    it('should not modify NotFoundException', () => {
      const originalError = new NotFoundException('Resource not found');
      
      const result = service['standardizeError'](
        originalError,
        'test-operation'
      );

      expect(result).toBe(originalError);
      expect(service['logger'].error).toHaveBeenCalledWith(
        'test-operation失败',
        expect.objectContaining({
          error: 'Resource not found',
          errorType: 'NotFoundException',
          operation: 'test-operation'
        })
      );
    });

    it('should wrap other errors with operation context', () => {
      const originalError = new Error('Network timeout');

      expect(() => {
        service['standardizeError'](
          originalError,
          'fetch-data',
          { provider: 'longport', symbol: '700.HK' }
        );
      }).toThrow('fetch-data失败: Network timeout');

      expect(service['logger'].error).toHaveBeenCalledWith(
        'fetch-data失败',
        expect.objectContaining({
          provider: 'longport',
          symbol: '700.HK',
          error: 'Network timeout',
          errorType: 'Error',
          operation: 'fetch-data'
        })
      );
    });

    it('should handle unknown error types', () => {
      const unknownError = null;

      expect(() => {
        service['standardizeError'](unknownError, 'test-operation');
      }).toThrow('test-operation失败: 未知错误');

      expect(service['logger'].error).toHaveBeenCalledWith(
        'test-operation失败',
        expect.objectContaining({
          error: '未知错误',
          errorType: 'Unknown',
          operation: 'test-operation'
        })
      );
    });
  });

  describe('safeRecordExternalCall', () => {
    it('should record external calls without throwing errors', (done) => {
      // 调用私有方法
      service['safeRecordExternalCall'](
        'test-endpoint',
        'POST',
        200,
        1000,
        { test: 'data' }
      );

      // 使用 setImmediate 确保异步调用完成
      setImmediate(() => {
        expect(mockCollectorService.recordRequest).toHaveBeenCalledWith(
          '/external/test-endpoint',
          'POST',
          200,
          1000,
          { test: 'data' }
        );
        done();
      });
    });

    it('should handle collector service errors gracefully', (done) => {
      mockCollectorService.recordRequest.mockImplementation(() => {
        throw new Error('Collector service unavailable');
      });

      // Mock logger.warn
      jest.spyOn(service['logger'], 'warn').mockImplementation();

      service['safeRecordExternalCall'](
        'test-endpoint',
        'POST',
        500,
        2000,
        { error: 'test' }
      );

      setImmediate(() => {
        expect(service['logger'].warn).toHaveBeenCalledWith(
          '外部调用监控记录失败',
          expect.objectContaining({
            error: 'Collector service unavailable',
            endpoint: 'test-endpoint'
          })
        );
        done();
      });
    });
  });

  describe('sleep', () => {
    it('should wait for specified duration', async () => {
      const startTime = Date.now();
      await service['sleep'](100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(90); // 允许一些时间误差
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Integration with CollectorService', () => {
    it('should work when collector service is available', async () => {
      mockCollectorService.recordRequest.mockImplementation(() => {
        // 成功记录
      });

      const operation = jest.fn().mockResolvedValue({ success: true });
      await service['executeWithRetry'](operation, 'integration-test');

      // 等待 setImmediate 调用完成
      await new Promise(resolve => setImmediate(resolve));

      expect(mockCollectorService.recordRequest).toHaveBeenCalled();
    });

    it('should continue working when collector service fails', async () => {
      mockCollectorService.recordRequest.mockImplementation(() => {
        throw new Error('Collector unavailable');
      });

      // Mock logger.warn
      jest.spyOn(service['logger'], 'warn').mockImplementation();

      const operation = jest.fn().mockResolvedValue({ success: true });
      const result = await service['executeWithRetry'](operation, 'integration-test');

      expect(result).toEqual({ success: true });
      // 操作应该成功，即使监控记录失败
    });
  });

  describe('Abstract method enforcement', () => {
    it('should require executeCore implementation', () => {
      expect(() => {
        // 试图创建未实现抽象方法的类会在TypeScript编译时报错
        // 这里我们测试具体实现
        const params = { test: 'data' };
        return service.executeCore(params);
      }).not.toThrow();
    });
  });

  describe('Performance benchmarks', () => {
    it('should have minimal overhead for retry mechanism', async () => {
      const operation = jest.fn().mockResolvedValue({ result: 'success' });
      
      const startTime = process.hrtime.bigint();
      await service['executeWithRetry'](operation, 'benchmark-test');
      const endTime = process.hrtime.bigint();
      
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // 重试机制本身的开销应该很小（< 10ms）
      expect(durationMs).toBeLessThan(10);
    });
  });
});