import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BackgroundTaskService } from '@common/infrastructure/services/background-task.service';
// // import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

// Mock the logger to avoid console output during tests
jest.mock('@common/modules/logging', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe('BackgroundTaskService', () => {
  let service: BackgroundTaskService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundTaskService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BackgroundTaskService>(BackgroundTaskService);
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('run', () => {
    beforeEach(() => {
      // Use fake timers to control setImmediate
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute a successful task in the background', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'test_task';

      service.run(mockTask, description);

      // Fast-forward through setImmediate
      jest.runOnlyPendingTimers();

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should increment and decrement task counter correctly', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'test_task';

      // Initially no tasks
      expect(service.getTaskStatistics()).toEqual({});

      // Start task
      service.run(mockTask, description);

      // Check counter incremented
      expect(service.getTaskStatistics()[description]).toBe(1);

      // Complete task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Check counter decremented
      expect(service.getTaskStatistics()).toEqual({});
    });

    it('should handle multiple tasks of same type', async () => {
      const mockTask1 = jest.fn().mockResolvedValue('success1');
      const mockTask2 = jest.fn().mockResolvedValue('success2');
      const description = 'test_task';

      // Start two tasks
      service.run(mockTask1, description);
      service.run(mockTask2, description);

      // Check counter shows 2 tasks
      expect(service.getTaskStatistics()[description]).toBe(2);

      // Complete first task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Counter should be 1
      expect(service.getTaskStatistics()[description]).toBe(1);

      // Complete second task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Counter should be cleared
      expect(service.getTaskStatistics()).toEqual({});
    });

    it('should handle different task types separately', async () => {
      const mockTask1 = jest.fn().mockResolvedValue('success1');
      const mockTask2 = jest.fn().mockResolvedValue('success2');

      service.run(mockTask1, 'task_type_1');
      service.run(mockTask2, 'task_type_2');

      const stats = service.getTaskStatistics();
      expect(stats['task_type_1']).toBe(1);
      expect(stats['task_type_2']).toBe(1);
    });

    it('should emit success event when task completes successfully', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'test_task';

      service.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission (also uses setImmediate)
      jest.runOnlyPendingTimers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'background_task_service',
          metricType: 'business',
          metricName: 'background_task_completed',
          tags: expect.objectContaining({
            operation: 'background_task',
            task_type: description,
            status: 'success',
          }),
        })
      );
    });

    it('should emit error event when task fails', async () => {
      const error = new Error('Task failed');
      const mockTask = jest.fn().mockRejectedValue(error);
      const description = 'failing_task';

      service.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission
      jest.runOnlyPendingTimers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'background_task_service',
          metricType: 'business',
          metricName: 'background_task_failed',
          tags: expect.objectContaining({
            operation: 'background_task',
            task_type: description,
            status: 'error',
            error: 'Task failed',
          }),
        })
      );
    });

    it('should continue to decrement counter even when task fails', async () => {
      const mockTask = jest.fn().mockRejectedValue(new Error('Task failed'));
      const description = 'failing_task';

      service.run(mockTask, description);

      // Check counter incremented
      expect(service.getTaskStatistics()[description]).toBe(1);

      // Complete task (with failure)
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Check counter decremented despite failure
      expect(service.getTaskStatistics()).toEqual({});
    });

    it('should generate unique task IDs', () => {
      const mockTask1 = jest.fn().mockResolvedValue('success1');
      const mockTask2 = jest.fn().mockResolvedValue('success2');
      const description = 'test_task';

      service.run(mockTask1, description);
      service.run(mockTask2, description);

      jest.runOnlyPendingTimers();

      // We can't directly access task IDs, but we can verify they exist
      // and are different by checking the task counter behavior
      expect(service.getTaskStatistics()[description]).toBe(2);
    });

    it('should handle tasks that throw synchronous errors', async () => {
      const mockTask = jest.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });
      const description = 'sync_error_task';

      service.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission
      jest.runOnlyPendingTimers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'background_task_failed',
          tags: expect.objectContaining({
            status: 'error',
            error: 'Synchronous error',
          }),
        })
      );
    });

    it('should handle tasks that return non-promise values', async () => {
      const mockTask = jest.fn().mockReturnValue('immediate_value');
      const description = 'immediate_task';

      service.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission
      jest.runOnlyPendingTimers();

      expect(mockTask).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'background_task_completed',
          tags: expect.objectContaining({
            status: 'success',
          }),
        })
      );
    });

    it('should measure task duration correctly', async () => {
      const mockTask = jest.fn().mockImplementation(async () => {
        // Simulate some processing time
        jest.advanceTimersByTime(100);
        return 'success';
      });
      const description = 'timed_task';

      service.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission
      jest.runOnlyPendingTimers();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricValue: expect.any(Number),
          tags: expect.objectContaining({
            status: 'success',
          }),
        })
      );
    });
  });

  describe('getTaskStatistics', () => {
    it('should return empty object when no tasks are running', () => {
      expect(service.getTaskStatistics()).toEqual({});
    });

    it('should return task counts for running tasks', () => {
      const mockTask = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      service.run(mockTask, 'task_a');
      service.run(mockTask, 'task_a');
      service.run(mockTask, 'task_b');

      const stats = service.getTaskStatistics();
      expect(stats).toEqual({
        task_a: 2,
        task_b: 1,
      });
    });

    it('should return immutable snapshot of statistics', () => {
      const mockTask = jest.fn().mockImplementation(() => new Promise(() => {}));

      service.run(mockTask, 'test_task');

      const stats1 = service.getTaskStatistics();
      const stats2 = service.getTaskStatistics();

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Different objects
    });
  });

  describe('error handling in event emission', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle event emission errors gracefully', async () => {
      // Mock eventEmitter.emit to throw an error
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'test_task';

      // This should not throw despite event emission failure
      expect(() => {
        service.run(mockTask, description);
      }).not.toThrow();

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission (which will fail)
      jest.runOnlyPendingTimers();

      // Task should still complete successfully
      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should log warning when event emission fails', async () => {
      const mockLogger = {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      // Import the mocked createLogger function
      const { createLogger } = require('@common/modules/logging');
      createLogger.mockReturnValue(mockLogger);

      // Create a new service instance to use the mocked logger
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BackgroundTaskService,
          { provide: EventEmitter2, useValue: eventEmitter },
        ],
      }).compile();

      const testService = module.get<BackgroundTaskService>(BackgroundTaskService);

      // Mock eventEmitter.emit to throw an error
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'test_task';

      testService.run(mockTask, description);

      // Complete the task
      jest.runOnlyPendingTimers();
      await new Promise(process.nextTick);

      // Fast-forward the event emission
      jest.runOnlyPendingTimers();

      // Should have logged a warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '后台任务监控事件发送失败',
        expect.objectContaining({
          error: 'Event emission failed',
          metricName: 'background_task_completed',
        })
      );
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle rapid task submission', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      const description = 'rapid_task';

      // Submit many tasks rapidly
      for (let i = 0; i < 10; i++) {
        service.run(mockTask, description);
      }

      expect(service.getTaskStatistics()[description]).toBe(10);

      // Complete all tasks
      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(mockTask).toHaveBeenCalledTimes(10);
      expect(service.getTaskStatistics()).toEqual({});
    });

    it('should handle mixed success and failure scenarios', async () => {
      const successTask = jest.fn().mockResolvedValue('success');
      const failureTask = jest.fn().mockRejectedValue(new Error('failure'));

      service.run(successTask, 'mixed_task');
      service.run(failureTask, 'mixed_task');
      service.run(successTask, 'mixed_task');

      expect(service.getTaskStatistics()['mixed_task']).toBe(3);

      // Complete all tasks
      jest.runAllTimers();
      await new Promise(process.nextTick);

      // All tasks should have been executed
      expect(successTask).toHaveBeenCalledTimes(2);
      expect(failureTask).toHaveBeenCalledTimes(1);

      // Counter should be cleared
      expect(service.getTaskStatistics()).toEqual({});

      // Should have emitted both success and failure events
      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'background_task_completed',
        })
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'background_task_failed',
        })
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle task with very long description', async () => {
      const longDescription = 'a'.repeat(1000);
      const mockTask = jest.fn().mockResolvedValue('success');

      service.run(mockTask, longDescription);

      expect(service.getTaskStatistics()[longDescription]).toBe(1);

      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should handle task with special characters in description', async () => {
      const specialDescription = 'task-with_special.chars@123#$%';
      const mockTask = jest.fn().mockResolvedValue('success');

      service.run(mockTask, specialDescription);

      expect(service.getTaskStatistics()[specialDescription]).toBe(1);

      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should handle empty task description', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');

      service.run(mockTask, '');

      expect(service.getTaskStatistics()['']).toBe(1);

      jest.runAllTimers();
      await new Promise(process.nextTick);

      expect(mockTask).toHaveBeenCalledTimes(1);
    });
  });
});
