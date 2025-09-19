/**
 * Stream Data Fetcher 配置默认值常量
 * 统一管理所有默认值，简化配置系统
 *
 * 基于环境变量分析结果，保留13个核心配置项
 * 移除9个冗余/可合并的配置项
 */

export const STREAM_CONFIG_DEFAULTS = {
  /**
   * 连接配置 - Connection Configuration
   */
  connections: {
    /** 全局最大连接数 */
    maxGlobal: 1000,
    /** 每个API Key的最大连接数 */
    maxPerKey: 100,
    /** 每个IP的最大连接数 */
    maxPerIP: 10,
    /** 每个用户的最大连接数 */
    maxPerUser: 5,
    /** 连接超时时间（毫秒） */
    timeout: 30000,
    /** 心跳间隔（毫秒） */
    heartbeatInterval: 25000,
  },

  /**
   * 数据获取配置 - Data Fetching Configuration
   */
  fetching: {
    /** 获取超时时间（毫秒） */
    timeout: 5000,
    /** 最大重试次数 */
    maxRetries: 3,
    /** 重试延迟（毫秒） */
    retryDelay: 1000,
    /** 批量获取大小 */
    batchSize: 50,
  },

  /**
   * 缓存配置 - Cache Configuration
   */
  cache: {
    /** 默认缓存TTL（秒） */
    defaultTtl: 300,
    /** 实时数据TTL（秒） */
    realtimeTtl: 5,
    /** 历史数据TTL（秒） */
    historicalTtl: 3600,
  },

  /**
   * 限流配置 - Rate Limiting Configuration
   */
  rateLimiting: {
    /** 每分钟消息数限制 */
    messagesPerMinute: 120,
    /** 突发消息限制（10秒内） */
    burstMessages: 20,
    /** 每连接订阅数限制 */
    maxSubscriptionsPerConnection: 50,
  },

  /**
   * WebSocket配置 - WebSocket Configuration
   */
  websocket: {
    /** WebSocket端口 */
    port: 3001,
    /** 路径 */
    path: '/socket.io',
    /** 跨域配置 */
    cors: {
      origin: true,
      credentials: true,
    },
  },

  /**
   * 监控配置 - Monitoring Configuration
   */
  monitoring: {
    /** 启用监控 */
    enabled: true,
    /** 监控间隔（毫秒） */
    interval: 10000,
    /** 性能指标收集 */
    collectMetrics: true,
  },

  /**
   * 安全配置 - Security Configuration
   */
  security: {
    /** 启用IP白名单 */
    enableIpWhitelist: false,
    /** 启用API Key验证 */
    requireApiKey: true,
    /** 启用JWT验证 */
    requireJwtAuth: false,
  },
} as const;

/**
 * 环境变量映射 - Environment Variable Mapping
 * 将环境变量映射到配置默认值
 */
export const STREAM_ENV_MAPPING = {
  // 连接相关 (5个核心环境变量)
  STREAM_MAX_CONNECTIONS: 'connections.maxGlobal',
  STREAM_MAX_CONNECTIONS_PER_KEY: 'connections.maxPerKey',
  WS_MAX_CONNECTIONS_PER_IP: 'connections.maxPerIP',
  WS_MAX_CONNECTIONS_PER_USER: 'connections.maxPerUser',
  STREAM_CONNECTION_TIMEOUT: 'connections.timeout',

  // 数据获取相关 (3个核心环境变量)
  STREAM_FETCH_TIMEOUT: 'fetching.timeout',
  STREAM_MAX_RETRIES: 'fetching.maxRetries',
  STREAM_BATCH_SIZE: 'fetching.batchSize',

  // WebSocket相关 (2个核心环境变量)
  WS_PORT: 'websocket.port',
  WS_PATH: 'websocket.path',

  // 限流相关 (3个核心环境变量)
  WS_MESSAGES_PER_MINUTE: 'rateLimiting.messagesPerMinute',
  WS_BURST_MESSAGES: 'rateLimiting.burstMessages',
  WS_MAX_SUBSCRIPTIONS_PER_CONNECTION: 'rateLimiting.maxSubscriptionsPerConnection',
} as const;

/**
 * 已移除的冗余环境变量 - Removed Redundant Environment Variables
 *
 * 以下9个环境变量已被合并或移除:
 * 1. STREAM_HEARTBEAT_INTERVAL → 使用固定值25000ms
 * 2. STREAM_RETRY_DELAY → 使用固定值1000ms
 * 3. STREAM_CACHE_TTL → 统一使用CACHE_TTL
 * 4. STREAM_REALTIME_TTL → 使用固定值5秒
 * 5. STREAM_HISTORICAL_TTL → 使用固定值3600秒
 * 6. STREAM_MONITORING_ENABLED → 统一使用MONITORING_ENABLED
 * 7. STREAM_MONITORING_INTERVAL → 使用固定值10秒
 * 8. STREAM_ENABLE_IP_WHITELIST → 使用固定值false（安全性由其他层处理）
 * 9. STREAM_REQUIRE_JWT_AUTH → 统一使用AUTH_REQUIRE_JWT
 */

