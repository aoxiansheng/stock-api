/**
 * 提供商超时配置常量
 * 职责：统一管理所有提供商相关的超时、重试和连接配置
 */

export const PROVIDER_TIMEOUT = {
  // 连接超时配置
  LOCK_TIMEOUT_MS: 10_000,           // 10秒锁定超时
  MAX_RECONNECT_ATTEMPTS: 5,         // 最大重连次数
  RECONNECT_DELAY_MS: 1_000,         // 1秒重连延迟
  
  // 缓存配置
  CACHE_DURATION_MS: 5 * 60 * 1000,  // 5分钟缓存
  CACHE_CLEANUP_INTERVAL_MS: 30_000, // 30秒清理间隔
  
  // WebSocket配置
  HEARTBEAT_INTERVAL_MS: 10_000,     // 10秒心跳间隔
  CONNECTION_TIMEOUT_MS: 15_000,     // 15秒连接超时
  
  // Stream处理配置
  STREAM_BUFFER_SIZE: 100,           // 流缓冲区大小
  STREAM_BATCH_TIMEOUT_MS: 500,      // 批处理超时
} as const;

// 类型导出
export type ProviderTimeoutConfig = typeof PROVIDER_TIMEOUT;

/**
 * 超时配置验证函数
 */
export function validateTimeoutConfig(): boolean {
  const requiredKeys = [
    'LOCK_TIMEOUT_MS',
    'MAX_RECONNECT_ATTEMPTS', 
    'RECONNECT_DELAY_MS',
    'CACHE_DURATION_MS'
  ];
  
  return requiredKeys.every(key => key in PROVIDER_TIMEOUT);
}