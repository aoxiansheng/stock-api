/**
 * Stream Receiver 时间相关常量
 * 统一管理心跳、超时、恢复等时间配置
 */
export const STREAM_RECEIVER_TIMEOUTS = {
  // 心跳相关 (解决30000ms重复6次问题)
  HEARTBEAT_INTERVAL_MS: 30000, // 30秒心跳间隔
  HEARTBEAT_TIMEOUT_MS: 60000, // 60秒心跳超时
  HEARTBEAT_CHECK_INTERVAL_MS: 30000, // 30秒心跳检查间隔

  // 连接相关
  CONNECTION_TIMEOUT_MS: 30000, // 30秒连接超时
  RECONNECTION_DELAY_MS: 5000, // 5秒重连延迟

  // 恢复相关 (解决300000ms硬编码)
  RECOVERY_WINDOW_MS: 300000, // 5分钟恢复窗口
  RECOVERY_RETRY_INTERVAL_MS: 30000, // 30秒恢复重试间隔

  // 清理相关
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5分钟清理间隔
  STALE_CONNECTION_TIMEOUT_MS: 2 * 60 * 1000, // 2分钟过期连接超时
} as const;

// 类型定义供外部使用
export type StreamReceiverTimeouts = typeof STREAM_RECEIVER_TIMEOUTS;