/**
 * 配置访问辅助函数 - Configuration Access Helpers
 */
export class StreamConfigDefaults {
  /**
   * 根据环境变量获取配置值
   * @param envKey 环境变量键名
   * @param defaultValue 默认值
   */
  static getEnvValue<T>(envKey: string, defaultValue: T): T {
    const envValue = process.env[envKey];

    if (!envValue) {
      return defaultValue;
    }

    // 数值类型转换
    if (typeof defaultValue === 'number') {
      const parsed = parseInt(envValue, 10);
      return (isNaN(parsed) ? defaultValue : parsed) as T;
    }

    // 布尔类型转换
    if (typeof defaultValue === 'boolean') {
      return (envValue.toLowerCase() === 'true') as T;
    }

    // 字符串类型直接返回
    return envValue as T;
  }

  /**
   * 获取完整的配置对象
   */
  static getFullConfig() {
    return {
      connections: {
        maxGlobal: this.getEnvValue('STREAM_MAX_CONNECTIONS', STREAM_CONFIG_DEFAULTS.connections.maxGlobal),
        maxPerKey: this.getEnvValue('STREAM_MAX_CONNECTIONS_PER_KEY', STREAM_CONFIG_DEFAULTS.connections.maxPerKey),
        maxPerIP: this.getEnvValue('WS_MAX_CONNECTIONS_PER_IP', STREAM_CONFIG_DEFAULTS.connections.maxPerIP),
        maxPerUser: this.getEnvValue('WS_MAX_CONNECTIONS_PER_USER', STREAM_CONFIG_DEFAULTS.connections.maxPerUser),
        timeout: this.getEnvValue('STREAM_CONNECTION_TIMEOUT', STREAM_CONFIG_DEFAULTS.connections.timeout),
        heartbeatInterval: STREAM_CONFIG_DEFAULTS.connections.heartbeatInterval, // 固定值
      },
      fetching: {
        timeout: this.getEnvValue('STREAM_FETCH_TIMEOUT', STREAM_CONFIG_DEFAULTS.fetching.timeout),
        maxRetries: this.getEnvValue('STREAM_MAX_RETRIES', STREAM_CONFIG_DEFAULTS.fetching.maxRetries),
        retryDelay: STREAM_CONFIG_DEFAULTS.fetching.retryDelay, // 固定值
        batchSize: this.getEnvValue('STREAM_BATCH_SIZE', STREAM_CONFIG_DEFAULTS.fetching.batchSize),
      },
      cache: {
        defaultTtl: STREAM_CONFIG_DEFAULTS.cache.defaultTtl, // 固定值，统一由其他缓存系统管理
        realtimeTtl: STREAM_CONFIG_DEFAULTS.cache.realtimeTtl, // 固定值
        historicalTtl: STREAM_CONFIG_DEFAULTS.cache.historicalTtl, // 固定值
      },
      rateLimiting: {
        messagesPerMinute: this.getEnvValue('WS_MESSAGES_PER_MINUTE', STREAM_CONFIG_DEFAULTS.rateLimiting.messagesPerMinute),
        burstMessages: this.getEnvValue('WS_BURST_MESSAGES', STREAM_CONFIG_DEFAULTS.rateLimiting.burstMessages),
        maxSubscriptionsPerConnection: this.getEnvValue('WS_MAX_SUBSCRIPTIONS_PER_CONNECTION', STREAM_CONFIG_DEFAULTS.rateLimiting.maxSubscriptionsPerConnection),
      },
      websocket: {
        port: this.getEnvValue('WS_PORT', STREAM_CONFIG_DEFAULTS.websocket.port),
        path: this.getEnvValue('WS_PATH', STREAM_CONFIG_DEFAULTS.websocket.path),
        cors: STREAM_CONFIG_DEFAULTS.websocket.cors, // 固定值
      },
      monitoring: {
        enabled: STREAM_CONFIG_DEFAULTS.monitoring.enabled, // 固定值，统一由监控系统管理
        interval: STREAM_CONFIG_DEFAULTS.monitoring.interval, // 固定值
        collectMetrics: STREAM_CONFIG_DEFAULTS.monitoring.collectMetrics, // 固定值
      },
      security: {
        enableIpWhitelist: STREAM_CONFIG_DEFAULTS.security.enableIpWhitelist, // 固定值，由安全模块管理
        requireApiKey: STREAM_CONFIG_DEFAULTS.security.requireApiKey, // 固定值
        requireJwtAuth: STREAM_CONFIG_DEFAULTS.security.requireJwtAuth, // 固定值，统一由认证系统管理
      },
    };
  }
}