/**
 * 熔断器状态枚举
 * 管理流接收器的熔断器状态机制
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',       // 正常状态，允许请求通过
  OPEN = 'open',           // 熔断状态，拒绝请求
  HALF_OPEN = 'half_open'  // 半开状态，允许少量请求测试
}

/**
 * 熔断器配置常量
 */
export const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 5,           // 失败次数阈值
  SUCCESS_THRESHOLD: 3,           // 半开状态成功次数阈值
  TIMEOUT_MS: 60000,             // 60秒超时后尝试半开
  RETRY_ATTEMPTS: 3,             // 重试次数
} as const;