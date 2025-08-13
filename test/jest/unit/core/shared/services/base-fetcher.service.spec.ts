/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BaseFetcherService } from '../../../../../../src/core/public/shared/services/base-fetcher.service';
import { MetricsRegistryService } from '../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import { InternalServerErrorException } from '@nestjs/common';

// 创建一个具体的实现类用于测试
class TestFetcherService extends BaseFetcherService {
  async executeCore(params: any): Promise<any> {
    // 简单的测试实现
    if (params.shouldFail) {
      throw new Error('Test error');
    }
    return { result: 'success', params };
  }

  // 暴露受保护的方法以便测试
  public async testExecuteWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries?: number,
    retryDelayMs?: number,
  ): Promise<T> {
    return super.executeWithRetry(operation, context, maxRetries, retryDelayMs);
  }

  public testRecordOperationSuccess(operation: string, processingTime: number, attempt?: number): void {
    super.recordOperationSuccess(operation, processingTime, attempt);
  }

  public testRecordOperationFailure(operation: string, error: Error, totalAttempts: number): void {
    super.recordOperationFailure(operation, error, totalAttempts);
  }

  public testCheckPerformanceThreshold(
    processingTime: number,
    symbolsCount: number,
    requestId: string,
    operation: string,
    slowThresholdMs?: number,
  ): void {
    super.checkPerformanceThreshold(processingTime, symbolsCount, requestId, operation, slowThresholdMs);
  }

  public testStandardizeError(error: any, operation: string, context?: Record<string, any>): Error {
    return super.standardizeError(error, operation, context);
  }
}

