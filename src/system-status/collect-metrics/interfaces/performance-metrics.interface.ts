export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  lastMinuteRequests: number;
  errorRate: number;
}

export interface DatabaseMetrics {
  connectionPoolSize: number;
  activeConnections: number;
  waitingConnections: number;
  averageQueryTime: number;
  slowQueries: number;
  totalQueries: number;
}

export interface RedisMetrics {
  memoryUsage: number;
  connectedClients: number;
  opsPerSecond: number;
  hitRate: number;
  evictedKeys: number;
  expiredKeys: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  uptime: number;
  eventLoopLag: number;
}
