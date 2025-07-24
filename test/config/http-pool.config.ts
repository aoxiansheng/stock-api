/**
 * HTTP连接池配置
 * 优化测试中的HTTP连接管理
 */

export const httpPoolConfig = {
  // 连接池配置
  maxSockets: 10, // 最大并发连接数
  maxFreeSockets: 5, // 最大空闲连接数
  timeout: 30000, // 连接超时时间
  keepAlive: true, // 启用Keep-Alive
  keepAliveMsecs: 1000, // Keep-Alive间隔

  // 请求配置
  requestTimeout: 10000, // 请求超时时间
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,

  // 测试专用配置
  testConcurrency: 3, // 测试并发数
  batchSize: 5, // 批处理大小
  delayBetweenBatches: 100, // 批次间延时
};

/**
 * 为supertest配置连接池
 */
export function configureHttpPool(agent: any) {
  if (agent && agent.agent) {
    agent.agent.maxSockets = httpPoolConfig.maxSockets;
    agent.agent.maxFreeSockets = httpPoolConfig.maxFreeSockets;
    agent.agent.timeout = httpPoolConfig.timeout;
    agent.agent.keepAlive = httpPoolConfig.keepAlive;
    agent.agent.keepAliveMsecs = httpPoolConfig.keepAliveMsecs;
  }

  return agent;
}

/**
 * 测试环境HTTP配置
 */
export const testHttpConfig = {
  // 全局超时设置
  globalTimeout: 120000,

  // 连接管理
  maxConcurrentConnections: 8,
  connectionReuseEnabled: true,

  // 重试配置
  retryAttempts: 2,
  retryDelay: 500,

  // 性能优化
  enableCompression: false,
  enableCache: false,

  // 调试配置
  enableLogging: process.env.NODE_ENV === "development",
  logRequests: false,
  logResponses: false,
};
