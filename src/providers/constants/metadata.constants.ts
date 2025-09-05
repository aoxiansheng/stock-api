/**
 * 提供商元数据键值常量
 * 职责：统一管理装饰器和依赖注入的元数据键值
 */

/**
 * 元数据键值常量
 */
export const METADATA_KEYS = {
  PROVIDER_METADATA: Symbol('provider:metadata'),
  CAPABILITY_METADATA: Symbol('capability:metadata'), 
  STREAM_METADATA: Symbol('stream:metadata'),
  HEALTH_CHECK_METADATA: Symbol('health-check:metadata'),
  ERROR_HANDLER_METADATA: Symbol('error-handler:metadata'),
  RATE_LIMIT_METADATA: Symbol('rate-limit:metadata'),
} as const;

/**
 * 提供商配置接口
 */
export interface IProviderMetadata {
  name: string;
  description: string;
  version?: string;
  autoRegister: boolean;
  healthCheck: boolean;
  initPriority: number;
  market?: string;
  supportedSymbols?: string[];
}

/**
 * 能力配置接口
 */
export interface ICapabilityMetadata {
  name: string;
  method: 'GET' | 'POST' | 'STREAM';
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
  };
  cache?: {
    enabled: boolean;
    ttlMs: number;
  };
  validation?: {
    required: string[];
    optional?: string[];
  };
}

/**
 * 流配置接口
 */
export interface IStreamMetadata {
  protocol: 'websocket' | 'sse';
  autoReconnect: boolean;
  bufferSize: number;
  heartbeatInterval: number;
  maxConnections?: number;
}

/**
 * 健康检查配置接口
 */
export interface IHealthCheckMetadata {
  enabled: boolean;
  interval: number;
  timeout: number;
  retryCount: number;
  endpoint?: string;
}

/**
 * 元数据键值验证函数
 */
export function validateMetadataKeys(): boolean {
  const requiredKeys = [
    'PROVIDER_METADATA',
    'CAPABILITY_METADATA',
    'STREAM_METADATA',
    'HEALTH_CHECK_METADATA'
  ];
  
  return requiredKeys.every(key => key in METADATA_KEYS);
}