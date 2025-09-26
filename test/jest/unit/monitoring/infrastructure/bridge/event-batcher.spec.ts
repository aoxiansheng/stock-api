/**
 * EventBatcher Unit Tests
 * 测试事件批处理器的功能，包括批处理、背压控制和优雅关闭
 */

import { EventBatcher, BatchResult, BatcherMetrics } from '@monitoring/infrastructure/bridge/event-batcher';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

describe('EventBatcher', () => {
  let batcher: EventBatcher;
  const flushIntervalMs = 100;
  const maxBatchSize = 5;
  const maxQueueSize = 20;

  beforeEach(() => {
    batcher = new EventBatcher(flushIntervalMs, maxBatchSize, maxQueueSize);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultBatcher = new EventBatcher();
      
      expect(defaultBatcher).toBeDefined();
      // Check that defaults are set from MONITORING_SYSTEM_LIMITS
      expect((defaultBatcher as any).maxBatchSize).toBe(MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE);
      expect((defaultBatcher as any).maxQueueSize).toBe(10000);
      expect((defaultBatcher as any).flushIntervalMs).toBe(100);
    });

    it('should initialize with custom values', () => {
      expect(batcher).toBeDefined();
      expect((batcher as any).flushIntervalMs).toBe(flushIntervalMs);
      expect((batcher as any).maxBatchSize).toBe(maxBatchSize);
      expect((batcher as any).maxQueueSize).toBe(maxQueueSize);
    });
  });

  describe('add', () => {
    it('should add events to the batch', () => {
      const event = { id: 1, data: 'test' };
      const result: BatchResult = batcher.add('testType', event);

      expect(result.accepted).toBe(true);
      expect((batcher as any).totalEventCount).toBe(1);
      expect((batcher as any).batches.size).toBe(1);
    });

    it('should reject events when shutting down', () => {
      (batcher as any).isShuttingDown = true;
      const event = { id: 1, data: 'test' };
      const result: BatchResult = batcher.add('testType', event);

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('shutdown');
    });

    it('should reject events when queue is full', () => {
      // Fill the queue to capacity
      for (let i = 0; i < maxQueueSize; i++) {
        batcher.add('testType', { id: i });
      }

      const event = { id: maxQueueSize, data: 'overflow' };
      const result: BatchResult = batcher.add('testType', event);

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('queue_full');
      expect(result.droppedCount).toBe(1);
    });

    it('should flush when batch size is reached', () => {
      const flushTypeSpy = jest.spyOn(batcher, 'flushType');
      
      // Add enough events to trigger flush
      for (let i = 0; i < maxBatchSize; i++) {
        const result: BatchResult = batcher.add('testType', { id: i });
        
        if (i === maxBatchSize - 1) {
          expect(result.shouldFlush).toBe(true);
        } else {
          expect(result.shouldFlush).toBeUndefined();
        }
      }

      expect(flushTypeSpy).toHaveBeenCalledWith('testType');
    });

    it('should flush when high water mark is reached', () => {
      const flushAllSpy = jest.spyOn(batcher, 'flushAll');
      const highWaterMark = Math.floor(maxQueueSize * 0.8); // 16 events
      
      // Add events up to high water mark
      for (let i = 0; i < highWaterMark; i++) {
        const result: BatchResult = batcher.add('testType', { id: i });
        
        if (i === highWaterMark - 1) {
          expect(result.shouldFlush).toBe(true);
        }
      }

      expect(flushAllSpy).toHaveBeenCalled();
    });

    it('should start flush timer when first event is added', () => {
      jest.useFakeTimers();
      const flushAllSpy = jest.spyOn(batcher, 'flushAll');
      
      const result: BatchResult = batcher.add('testType', { id: 1 });
      
      expect(result.shouldFlush).toBeUndefined();
      expect((batcher as any).flushTimer).toBeDefined();
      
      // Advance timers to trigger flush
      jest.advanceTimersByTime(flushIntervalMs);
      
      expect(flushAllSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('flushType', () => {
    it('should flush a specific event type', () => {
      const event = { id: 1, data: 'test' };
      batcher.add('testType', event);
      
      const batch = batcher.flushType('testType');
      
      expect(batch).toBeDefined();
      expect(batch?.type).toBe('testType');
      expect(batch?.events).toEqual([event]);
      expect(batch?.count).toBe(1);
      expect((batcher as any).batches.size).toBe(0);
      expect((batcher as any).totalEventCount).toBe(0);
    });

    it('should return null for non-existent event type', () => {
      const batch = batcher.flushType('nonExistentType');
      
      expect(batch).toBeNull();
    });
  });

  describe('flushAll', () => {
    it('should flush all batches', () => {
      batcher.add('type1', { id: 1 });
      batcher.add('type1', { id: 2 });
      batcher.add('type2', { id: 3 });
      
      const batches = batcher.flushAll();
      
      expect(batches).toHaveLength(2);
      expect(batches[0].type).toBe('type1');
      expect(batches[1].type).toBe('type2');
      expect((batcher as any).batches.size).toBe(0);
      expect((batcher as any).totalEventCount).toBe(0);
    });

    it('should clear the flush timer', () => {
      jest.useFakeTimers();
      
      batcher.add('testType', { id: 1 });
      expect((batcher as any).flushTimer).toBeDefined();
      
      batcher.flushAll();
      expect((batcher as any).flushTimer).toBeUndefined();
      
      jest.useRealTimers();
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      batcher.add('type1', { id: 1 });
      batcher.add('type1', { id: 2 });
      batcher.add('type2', { id: 3 });
      
      const metrics: BatcherMetrics = batcher.getMetrics();
      
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.droppedEvents).toBe(0);
      expect(metrics.batchCount).toBe(2);
      expect(metrics.isShuttingDown).toBe(false);
      expect(metrics.queueUtilization).toBe((3 / maxQueueSize) * 100);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      batcher.add('type1', { id: 1 });
      batcher.add('type2', { id: 2 });
      
      await batcher.shutdown();
      
      expect((batcher as any).isShuttingDown).toBe(true);
      expect((batcher as any).batches.size).toBe(0);
      expect((batcher as any).totalEventCount).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset dropped events count', () => {
      // Fill queue to trigger drops
      for (let i = 0; i < maxQueueSize + 5; i++) {
        batcher.add('testType', { id: i });
      }
      
      expect(batcher.getMetrics().droppedEvents).toBeGreaterThan(0);
      
      batcher.resetMetrics();
      
      expect(batcher.getMetrics().droppedEvents).toBe(0);
    });
  });

  describe('isHealthy', () => {
    it('should return true when batcher is healthy', () => {
      batcher.add('type1', { id: 1 });
      
      expect(batcher.isHealthy()).toBe(true);
    });

    it('should return false when shutting down', () => {
      (batcher as any).isShuttingDown = true;
      
      expect(batcher.isHealthy()).toBe(false);
    });

    it('should return false when queue is full', () => {
      // Fill the queue to capacity
      for (let i = 0; i < maxQueueSize; i++) {
        batcher.add('testType', { id: i });
      }
      
      expect(batcher.isHealthy()).toBe(false);
    });

    it('should return false when too many events are dropped', () => {
      // Mock dropped events to exceed threshold
      (batcher as any).droppedEvents = MONITORING_SYSTEM_LIMITS.MAX_BATCH_SIZE + 1;
      
      expect(batcher.isHealthy()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return healthy status when batcher is healthy', () => {
      batcher.add('type1', { id: 1 });
      
      const status = batcher.getStatus();
      
      expect(status.status).toBe('healthy');
      expect(status.reason).toBeUndefined();
    });

    it('should return unhealthy status when shutting down', () => {
      (batcher as any).isShuttingDown = true;
      
      const status = batcher.getStatus();
      
      expect(status.status).toBe('unhealthy');
      expect(status.reason).toBe('shutting_down');
    });

    it('should return unhealthy status when queue is nearly full', () => {
      // Fill queue to 90%+ capacity
      const nearlyFullCount = Math.ceil(maxQueueSize * 0.91);
      for (let i = 0; i < nearlyFullCount; i++) {
        batcher.add('testType', { id: i });
      }
      
      const status = batcher.getStatus();
      
      expect(status.status).toBe('unhealthy');
      expect(status.reason).toBe('queue_nearly_full');
    });

    it('should return degraded status when queue utilization is high', () => {
      // Fill queue to 70%+ capacity
      const highUtilizationCount = Math.ceil(maxQueueSize * 0.71);
      for (let i = 0; i < highUtilizationCount; i++) {
        batcher.add('testType', { id: i });
      }
      
      const status = batcher.getStatus();
      
      expect(status.status).toBe('degraded');
      expect(status.reason).toBe('high_utilization');
    });

    it('should return degraded status when events are dropped', () => {
      // Mock dropped events to exceed threshold
      (batcher as any).droppedEvents = 51;
      
      const status = batcher.getStatus();
      
      expect(status.status).toBe('degraded');
      expect(status.reason).toBe('events_dropped');
    });
  });

  describe('forceFlush', () => {
    it('should force flush a specific event type', () => {
      batcher.add('type1', { id: 1 });
      batcher.add('type2', { id: 2 });
      
      const batches = batcher.forceFlush('type1');
      
      expect(batches).toHaveLength(1);
      expect(batches[0].type).toBe('type1');
      expect((batcher as any).batches.size).toBe(1);
    });

    it('should force flush all event types when no type specified', () => {
      batcher.add('type1', { id: 1 });
      batcher.add('type2', { id: 2 });
      
      const batches = batcher.forceFlush();
      
      expect(batches).toHaveLength(2);
      expect((batcher as any).batches.size).toBe(0);
    });
  });
});