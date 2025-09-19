/**
 * Stream Data Fetcher 模块统一限流配置接口
 * 解决 ApiRateLimitConfig 和 WebSocketRateLimitConfig 重复定义问题
 */

/**
 * 基础限流配置接口
 * 所有限流配置的通用字段
 */
export interface BaseRateLimitConfig {
  /** 是否启用限流 */
  enabled: boolean;
  /** 请求/连接数量限制 */
  limit: number;
  /** 时间窗口（毫秒） */
  windowMs: number;
}

/**
 * HTTP API 限流配置接口
 * 扩展自基础配置，适用于 REST API 请求限流
 */
export interface HttpRateLimitConfig extends BaseRateLimitConfig {
  /** 时间窗口（秒） - 向后兼容旧的ttl字段 */
  ttl: number;
  /** 突发请求数量限制 */
  burst?: number;
  /** IP级别限制 */
  perIP?: boolean;
  /** 用户级别限制 */
  perUser?: boolean;
}

/**
 * WebSocket 限流配置接口
 * 扩展自基础配置，适用于 WebSocket 连接限流
 */
export interface WebSocketRateLimitConfig extends BaseRateLimitConfig {
  /** 连接数限制 - 每IP */
  maxConnectionsPerIP: number;
  /** 连接数限制 - 每用户 */
  maxConnectionsPerUser: number;
  /** 消息速率限制 - 每分钟 */
  messagesPerMinute: number;
  /** 订阅限制 - 每连接 */
  maxSubscriptionsPerConnection: number;
  /** 突发消息限制 - 10秒内 */
  burstMessages: number;
}

/**
 * 向后兼容的类型别名
 * 逐步迁移时保持原有代码可用
 */
export type ApiRateLimitConfig = HttpRateLimitConfig;