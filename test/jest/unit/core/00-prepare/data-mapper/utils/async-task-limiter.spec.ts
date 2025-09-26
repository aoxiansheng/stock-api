import { AsyncTaskLimiter } from '../../../../../../../src/core/00-prepare/data-mapper/utils/async-task-limiter';

describe('AsyncTaskLimiter', () => {
  let limiter: AsyncTaskLimiter;

  beforeEach(() => {
    limiter = new AsyncTaskLimiter();
  });

  afterEach(async () => {
    // Wait for all pending tasks to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      const defaultLimiter = new AsyncTaskLimiter();
      expect(defaultLimiter.getMaxPending()).toBe(30);
      expect(defaultLimiter.getTaskTimeout()).toBe(5000);
      expect(defaultLimiter.getMaxQueueSize()).toBe(100);
    });

    it('should initialize with custom parameters', () => {
      const customLimiter = new AsyncTaskLimiter(10, 2000, 50);
      expect(customLimiter.getMaxPending()).toBe(10);
      expect(customLimiter.getTaskTimeout()).toBe(2000);
      expect(customLimiter.getMaxQueueSize()).toBe(50);
    });
  });

  describe('schedule', () => {
    it('should execute task immediately when under limit', async () => {
      const task = jest.fn().mockResolvedValue('result');
      await limiter.schedule(task);

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(task).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple tasks concurrently up to limit', async () => {
      const maxPending = 3;
      const customLimiter = new AsyncTaskLimiter(maxPending);
      const tasks: jest.Mock[] = [];

      // Create tasks that will run concurrently
      for (let i = 0; i < maxPending; i++) {
        const task = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return `result_${i}`;
        });
        tasks.push(task);
        await customLimiter.schedule(task);
      }

      // Allow tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // All tasks should be pending
      expect(customLimiter.getPendingCount()).toBe(maxPending);

      // Wait for tasks to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      tasks.forEach(task => {
        expect(task).toHaveBeenCalledTimes(1);
      });
    });

    it('should queue tasks when at limit', async () => {
      const maxPending = 2;
      const customLimiter = new AsyncTaskLimiter(maxPending, 5000, 10);
      const tasks: jest.Mock[] = [];

      // Create more tasks than the limit
      for (let i = 0; i < 4; i++) {
        const task = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          return `result_${i}`;
        });
        tasks.push(task);
        await customLimiter.schedule(task);
      }

      // Wait for initial execution
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(customLimiter.getPendingCount()).toBe(maxPending);
      expect(customLimiter.getQueueLength()).toBe(2);

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      tasks.forEach(task => {
        expect(task).toHaveBeenCalledTimes(1);
      });
    });

    it('should drop tasks when queue is full', async () => {
      const maxPending = 1;
      const maxQueue = 2;
      const customLimiter = new AsyncTaskLimiter(maxPending, 5000, maxQueue);

      // Create a long-running task to block execution
      const blockingTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'blocking';
      });

      // Create tasks to fill queue
      const queuedTask1 = jest.fn().mockResolvedValue('queued1');
      const queuedTask2 = jest.fn().mockResolvedValue('queued2');
      const droppedTask = jest.fn().mockResolvedValue('dropped');

      // Schedule tasks
      await customLimiter.schedule(blockingTask); // Will execute immediately
      await customLimiter.schedule(queuedTask1);   // Will be queued
      await customLimiter.schedule(queuedTask2);   // Will be queued
      await customLimiter.schedule(droppedTask);   // Should be dropped

      // Wait for initial state
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(customLimiter.getPendingCount()).toBe(1);
      expect(customLimiter.getQueueLength()).toBe(2);

      // Wait for all tasks to potentially complete
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(blockingTask).toHaveBeenCalledTimes(1);
      expect(queuedTask1).toHaveBeenCalledTimes(1);
      expect(queuedTask2).toHaveBeenCalledTimes(1);
      expect(droppedTask).not.toHaveBeenCalled(); // Should be dropped
    });

    it('should handle task failures gracefully', async () => {
      const failingTask = jest.fn().mockRejectedValue(new Error('Task failed'));
      const successfulTask = jest.fn().mockResolvedValue('success');

      await limiter.schedule(failingTask);
      await limiter.schedule(successfulTask);

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(failingTask).toHaveBeenCalledTimes(1);
      expect(successfulTask).toHaveBeenCalledTimes(1);
    });

    it('should handle task timeouts', async () => {
      const shortTimeoutLimiter = new AsyncTaskLimiter(30, 10, 100); // 10ms timeout
      const longRunningTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Takes 50ms
        return 'should timeout';
      });

      await shortTimeoutLimiter.schedule(longRunningTask);

      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 30));

      expect(longRunningTask).toHaveBeenCalledTimes(1);
      expect(shortTimeoutLimiter.getPendingCount()).toBe(0);
    });

    it('should process queue after task completion', async () => {
      const maxPending = 1;
      const customLimiter = new AsyncTaskLimiter(maxPending);

      const firstTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'first';
      });

      const queuedTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'queued';
      });

      await customLimiter.schedule(firstTask);
      await customLimiter.schedule(queuedTask);

      // Initial state: one running, one queued
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(customLimiter.getPendingCount()).toBe(1);
      expect(customLimiter.getQueueLength()).toBe(1);

      // Wait for first task to complete and queued task to start
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(customLimiter.getQueueLength()).toBe(0);

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(firstTask).toHaveBeenCalledTimes(1);
      expect(queuedTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('getter methods', () => {
    it('should return correct pending count', async () => {
      expect(limiter.getPendingCount()).toBe(0);

      const slowTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return 'slow';
      });

      await limiter.schedule(slowTask);

      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(limiter.getPendingCount()).toBe(1);

      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(limiter.getPendingCount()).toBe(0);
    });

    it('should return correct queue length', async () => {
      const maxPending = 1;
      const customLimiter = new AsyncTaskLimiter(maxPending);

      expect(customLimiter.getQueueLength()).toBe(0);

      // Add blocking task
      const blockingTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'blocking';
      });

      const queuedTask1 = jest.fn().mockResolvedValue('queued1');
      const queuedTask2 = jest.fn().mockResolvedValue('queued2');

      await customLimiter.schedule(blockingTask);
      await customLimiter.schedule(queuedTask1);
      await customLimiter.schedule(queuedTask2);

      expect(customLimiter.getQueueLength()).toBe(2);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should return correct configuration values', () => {
      const customLimiter = new AsyncTaskLimiter(15, 3000, 75);

      expect(customLimiter.getMaxPending()).toBe(15);
      expect(customLimiter.getTaskTimeout()).toBe(3000);
      expect(customLimiter.getMaxQueueSize()).toBe(75);
    });
  });

  describe('getStats', () => {
    it('should return complete statistics', async () => {
      const maxPending = 2;
      const taskTimeout = 1000;
      const maxQueueSize = 5;
      const customLimiter = new AsyncTaskLimiter(maxPending, taskTimeout, maxQueueSize);

      // Initial stats
      let stats = customLimiter.getStats();
      expect(stats).toEqual({
        pending: 0,
        queued: 0,
        maxPending,
        maxQueueSize,
        taskTimeout,
      });

      // Add some tasks
      const blockingTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'blocking';
      });

      const queuedTask = jest.fn().mockResolvedValue('queued');

      await customLimiter.schedule(blockingTask);
      await customLimiter.schedule(blockingTask);
      await customLimiter.schedule(queuedTask);

      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 10));

      stats = customLimiter.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.queued).toBe(1);
      expect(stats.maxPending).toBe(maxPending);
      expect(stats.maxQueueSize).toBe(maxQueueSize);
      expect(stats.taskTimeout).toBe(taskTimeout);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should reflect real-time changes in statistics', async () => {
      const customLimiter = new AsyncTaskLimiter(1, 5000, 10);

      const longTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
        return 'long';
      });

      const quickTask = jest.fn().mockResolvedValue('quick');

      // Initial state
      expect(customLimiter.getStats().pending).toBe(0);
      expect(customLimiter.getStats().queued).toBe(0);

      // Schedule tasks
      await customLimiter.schedule(longTask);
      await customLimiter.schedule(quickTask);

      // Check intermediate state
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(customLimiter.getStats().pending).toBe(1);
      expect(customLimiter.getStats().queued).toBe(1);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(customLimiter.getStats().pending).toBe(0);
      expect(customLimiter.getStats().queued).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxPending', () => {
      const zeroLimiter = new AsyncTaskLimiter(0, 1000, 10);
      const task = jest.fn().mockResolvedValue('test');

      // With zero max pending, all tasks should be queued
      zeroLimiter.schedule(task);

      expect(zeroLimiter.getPendingCount()).toBe(0);
      expect(zeroLimiter.getQueueLength()).toBe(1);
    });

    it('should handle zero maxQueueSize', async () => {
      const noQueueLimiter = new AsyncTaskLimiter(1, 1000, 0);

      const blockingTask = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'blocking';
      });

      const droppedTask = jest.fn().mockResolvedValue('dropped');

      await noQueueLimiter.schedule(blockingTask);
      await noQueueLimiter.schedule(droppedTask); // Should be dropped immediately

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(noQueueLimiter.getPendingCount()).toBe(1);
      expect(noQueueLimiter.getQueueLength()).toBe(0);
      expect(droppedTask).not.toHaveBeenCalled();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    it('should handle tasks that throw synchronously', async () => {
      const syncThrowingTask = jest.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const normalTask = jest.fn().mockResolvedValue('normal');

      await limiter.schedule(syncThrowingTask);
      await limiter.schedule(normalTask);

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(syncThrowingTask).toHaveBeenCalledTimes(1);
      expect(normalTask).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid scheduling', async () => {
      const tasks: jest.Mock[] = [];
      const taskCount = 50;

      // Create many tasks rapidly
      for (let i = 0; i < taskCount; i++) {
        const task = jest.fn().mockResolvedValue(`result_${i}`);
        tasks.push(task);
        await limiter.schedule(task);
      }

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // All tasks should have been executed eventually
      tasks.forEach(task => {
        expect(task).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('memory management', () => {
    it('should not accumulate completed tasks', async () => {
      const customLimiter = new AsyncTaskLimiter(5, 1000, 20);
      const taskCount = 30;

      // Schedule many quick tasks
      for (let i = 0; i < taskCount; i++) {
        const task = jest.fn().mockResolvedValue(`result_${i}`);
        await customLimiter.schedule(task);
      }

      // Wait for all tasks to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have any pending or queued tasks
      expect(customLimiter.getPendingCount()).toBe(0);
      expect(customLimiter.getQueueLength()).toBe(0);
    });

    it('should properly clean up after timeouts', async () => {
      const timeoutLimiter = new AsyncTaskLimiter(3, 20, 10); // 20ms timeout

      // Create tasks that will timeout
      const timeoutTasks = [];
      for (let i = 0; i < 5; i++) {
        const task = jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // Much longer than timeout
          return `timeout_task_${i}`;
        });
        timeoutTasks.push(task);
        await timeoutLimiter.schedule(task);
      }

      // Wait for timeouts to occur
      await new Promise(resolve => setTimeout(resolve, 50));

      // All pending count should be cleared
      expect(timeoutLimiter.getPendingCount()).toBe(0);

      // Wait a bit more for any remaining cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  });
});