/**
 * API响应验证工具
 * 提供标准化的API响应结构验证和断言
 */

import { expect } from '@jest/globals';

/**
 * 标准API响应结构
 */
export interface StandardApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 验证标准API响应结构
 */
export function validateStandardResponse<T = any>(
  response: any,
  expectedStatusCode: number = 200,
): StandardApiResponse<T> {
  // 基本结构验证
  expect(response).toHaveProperty('statusCode');
  expect(response).toHaveProperty('message');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('timestamp');

  // 状态码验证
  expect(response.statusCode).toBe(expectedStatusCode);

  // 类型验证
  expect(typeof response.statusCode).toBe('number');
  expect(typeof response.message).toBe('string');
  expect(typeof response.timestamp).toBe('string');

  // 时间戳格式验证（ISO格式）
  expect(() => new Date(response.timestamp)).not.toThrow();
  expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);

  return response as StandardApiResponse<T>;
}

/**
 * 验证端点指标响应结构
 */
export interface EndpointMetricsResponse {
  metrics: Array<{
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
  }>;
  total: number;
  timestamp: string;
}

export function validateEndpointMetricsResponse(
  response: any,
): StandardApiResponse<EndpointMetricsResponse> {
  const validatedResponse = validateStandardResponse<EndpointMetricsResponse>(response);

  // 验证data结构
  expect(validatedResponse.data).toHaveProperty('metrics');
  expect(validatedResponse.data).toHaveProperty('total');
  expect(validatedResponse.data).toHaveProperty('timestamp');

  // 验证metrics是数组
  expect(Array.isArray(validatedResponse.data.metrics)).toBe(true);

  // 验证total是数字
  expect(typeof validatedResponse.data.total).toBe('number');

  // 验证每个metric的结构
  validatedResponse.data.metrics.forEach((metric, index) => {
    expect(metric).toHaveProperty('endpoint', `metrics[${index}] missing endpoint`);
    expect(metric).toHaveProperty('method', `metrics[${index}] missing method`);
    expect(metric).toHaveProperty('totalRequests', `metrics[${index}] missing totalRequests`);
    expect(metric).toHaveProperty('successfulRequests', `metrics[${index}] missing successfulRequests`);
    expect(metric).toHaveProperty('failedRequests', `metrics[${index}] missing failedRequests`);
    expect(metric).toHaveProperty('averageResponseTime', `metrics[${index}] missing averageResponseTime`);
    expect(metric).toHaveProperty('errorRate', `metrics[${index}] missing errorRate`);

    // 类型验证
    expect(typeof metric.endpoint).toBe('string');
    expect(typeof metric.method).toBe('string');
    expect(typeof metric.totalRequests).toBe('number');
    expect(typeof metric.successfulRequests).toBe('number');
    expect(typeof metric.failedRequests).toBe('number');
    expect(typeof metric.averageResponseTime).toBe('number');
    expect(typeof metric.errorRate).toBe('number');

    // 数值合理性验证
    expect(metric.totalRequests).toBeGreaterThanOrEqual(0);
    expect(metric.successfulRequests).toBeGreaterThanOrEqual(0);
    expect(metric.failedRequests).toBeGreaterThanOrEqual(0);
    expect(metric.averageResponseTime).toBeGreaterThanOrEqual(0);
    expect(metric.errorRate).toBeGreaterThanOrEqual(0);
    expect(metric.errorRate).toBeLessThanOrEqual(1);
  });

  return validatedResponse;
}

/**
 * 验证性能指标响应结构
 */
export interface PerformanceMetricsResponse {
  timestamp: string;
  healthScore: number;
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    systemLoad: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
  endpoints: any[];
  database: any;
  redis: any;
  system: any;
}

export function validatePerformanceMetricsResponse(
  response: any,
): StandardApiResponse<PerformanceMetricsResponse> {
  const validatedResponse = validateStandardResponse<PerformanceMetricsResponse>(response);

  // 验证data结构
  expect(validatedResponse.data).toHaveProperty('timestamp');
  expect(validatedResponse.data).toHaveProperty('healthScore');
  expect(validatedResponse.data).toHaveProperty('summary');
  expect(validatedResponse.data).toHaveProperty('endpoints');
  expect(validatedResponse.data).toHaveProperty('database');
  expect(validatedResponse.data).toHaveProperty('redis');
  expect(validatedResponse.data).toHaveProperty('system');

  // 验证healthScore
  expect(typeof validatedResponse.data.healthScore).toBe('number');
  expect(validatedResponse.data.healthScore).toBeGreaterThanOrEqual(0);
  expect(validatedResponse.data.healthScore).toBeLessThanOrEqual(100);

  // 验证summary结构
  const summary = validatedResponse.data.summary;
  expect(summary).toHaveProperty('totalRequests');
  expect(summary).toHaveProperty('averageResponseTime');
  expect(summary).toHaveProperty('errorRate');
  expect(summary).toHaveProperty('systemLoad');
  expect(summary).toHaveProperty('memoryUsage');
  expect(summary).toHaveProperty('cacheHitRate');

  // 验证endpoints是数组
  expect(Array.isArray(validatedResponse.data.endpoints)).toBe(true);

  return validatedResponse;
}

