/* eslint-disable @typescript-eslint/no-unused-vars */
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  PerformanceSummaryDataDto,
  EndpointMetricsDto,
  DatabaseMetricsDto,
  RedisMetricsDto,
  SystemMetricsDto,
  PerformanceSummaryDto,
} from '../../../../../src/metrics/dto/performance-summary.dto';

// 测试 PerformanceSummaryDataDto
describe('PerformanceSummaryDataDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(PerformanceSummaryDataDto, {
      totalRequests: 1000,
      averageResponseTime: 150.5,
      errorRate: 0.01,
      systemLoad: 0.8,
      memoryUsage: 2.5,
      cacheHitRate: 0.95,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当数据类型不正确时应无法通过验证', async () => {
    const dto = plainToClass(PerformanceSummaryDataDto, {
      totalRequests: 'invalid-number' as any, // 无效类型
      averageResponseTime: 'invalid-number' as any, // 无效类型
      errorRate: 'invalid-number' as any, // 无效类型
      systemLoad: 'invalid-number' as any, // 无效类型
      memoryUsage: 'invalid-number' as any, // 无效类型
      cacheHitRate: 'invalid-number' as any, // 无效类型
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// 测试 EndpointMetricsDto
describe('EndpointMetricsDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(EndpointMetricsDto, {
      endpoint: '/api/v1/data',
      method: 'GET',
      totalRequests: 500,
      successfulRequests: 495,
      failedRequests: 5,
      averageResponseTime: 120,
      p95ResponseTime: 250,
      p99ResponseTime: 350,
      lastMinuteRequests: 60,
      errorRate: 0.01,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当字符串类型字段缺失时应无法通过验证', async () => {
    const dto = plainToClass(EndpointMetricsDto, {
      method: 'GET',
      totalRequests: 500,
      successfulRequests: 495,
      failedRequests: 5,
      averageResponseTime: 120,
      p95ResponseTime: 250,
      p99ResponseTime: 350,
      lastMinuteRequests: 60,
      errorRate: 0.01,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]._property).toBe('endpoint');
  });
});

// 测试 DatabaseMetricsDto
describe('DatabaseMetricsDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(DatabaseMetricsDto, {
      connectionPoolSize: 50,
      activeConnections: 25,
      waitingConnections: 5,
      averageQueryTime: 15,
      slowQueries: 2,
      totalQueries: 10000,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当数字类型字段为非数字时应无法通过验证', async () => {
    const dto = plainToClass(DatabaseMetricsDto, {
      connectionPoolSize: 'invalid-number' as any,
      activeConnections: 25,
      waitingConnections: 5,
      averageQueryTime: 15,
      slowQueries: 2,
      totalQueries: 10000,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(error => error._property === 'connectionPoolSize')).toBe(true);
  });
});

// 测试 RedisMetricsDto
describe('RedisMetricsDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(RedisMetricsDto, {
      memoryUsage: 1048576,
      connectedClients: 10,
      opsPerSecond: 500,
      hitRate: 0.98,
      evictedKeys: 100,
      expiredKeys: 200,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

// 测试 SystemMetricsDto
describe('SystemMetricsDto', () => {
  it('当数据有效时应通过验证', async () => {
    const dto = plainToClass(SystemMetricsDto, {
      cpuUsage: 0.75,
      memoryUsage: 536870912,
      heapUsed: 268435456,
      heapTotal: 536870912,
      uptime: 86400,
      eventLoopLag: 5.5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

// 测试 PerformanceSummaryDto (包含嵌套验证)
describe('PerformanceSummaryDto', () => {
  const createValidDto = () => ({
    timestamp: new Date().toISOString(),
    healthScore: 95.5,
    processingTime: 5,
    summary: {
      totalRequests: 1000,
      averageResponseTime: 150.5,
      errorRate: 0.01,
      systemLoad: 0.8,
      memoryUsage: 2.5,
      cacheHitRate: 0.95,
    },
    endpoints: [
      {
        endpoint: '/api/v1/data',
        method: 'GET',
        totalRequests: 500,
        successfulRequests: 495,
        failedRequests: 5,
        averageResponseTime: 120,
        p95ResponseTime: 250,
        p99ResponseTime: 350,
        lastMinuteRequests: 60,
        errorRate: 0.01,
      },
    ],
    database: {
      connectionPoolSize: 50,
      activeConnections: 25,
      waitingConnections: 5,
      averageQueryTime: 15,
      slowQueries: 2,
      totalQueries: 10000,
    },
    redis: {
      memoryUsage: 1048576,
      connectedClients: 10,
      opsPerSecond: 500,
      hitRate: 0.98,
      evictedKeys: 100,
      expiredKeys: 200,
    },
    system: {
      cpuUsage: 0.75,
      memoryUsage: 536870912,
      heapUsed: 268435456,
      heapTotal: 536870912,
      uptime: 86400,
      eventLoopLag: 5.5,
    },
  });

  it('当所有数据（包括嵌套对象）有效时应通过验证', async () => {
    const validData = createValidDto();
    const dto = plainToClass(PerformanceSummaryDto, validData);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('当嵌套的 summary 对象无效时应无法通过验证', async () => {
    const invalidData = createValidDto();
    (invalidData.summary as any).totalRequests = 'invalid-number';
    const dto = plainToClass(PerformanceSummaryDto, invalidData);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    // Check that there's a validation error related to summary
    const summaryError = errors.find(error => error.property === 'summary');
    expect(summaryError).toBeDefined();
    if (summaryError?.children) {
      expect(summaryError.children.some(child => child.property === 'totalRequests')).toBe(true);
    }
  });

  it('当嵌套的 endpoints 数组中包含无效对象时应无法通过验证', async () => {
    const invalidData = createValidDto();
    (invalidData.endpoints[0] as any).totalRequests = 'invalid-number';
    const dto = plainToClass(PerformanceSummaryDto, invalidData);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    // Check that there's a validation error related to endpoints
    const endpointsError = errors.find(error => error.property === 'endpoints');
    expect(endpointsError).toBeDefined();
    if (endpointsError?.children && endpointsError.children[0]?.children) {
      expect(endpointsError.children[0].children.some(child => child.property === 'totalRequests')).toBe(true);
    }
  });
});