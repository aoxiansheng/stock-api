/**
 * 🎯 基础设施指标常量定义
 */

import { MONITORING_SYSTEM_LIMITS } from "../../constants/config/monitoring-system.constants";

// Prometheus 指标名称前缀
export const METRICS_PREFIX = "newstock_";

// Stream Recovery 指标名称
export const STREAM_RECOVERY_METRICS = {
  JOBS_TOTAL: "stream_recovery_jobs_total",
  JOBS_PENDING: "stream_recovery_jobs_pending",
  JOBS_ACTIVE: "stream_recovery_jobs_active",
  JOBS_COMPLETED: "stream_recovery_jobs_completed_total",
  JOBS_FAILED: "stream_recovery_jobs_failed_total",
  LATENCY_SECONDS: "stream_recovery_latency_seconds",
  DATA_POINTS_TOTAL: "stream_recovery_data_points_total",
  BATCHES_SENT_TOTAL: "stream_recovery_batches_sent_total",
  HEALTH_STATUS: "stream_recovery_health_status",
  WORKER_STATUS: "stream_recovery_worker_status",
} as const;

// 默认标签
export const DEFAULT_LABELS = {
  APP: "newstock-api",
  VERSION: process.env.npm_package_version || "1.0.0",
} as const;

// Histogram 桶配置
export const HISTOGRAM_BUCKETS = {
  LATENCY_MS: [1, 5, 10, 20, 50, 100, 200, 500, MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS, 2000],
  LATENCY_SECONDS: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  BATCH_SIZE: [1, 5, 10, 25, 50, 100, 250, 500, MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE, 2500],
  DURATION_SECONDS: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5],
} as const;
