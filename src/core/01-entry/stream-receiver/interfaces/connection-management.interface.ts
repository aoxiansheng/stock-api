/**
 * StreamReceiver 连接管理相关接口定义
 * 定义连接管理专职服务的契约和数据结构
 */

import { StreamConnection, StreamConnectionParams } from "../../../03-fetching/stream-data-fetcher/interfaces";

/**
 * 连接健康统计接口
 */
export interface ConnectionHealthStats {
  total: number;
  excellent: number;
  good: number;
  poor: number;
  critical: number;
  healthy: number;
  unhealthy: number;
  healthRatio: number;
}

/**
 * 增强的流连接上下文接口
 */
export interface StreamConnectionContext {
  // 基础信息
  requestId: string;
  provider: string;
  capability: string;
  clientId: string;

  // 市场和符号信息
  market: string;
  symbolsCount: number;
  marketDistribution: Record<string, number>;

  // 配置信息
  connectionConfig: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    heartbeatIntervalMs: number;
    connectionTimeoutMs: number;
  };

  metricsConfig: {
    enableLatencyTracking: boolean;
    enableThroughputTracking: boolean;
    metricsPrefix: string;
  };

  errorHandling: {
    retryPolicy: string;
    maxRetries: number;
    circuitBreakerEnabled: boolean;
  };

  // 会话信息
  session: {
    createdAt: number;
    lastActivity: number;
    subscriptionCount: number;
  };
}

/**
 * 连接清理结果接口
 */
export interface ConnectionCleanupResult {
  staleConnectionsCleaned: number;
  unhealthyConnectionsCleaned: number;
  totalCleaned: number;
  remainingConnections: number;
  cleanupType: 'scheduled' | 'forced' | 'memory_pressure';
}

/**
 * 连接管理回调接口
 */
export interface ConnectionManagementCallbacks {
  /** 发送监控事件回调 */
  emitMonitoringEvent: (event: string, value: any, metadata?: any) => void;
  /** 发送业务事件回调 */
  emitBusinessEvent: (event: string, value: any, metadata?: any) => void;
  /** 记录连接指标回调 */
  recordConnectionMetrics: (connectionId: string, provider: string, capability: string, isConnected: boolean) => void;
}

/**
 * 连接管理器接口
 */
export interface IConnectionManager {
  /** 设置回调函数 */
  setCallbacks(callbacks: ConnectionManagementCallbacks): void;

  /** 获取或创建连接 */
  getOrCreateConnection(
    provider: string,
    capability: string,
    requestId: string,
    symbols: string[],
    clientId: string,
  ): Promise<StreamConnection>;

  /** 检查连接频率限制 */
  checkConnectionRateLimit(clientId: string): Promise<boolean>;

  /** 获取活跃连接数 */
  getActiveConnectionsCount(): number;

  /** 获取连接健康统计 */
  getConnectionHealthStats(): ConnectionHealthStats;

  /** 强制连接清理 */
  forceConnectionCleanup(): Promise<ConnectionCleanupResult>;

  /** 检查连接是否活跃 */
  isConnectionActive(connectionKey: string): boolean;

  /** 移除连接 */
  removeConnection(connectionKey: string): void;

  /** 更新连接健康状态 */
  updateConnectionHealth(connectionId: string, health: any): void;
}

/**
 * 连接限制检查结果接口
 */
export interface ConnectionLimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxCount: number;
  clientId: string;
}

/**
 * 市场分布分析结果接口
 */
export interface MarketDistributionAnalysis {
  primary: string;
  distribution: Record<string, number>;
  totalSymbols: number;
  marketCoverage: string[];
}

/**
 * 连接参数构建器接口
 */
export interface ConnectionParamsBuilder {
  buildConnectionParams(
    provider: string,
    capability: string,
    context: StreamConnectionContext,
  ): StreamConnectionParams;
}