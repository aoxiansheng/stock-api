import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { BaseFetcherService } from '@core/shared/services/base-fetcher.service';
import { UnitTestSetup } from '../../../../../testbasic/setup/unit-test-setup';
// // import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

class TestBaseFetcherService extends BaseFetcherService {
  async executeCore(params: any): Promise<any> {
    return params;
  }

  async publicExecuteWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries?: number,
    retryDelayMs?: number,
  ): Promise<T> {
    return this.executeWithRetry(operation, context, maxRetries, retryDelayMs);
  }

  publicCheckPerformanceThreshold(
    processingTimeMs: number,
    symbolsCount: number,
    requestId: string,
    operation: string,
    slowThresholdMs?: number,
  ): void {
    this.checkPerformanceThreshold(processingTimeMs, symbolsCount, requestId, operation, slowThresholdMs);
  }

  publicStandardizeError(error: any, operation: string, context?: Record<string, any>): Error {
    return this.standardizeError(error, operation, context);
  }
}

describe('BaseFetcherService', () => {
  let service: TestBaseFetcherService;
  let eventBus: jest.Mocked<EventEmitter2>;
  let module: TestingModule;

  beforeEach(async () => {
    const mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    module = await UnitTestSetup.createBasicTestModule({
      providers: [
        TestBaseFetcherService,
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
      ],
    });

    service = module.get<TestBaseFetcherService>(TestBaseFetcherService);
    eventBus = module.get<EventEmitter2>(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  afterEach(async () => {
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should extend BaseFetcherService', () => {
      expect(service).toBeInstanceOf(BaseFetcherService);
    });

    it('should have injected EventEmitter2', () => {
      expect(eventBus).toBeDefined();
    });
  });

  describe('executeCore abstract method', () => {
    it('should implement abstract executeCore method', async () => {
      const testParams = { test: 'data' };
      const result = await service.executeCore(testParams);
      expect(result).toEqual(testParams);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await service.publicExecuteWithRetry(mockOperation, 'test-operation');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'external_api',
          metricName: 'external_call_test-operation',
          tags: expect.objectContaining({
            status_code: 200,
            status: 'success',
          }),
        })
      );
    });

    it('should retry on failure and succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const result = await service.publicExecuteWithRetry(mockOperation, 'test-operation', 2, 100);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(service.publicExecuteWithRetry(mockOperation, 'test-operation', 1, 100))
        .rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'external_api',
          metricName: 'external_call_test-operation',
          tags: expect.objectContaining({
            status_code: 500,
            status: 'error',
            error: 'Persistent failure',
          }),
        })
      );
    });

    it('should use default retry parameters', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(service.publicExecuteWithRetry(mockOperation, 'test-operation'))
        .rejects.toThrow('Failure');

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkPerformanceThreshold', () => {
    it('should not log warning for fast operations', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.publicCheckPerformanceThreshold(1000, 10, 'req-123', 'test-op', 5000);

      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'performance',
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('should log warning and emit event for slow operations', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.publicCheckPerformanceThreshold(6000, 10, 'req-123', 'test-op', 5000);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '检测到慢响应',
        expect.objectContaining({
          requestId: 'req-123',
          operation: 'test-op',
          processingTimeMs: 6000,
          symbolsCount: 10,
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricType: 'performance',
          metricName: 'test-op_slow_response',
          metricValue: 6000,
          tags: expect.objectContaining({
            operation: 'test-op',
            provider: 'external_api',
            call_type: 'slow_response_detection',
            symbols_count: 10,
          }),
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('should calculate time per symbol correctly', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.publicCheckPerformanceThreshold(6000, 20, 'req-123', 'test-op', 5000);

      expect(eventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            time_per_symbol: 300,
          }),
        })
      );

      loggerWarnSpy.mockRestore();
    });

    it('should handle zero symbols gracefully', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.publicCheckPerformanceThreshold(6000, 0, 'req-123', 'test-op', 5000);

      expect(eventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          tags: expect.objectContaining({
            time_per_symbol: 0,
          }),
        })
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('standardizeError', () => {
    it('should return NotFoundException as-is', () => {
      const originalError = new NotFoundException('Resource not found');

      const result = service.publicStandardizeError(originalError, 'test-operation');

      expect(result).toBe(originalError);
      expect(result).toBeInstanceOf(NotFoundException);
    });

    it('should throw BusinessException for non-NotFoundException errors', () => {
      const originalError = new Error('Generic error');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      expect(() => {
        service.publicStandardizeError(originalError, 'test-operation', { extra: 'context' });
      }).toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Operation failed: test-operation',
        expect.objectContaining({
          extra: 'context',
          error: 'Generic error',
          errorType: 'Error',
          operation: 'test-operation',
        })
      );

      loggerErrorSpy.mockRestore();
    });

    it('should handle errors without message', () => {
      const originalError = {};
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      expect(() => {
        service.publicStandardizeError(originalError, 'test-operation');
      }).toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Operation failed: test-operation',
        expect.objectContaining({
          error: 'Unknown error',
          errorType: 'Unknown',
        })
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('Event Bus Integration', () => {
    it('should handle event emission failures gracefully', async () => {
      eventBus.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await service.publicExecuteWithRetry(mockOperation, 'test-operation');

      expect(result).toBe('success');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '外部调用事件发送失败',
        expect.objectContaining({
          error: 'Event emission failed',
          operation: 'test-operation',
        })
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Inheritance and Abstract Class Behavior', () => {
    it('should require implementation of executeCore in subclasses', () => {
      expect(service.executeCore).toBeDefined();
      expect(typeof service.executeCore).toBe('function');
    });

    it('should inherit protected methods', () => {
      expect(service.publicExecuteWithRetry).toBeDefined();
      expect(service.publicCheckPerformanceThreshold).toBeDefined();
      expect(service.publicStandardizeError).toBeDefined();
    });

    it('should be abstract and require subclass implementation', () => {
      expect(service.executeCore).toBeDefined();
      expect(service).toBeInstanceOf(TestBaseFetcherService);
      expect(service).toBeInstanceOf(BaseFetcherService);
    });
  });
});
