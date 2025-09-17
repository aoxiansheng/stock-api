/**
 * Stream Receiver 性能监控相关常量
 * 统一管理性能计算、熔断器等指标
 */
export const STREAM_RECEIVER_METRICS = {
  // 性能计算基准 (解决1000ms重复8次问题)
  PERFORMANCE_CALCULATION_UNIT_MS: 1000, // 1秒为基准单位
  THROUGHPUT_CALCULATION_WINDOW_MS: 1000, // 1秒吞吐计算窗口
  BATCH_RATE_CALCULATION_UNIT_MS: 1000, // 1秒批次率计算单位

  // 熔断器相关
  CIRCUIT_BREAKER_RESET_THRESHOLD: 1000, // 熔断器重置阈值
  CIRCUIT_BREAKER_CHECK_INTERVAL_MS: 5000, // 5秒熔断器检查间隔

  // 监控采样
  METRICS_SAMPLING_INTERVAL_MS: 1000, // 1秒指标采样间隔
  PERFORMANCE_SNAPSHOT_INTERVAL_MS: 5000, // 5秒性能快照间隔
} as const;

export type StreamReceiverMetrics = typeof STREAM_RECEIVER_METRICS;
