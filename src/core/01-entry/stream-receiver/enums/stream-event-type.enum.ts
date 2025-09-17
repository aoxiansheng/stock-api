/**
 * Stream 事件类型枚举
 * 定义WebSocket流接收器的各种事件类型
 */
export enum StreamEventType {
  // 连接事件
  CONNECTION_OPENED = "connection_opened",
  CONNECTION_CLOSED = "connection_closed",
  CONNECTION_ERROR = "connection_error",

  // 数据事件
  DATA_RECEIVED = "data_received",
  DATA_PROCESSED = "data_processed",
  DATA_ERROR = "data_error",

  // 心跳事件
  HEARTBEAT_SENT = "heartbeat_sent",
  HEARTBEAT_RECEIVED = "heartbeat_received",
  HEARTBEAT_TIMEOUT = "heartbeat_timeout",

  // 订阅事件
  SUBSCRIPTION_CREATED = "subscription_created",
  SUBSCRIPTION_UPDATED = "subscription_updated",
  SUBSCRIPTION_REMOVED = "subscription_removed",

  // 系统事件
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  MEMORY_WARNING = "memory_warning",
  PERFORMANCE_DEGRADATION = "performance_degradation",
}