/**
 * 验证数据库指标响应结构
 */
export interface DatabaseMetricsResponse {
  connectionPoolSize: number;
  activeConnections: number;
  waitingConnections: number;
  averageQueryTime: number;
  slowQueries: number;
  totalQueries: number;
  timestamp: string;
}

export function validateDatabaseMetricsResponse(
  response: any,
): StandardApiResponse<DatabaseMetricsResponse> {
  const validatedResponse = validateStandardResponse<DatabaseMetricsResponse>(response);

  // 验证data结构
  const data = validatedResponse.data;
  expect(data).toHaveProperty('connectionPoolSize');
  expect(data).toHaveProperty('activeConnections');
  expect(data).toHaveProperty('waitingConnections');
  expect(data).toHaveProperty('averageQueryTime');
  expect(data).toHaveProperty('slowQueries');
  expect(data).toHaveProperty('totalQueries');
  expect(data).toHaveProperty('timestamp');

  // 类型验证
  expect(typeof data.connectionPoolSize).toBe('number');
  expect(typeof data.activeConnections).toBe('number');
  expect(typeof data.waitingConnections).toBe('number');
  expect(typeof data.averageQueryTime).toBe('number');
  expect(typeof data.slowQueries).toBe('number');
  expect(typeof data.totalQueries).toBe('number');
  expect(typeof data.timestamp).toBe('string');

  // 数值合理性验证
  expect(data.connectionPoolSize).toBeGreaterThanOrEqual(0);
  expect(data.activeConnections).toBeGreaterThanOrEqual(0);
  expect(data.waitingConnections).toBeGreaterThanOrEqual(0);
  expect(data.averageQueryTime).toBeGreaterThanOrEqual(0);
  expect(data.slowQueries).toBeGreaterThanOrEqual(0);
  expect(data.totalQueries).toBeGreaterThanOrEqual(0);

  return validatedResponse;
}

/**
 * 验证Redis指标响应结构
 */
export interface RedisMetricsResponse {
  memoryUsage: number;
  connectedClients: number;
  opsPerSecond: number;
  hitRate: number;
  evictedKeys: number;
  expiredKeys: number;
  timestamp: string;
}

export function validateRedisMetricsResponse(
  response: any,
): StandardApiResponse<RedisMetricsResponse> {
  const validatedResponse = validateStandardResponse<RedisMetricsResponse>(response);

  // 验证data结构
  const data = validatedResponse.data;
  expect(data).toHaveProperty('memoryUsage');
  expect(data).toHaveProperty('connectedClients');
  expect(data).toHaveProperty('opsPerSecond');
  expect(data).toHaveProperty('hitRate');
  expect(data).toHaveProperty('evictedKeys');
  expect(data).toHaveProperty('expiredKeys');
  expect(data).toHaveProperty('timestamp');

  // 类型验证
  expect(typeof data.memoryUsage).toBe('number');
  expect(typeof data.connectedClients).toBe('number');
  expect(typeof data.opsPerSecond).toBe('number');
  expect(typeof data.hitRate).toBe('number');
  expect(typeof data.evictedKeys).toBe('number');
  expect(typeof data.expiredKeys).toBe('number');
  expect(typeof data.timestamp).toBe('string');

  // 数值合理性验证
  expect(data.memoryUsage).toBeGreaterThanOrEqual(0);
  expect(data.connectedClients).toBeGreaterThanOrEqual(0);
  expect(data.opsPerSecond).toBeGreaterThanOrEqual(0);
  expect(data.hitRate).toBeGreaterThanOrEqual(0);
  expect(data.hitRate).toBeLessThanOrEqual(1);
  expect(data.evictedKeys).toBeGreaterThanOrEqual(0);
  expect(data.expiredKeys).toBeGreaterThanOrEqual(0);

  return validatedResponse;
}

/**
 * 验证系统指标响应结构
 */
export interface SystemMetricsResponse {
  cpuUsage: number;
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  uptime: number;
  eventLoopLag: number;
  timestamp: string;
  memoryUsageGB: number;
  heapUsedGB: number;
  heapTotalGB: number;
  uptimeHours: number;
}

export function validateSystemMetricsResponse(
  response: any,
): StandardApiResponse<SystemMetricsResponse> {
  const validatedResponse = validateStandardResponse<SystemMetricsResponse>(response);

  // 验证data结构
  const data = validatedResponse.data;
  expect(data).toHaveProperty('cpuUsage');
  expect(data).toHaveProperty('memoryUsage');
  expect(data).toHaveProperty('heapUsed');
  expect(data).toHaveProperty('heapTotal');
  expect(data).toHaveProperty('uptime');
  expect(data).toHaveProperty('eventLoopLag');
  expect(data).toHaveProperty('timestamp');

  // 验证额外的GB和小时字段
  expect(data).toHaveProperty('memoryUsageGB');
  expect(data).toHaveProperty('heapUsedGB');
  expect(data).toHaveProperty('heapTotalGB');
  expect(data).toHaveProperty('uptimeHours');

  // 类型验证
  expect(typeof data.cpuUsage).toBe('number');
  expect(typeof data.memoryUsage).toBe('number');
  expect(typeof data.heapUsed).toBe('number');
  expect(typeof data.heapTotal).toBe('number');
  expect(typeof data.uptime).toBe('number');
  expect(typeof data.eventLoopLag).toBe('number');

  return validatedResponse;
}

