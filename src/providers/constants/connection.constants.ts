/**
 * 提供商连接配置常量
 * 职责：统一管理连接状态、健康检查和重连策略
 */

import { PROVIDER_TIMEOUT } from './timeout.constants';

/**
 * 统一的连接状态枚举
 */
export enum ConnectionStatus {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  TERMINATED = 'terminated',
}

/**
 * 连接相关配置
 */
export const CONNECTION_CONFIG = {
  // 健康状态
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded', 
    FAILED: 'health_failed',
  } as const,
  
  // 重连配置
  RECONNECT: {
  } as const,

  // 连接池配置
  POOL: {
    MAX_SIZE: 10,
  } as const,
} as const;

/**
 * 连接状态接口
 */
export interface IConnectionState {
  status: ConnectionStatus;
  isInitialized: boolean;
  lastConnectionTime: number | null;
  subscriptionCount: number;
  connectionId: string | null;
  healthStatus: typeof CONNECTION_CONFIG.HEALTH_STATUS[keyof typeof CONNECTION_CONFIG.HEALTH_STATUS];
  reconnectAttempts?: number;
  lastError?: string;
}

/**
 * 获取连接状态的可读描述
 */
export function getConnectionStatusDescription(status: ConnectionStatus): string {
  const descriptions = {
    [ConnectionStatus.NOT_STARTED]: '未开始',
    [ConnectionStatus.INITIALIZING]: '初始化中',
    [ConnectionStatus.CONNECTED]: '已连接',
    [ConnectionStatus.RECONNECTING]: '重连中',
    [ConnectionStatus.DISCONNECTED]: '已断开',
    [ConnectionStatus.FAILED]: '连接失败',
    [ConnectionStatus.TERMINATED]: '已终止',
  };
  
  return descriptions[status] || '未知状态';
}

/**
 * 检查连接状态是否为活跃状态
 */
export function isActiveConnectionStatus(status: ConnectionStatus): boolean {
  return [
    ConnectionStatus.CONNECTED,
    ConnectionStatus.RECONNECTING,
    ConnectionStatus.INITIALIZING,
  ].includes(status);
}