/**
 * MetricsConstants Unit Tests
 * 测试基础设施指标常量的定义和值
 */

import {
  METRICS_PREFIX,
  STREAM_RECOVERY_METRICS,
  DEFAULT_LABELS,
  HISTOGRAM_BUCKETS
} from '@monitoring/infrastructure/metrics/metrics.constants';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

describe('MetricsConstants', () => {
  describe('METRICS_PREFIX', () => {
    it('should define the correct metrics prefix', () => {
      expect(METRICS_PREFIX).toBe('newstock_');
    });
  });

  describe('STREAM_RECOVERY_METRICS', () => {
    it('should define all stream recovery metrics', () => {
      expect(STREAM_RECOVERY_METRICS.JOBS_TOTAL).toBe('stream_recovery_jobs_total');
      expect(STREAM_RECOVERY_METRICS.JOBS_PENDING).toBe('stream_recovery_jobs_pending');
      expect(STREAM_RECOVERY_METRICS.JOBS_ACTIVE).toBe('stream_recovery_jobs_active');
      expect(STREAM_RECOVERY_METRICS.JOBS_COMPLETED).toBe('stream_recovery_jobs_completed_total');
      expect(STREAM_RECOVERY_METRICS.JOBS_FAILED).toBe('stream_recovery_jobs_failed_total');
      expect(STREAM_RECOVERY_METRICS.LATENCY_SECONDS).toBe('stream_recovery_latency_seconds');
      expect(STREAM_RECOVERY_METRICS.DATA_POINTS_TOTAL).toBe('stream_recovery_data_points_total');
      expect(STREAM_RECOVERY_METRICS.BATCHES_SENT_TOTAL).toBe('stream_recovery_batches_sent_total');
      expect(STREAM_RECOVERY_METRICS.HEALTH_STATUS).toBe('stream_recovery_health_status');
      expect(STREAM_RECOVERY_METRICS.WORKER_STATUS).toBe('stream_recovery_worker_status');
    });

    it('should have correct type for stream recovery metrics', () => {
      const metrics: typeof STREAM_RECOVERY_METRICS = STREAM_RECOVERY_METRICS;
      expect(metrics.JOBS_TOTAL).toBe('stream_recovery_jobs_total');
    });
  });

  describe('DEFAULT_LABELS', () => {
    it('should define default labels with correct values', () => {
      expect(DEFAULT_LABELS.APP).toBe('newstock-api');
      expect(DEFAULT_LABELS.VERSION).toBeDefined();
    });

    it('should use package version or default to 1.0.0', () => {
      expect(DEFAULT_LABELS.VERSION).toMatch(/^(\d+\.\d+\.\d+|1\.0\.0)$/);
    });
  });

  describe('HISTOGRAM_BUCKETS', () => {
    it('should define latency ms buckets with correct values', () => {
      expect(HISTOGRAM_BUCKETS.LATENCY_MS).toEqual([
        1,
        5,
        10,
        20,
        50,
        100,
        200,
        500,
        1000,
        2000,
      ]);
    });

    it('should include SLOW_REQUEST_THRESHOLD_MS in latency ms buckets', () => {
      expect(HISTOGRAM_BUCKETS.LATENCY_MS).toContain(
        MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS
      );
    });

    it('should define latency seconds buckets with correct values', () => {
      expect(HISTOGRAM_BUCKETS.LATENCY_SECONDS).toEqual([
        0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
      ]);
    });

    it('should define batch size buckets with correct values', () => {
      expect(HISTOGRAM_BUCKETS.BATCH_SIZE).toEqual([
        1,
        5,
        10,
        25,
        50,
        100,
        250,
        500,
        1000,
        2500,
      ]);
    });

    it('should include default max buffer size in batch size buckets', () => {
      expect(HISTOGRAM_BUCKETS.BATCH_SIZE).toContain(
        MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE
      );
    });

    it('should define duration seconds buckets with correct values', () => {
      expect(HISTOGRAM_BUCKETS.DURATION_SECONDS).toEqual([
        0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5
      ]);
    });
  });
});