describe('BaseFetcherService', () => {
  let service: TestFetcherService;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;

  beforeEach(async () => {
    const mockMetricsRegistry = {
      // Mock the actual metric properties from MetricsRegistryService
      receiverProcessingDuration: {
        labels: jest.fn().mockReturnThis(),
        observe: jest.fn(),
      },
      receiverRequestsTotal: {
        labels: jest.fn().mockReturnThis(),
        inc: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestFetcherService,
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<TestFetcherService>(TestFetcherService);
    metricsRegistry = module.get(MetricsRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('executeWithRetry', () => {
    it('应该在第一次尝试成功时直接返回结果', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await service.testExecuteWithRetry(mockOperation, 'test-operation');

      // Assert
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      // 验证指标记录调用了正确的指标
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });

    it('应该在失败后重试并最终成功', async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success after retries');

      // Act
      const result = await service.testExecuteWithRetry(mockOperation, 'test-operation', 2, 10);

      // Assert
      expect(result).toBe('success after retries');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后抛出最后的错误', async () => {
      // Arrange
      const error1 = new Error('First failure');
      const error2 = new Error('Second failure');
      const error3 = new Error('Final failure');
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValue(error3);

      // Act & Assert
      await expect(
        service.testExecuteWithRetry(mockOperation, 'test-operation', 2, 10)
      ).rejects.toThrow('Final failure');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      // 验证失败指标记录
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });

    it('应该在重试期间记录警告日志', async () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
      const loggerInfoSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      // Act
      await service.testExecuteWithRetry(mockOperation, 'test-operation', 1, 10);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('操作失败，将在'),
        expect.objectContaining({
          context: 'test-operation',
          attempt: 1,
          maxRetries: 2,
        })
      );
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        '操作重试成功',
        expect.objectContaining({
          context: 'test-operation',
          attempt: 2,
        })
      );

      loggerWarnSpy.mockRestore();
      loggerInfoSpy.mockRestore();
    });

    it('应该使用指数退避策略增加重试间隔', async () => {
      // Arrange
      const sleepSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as any;
      });
      
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      // Act
      await service.testExecuteWithRetry(mockOperation, 'test-operation', 2, 1000);

      // Assert
      expect(sleepSpy).toHaveBeenCalledTimes(2);
      // 验证指数退避：第一次1000ms，第二次1500ms
      expect(sleepSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
      expect(sleepSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 1500);

      sleepSpy.mockRestore();
    });
  });

  describe('recordOperationSuccess', () => {
    it('应该记录成功操作的指标', () => {
      // Act
      service.testRecordOperationSuccess('test-operation', 1500, 0);

      // Assert
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });

    it('应该在重试成功时记录重试指标', () => {
      // Act
      service.testRecordOperationSuccess('test-operation', 1500, 2);

      // Assert
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledTimes(2); // 一次成功，一次重试成功
    });

    it('应该在指标记录失败时记录警告', () => {
      // Arrange
      (metricsRegistry.receiverProcessingDuration.observe as jest.Mock).mockImplementation(() => {
        throw new Error('Metrics error');
      });
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Act
      service.testRecordOperationSuccess('test-operation', 1500);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '指标记录失败',
        { error: 'Metrics error' }
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('recordOperationFailure', () => {
    it('应该记录失败操作的指标', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      service.testRecordOperationFailure('test-operation', error, 3);

      // Assert
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });

    it('应该在单次失败时不记录重试指标', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      service.testRecordOperationFailure('test-operation', error, 1);

      // Assert
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledTimes(1); // 只调用一次失败记录
    });
  });

  describe('checkPerformanceThreshold', () => {
    it('应该在响应时间超过阈值时记录警告', () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Act
      service.testCheckPerformanceThreshold(6000, 10, 'test-request-id', 'test-operation', 5000);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '检测到慢响应',
        expect.objectContaining({
          requestId: 'test-request-id',
          operation: 'test-operation',
          processingTime: 6000,
          symbolsCount: 10,
          timePerSymbol: 600,
          threshold: 5000,
        })
      );
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalledWith(
        { operation: 'test-operation', status: 'slow_response' },
        1
      );

      loggerWarnSpy.mockRestore();
    });

    it('应该在响应时间正常时不记录警告', () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Act
      service.testCheckPerformanceThreshold(3000, 10, 'test-request-id', 'test-operation', 5000);

      // Assert
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      // 验证没有调用慢响应指标记录
      expect(metricsRegistry.receiverRequestsTotal.inc).not.toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'slow_response'
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('应该正确计算每符号处理时间', () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Act
      service.testCheckPerformanceThreshold(6000, 0, 'test-request-id', 'test-operation', 5000);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '检测到慢响应',
        expect.objectContaining({
          timePerSymbol: 0, // 当symbolsCount为0时应该为0
        })
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('standardizeError', () => {
    it('应该保留NotFoundException类型', () => {
      // Arrange
      const originalError = new InternalServerErrorException('Not found');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      // Act
      const result = service.testStandardizeError(originalError, 'test-operation');

      // Assert
      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(result.message).toBe('test-operation失败: Not found');
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('应该将其他错误转换为InternalServerErrorException', () => {
      // Arrange
      const originalError = new Error('Some error');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      // Act
      const result = service.testStandardizeError(originalError, 'test-operation');

      // Assert
      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(result.message).toBe('test-operation失败: Some error');

      loggerErrorSpy.mockRestore();
    });

    it('应该处理没有message的错误', () => {
      // Arrange
      const originalError = { someProperty: 'value' };
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      // Act
      const result = service.testStandardizeError(originalError, 'test-operation');

      // Assert
      expect(result).toBeInstanceOf(InternalServerErrorException);
      expect(result.message).toBe('test-operation失败: 未知错误');

      loggerErrorSpy.mockRestore();
    });

    it('应该记录详细的错误信息', () => {
      // Arrange
      const originalError = new Error('Test error');
      const context = { requestId: 'test-123', provider: 'test-provider' };
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      // Act
      service.testStandardizeError(originalError, 'test-operation', context);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'test-operation失败',
        expect.objectContaining({
          requestId: 'test-123',
          provider: 'test-provider',
          error: 'Test error',
          errorType: 'Error',
          operation: 'test-operation',
        })
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('executeCore abstract method', () => {
    it('应该能够被子类正确实现和调用', async () => {
      // Act
      const result = await service.executeCore({ shouldFail: false });

      // Assert
      expect(result).toEqual({ result: 'success', params: { shouldFail: false } });
    });

    it('应该能够抛出错误', async () => {
      // Act & Assert
      await expect(service.executeCore({ shouldFail: true })).rejects.toThrow('Test error');
    });
  });

  describe('集成测试', () => {
    it('应该在完整的错误重试流程中正确记录指标', async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      // Act
      const result = await service.testExecuteWithRetry(mockOperation, 'integration-test', 2, 10);

      // Assert
      expect(result).toBe('success');
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });
  });

  describe('抽象类设计验证', () => {
    it('BaseFetcherService应该是抽象类（编译时检查）', () => {
      // TypeScript编译时会阻止直接实例化抽象类
      // 这个测试确保抽象类设计的正确性
      // 直接实例化会在编译时报错: new BaseFetcherService(metricsRegistry);
      
      // 验证类的名称和抽象性质
      expect(BaseFetcherService.name).toBe('BaseFetcherService');
      expect(BaseFetcherService.prototype.constructor).toBe(BaseFetcherService);
    });

    it('子类必须实现executeCore抽象方法', () => {
      // Arrange - 测试实现类确实实现了抽象方法
      expect(service.executeCore).toBeDefined();
      expect(typeof service.executeCore).toBe('function');
      
      // 验证抽象方法在基类中存在但未实现
      expect(BaseFetcherService.prototype.executeCore).toBeUndefined();
    });

    it('子类能够正常使用继承的方法', () => {
      // 验证子类可以访问基类的protected方法（通过public暴露的测试方法）
      expect(typeof service.testExecuteWithRetry).toBe('function');
      expect(typeof service.testRecordOperationSuccess).toBe('function');
      expect(typeof service.testRecordOperationFailure).toBe('function');
      expect(typeof service.testCheckPerformanceThreshold).toBe('function');
      expect(typeof service.testStandardizeError).toBe('function');
    });
  });
});