/**
 * 验证健康状态响应结构
 */
export interface HealthStatusResponse {
  status: string;
  score: number;
  timestamp: string;
  issues: string[];
  recommendations: string[];
  uptime: number;
  version: string;
}

export function validateHealthStatusResponse(
  response: any,
): StandardApiResponse<HealthStatusResponse> {
  const validatedResponse = validateStandardResponse<HealthStatusResponse>(response);

  // 验证data结构
  const data = validatedResponse.data;
  expect(data).toHaveProperty('status');
  expect(data).toHaveProperty('score');
  expect(data).toHaveProperty('timestamp');
  expect(data).toHaveProperty('issues');
  expect(data).toHaveProperty('recommendations');
  expect(data).toHaveProperty('uptime');
  expect(data).toHaveProperty('version');

  // 类型验证
  expect(typeof data.status).toBe('string');
  expect(typeof data.score).toBe('number');
  expect(typeof data.timestamp).toBe('string');
  expect(Array.isArray(data.issues)).toBe(true);
  expect(Array.isArray(data.recommendations)).toBe(true);
  expect(typeof data.uptime).toBe('number');
  expect(typeof data.version).toBe('string');

  // 状态值验证
  expect(['healthy', 'warning', 'degraded', 'unhealthy']).toContain(data.status);
  expect(data.score).toBeGreaterThanOrEqual(0);
  expect(data.score).toBeLessThanOrEqual(100);

  return validatedResponse;
}

/**
 * 验证API Key创建响应
 */
export interface ApiKeyCreationResponse {
  id: string;
  name: string;
  appKey: string;
  accessToken: string;
  permissions: string[];
  createdAt: string;
  isActive: boolean;
}

export function validateApiKeyCreationResponse(
  response: any,
): StandardApiResponse<ApiKeyCreationResponse> {
  const validatedResponse = validateStandardResponse<ApiKeyCreationResponse>(response, 201);

  // 验证data结构
  const data = validatedResponse.data;
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('name');
  expect(data).toHaveProperty('appKey');
  expect(data).toHaveProperty('accessToken');
  expect(data).toHaveProperty('permissions');
  expect(data).toHaveProperty('isActive');

  // 类型验证
  expect(typeof data.id).toBe('string');
  expect(typeof data.name).toBe('string');
  expect(typeof data.appKey).toBe('string');
  expect(typeof data.accessToken).toBe('string');
  expect(Array.isArray(data.permissions)).toBe(true);
  expect(typeof data.isActive).toBe('boolean');

  // 值验证
  expect(data.id).toBeTruthy();
  expect(data.name).toBeTruthy();
  expect(data.appKey).toBeTruthy();
  expect(data.accessToken).toBeTruthy();
  expect(data.isActive).toBe(true);

  return validatedResponse;
}

/**
 * API响应测试助手类
 */
export class ApiResponseTestHelper {
  /**
   * 验证HTTP响应状态和基本结构
   */
  static validateHttpResponse(response: any, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * 验证错误响应结构
   */
  static validateErrorResponse(
    response: any,
    expectedStatus: number,
    expectedMessage?: string,
  ): void {
    this.validateHttpResponse(response, expectedStatus);
    
    const validatedResponse = validateStandardResponse(response.body, expectedStatus);
    
    if (expectedMessage) {
      expect(validatedResponse.message).toContain(expectedMessage);
    }
  }

  /**
   * 验证成功响应并返回数据
   */
  static validateSuccessResponse<T>(
    response: any,
    validator?: (data: T) => void,
  ): T {
    this.validateHttpResponse(response, 200);
    
    const validatedResponse = validateStandardResponse<T>(response.body);
    
    if (validator) {
      validator(validatedResponse.data);
    }
    
    return validatedResponse.data;
  }

  /**
   * 验证创建响应并返回数据
   */
  static validateCreationResponse<T>(
    response: any,
    validator?: (data: T) => void,
  ): T {
    this.validateHttpResponse(response, 201);
    
    const validatedResponse = validateStandardResponse<T>(response.body, 201);
    
    if (validator) {
      validator(validatedResponse.data);
    }
    
    return validatedResponse.data;
  }
}

/**
 * 常用的响应验证器映射
 */
export const ResponseValidators = {
  standard: validateStandardResponse,
  endpointMetrics: validateEndpointMetricsResponse,
  performanceMetrics: validatePerformanceMetricsResponse,
  databaseMetrics: validateDatabaseMetricsResponse,
  redisMetrics: validateRedisMetricsResponse,
  systemMetrics: validateSystemMetricsResponse,
  healthStatus: validateHealthStatusResponse,
  apiKeyCreation: validateApiKeyCreationResponse,
} as const;