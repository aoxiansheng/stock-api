/**
 * 提供商配置类型定义
 * 替换 Record<string, any> 提高类型安全性
 */

/**
 * 基础提供商配置
 */
export interface ProviderConfig {
  /** 端点URL */
  endpoint?: string;
  /** 超时配置 */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 能力特定配置
 */
export interface CapabilityConfig {
  /** 速率限制配置 */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** 缓存配置 */
  cache?: {
    enabled: boolean;
    ttlMs: number;
  };
  /** 重试配置 */
  retry?: {
    attempts: number;
    delayMs: number;
  };
  /** 验证配置 */
  validation?: {
    required: string[];
    optional?: string[];
  };
}

/**
 * LongPort 提供商配置
 */
export interface LongportProviderConfig extends ProviderConfig {
  /** LongPort 应用密钥 */
  appKey: string;
  /** LongPort 应用秘钥 */
  appSecret: string;
  /** 访问令牌 */
  accessToken: string;
}

/**
 * 提供商凭据接口
 */
export interface ProviderCredentials {
  /** API密钥 */
  apiKey?: string;
  /** API秘钥 */
  apiSecret?: string;
  /** 访问令牌 */
  accessToken?: string;
}

/**
 * WebSocket 流配置
 */
export interface StreamConfig extends CapabilityConfig {
  /** 连接URL */
  connectionUrl?: string;
  /** 最大连接数 */
  maxConnections?: number;
  /** 最大重连次数 */
  maxRetries?: number;
  /** 重连间隔(毫秒) */
  retryInterval?: number;
  /** 重连退避系数 */
  retryBackoff?: number;
}
