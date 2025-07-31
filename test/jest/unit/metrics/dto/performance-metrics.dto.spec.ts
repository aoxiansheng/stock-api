import { PerformanceMetricsDto } from '../../../../../src/metrics/dto/performance-metrics.dto';
import { SystemPerformanceMetricsDto } from '@common/types/dto/performance-metrics-base.dto';

describe('PerformanceMetricsDto', () => {
  it('should be an instance of SystemPerformanceMetricsDto', () => {
    const dto = new PerformanceMetricsDto();
    expect(dto).toBeInstanceOf(SystemPerformanceMetricsDto);
  });

  it('should have all required properties', () => {
    const dto = new PerformanceMetricsDto();
    dto.timestamp = '2023-06-01T10:00:00Z';
    dto.healthScore = 95;
    dto.processingTime = 150;
    dto.summary = {
      totalRequests: 1000,
      averageResponseTime: 120,
      errorRate: 0.01,
      systemLoad: 0.75,
      memoryUsage: 1024000000,
      cacheHitRate: 0.85,
    };
    dto.endpoints = [];
    dto.database = {};
    dto.redis = {};
    dto.system = {};

    expect(dto.timestamp).toBeDefined();
    expect(dto.healthScore).toBeDefined();
    expect(dto.processingTime).toBeDefined();
    expect(dto.summary).toBeDefined();
    expect(dto.endpoints).toBeDefined();
    expect(dto.database).toBeDefined();
    expect(dto.redis).toBeDefined();
    expect(dto.system).toBeDefined();
  });

  it('should be the same as SystemPerformanceMetricsDto', () => {
    // Since PerformanceMetricsDto is a re-export of SystemPerformanceMetricsDto,
    // they should be the exact same class
    expect(PerformanceMetricsDto).toBe(SystemPerformanceMetricsDto);
  });

  it('should create valid instances with proper typing', () => {
    const dto = new PerformanceMetricsDto();

    // Test that we can assign all required properties
    dto.timestamp = '2023-06-01T10:00:00Z';
    dto.healthScore = 95;
    dto.processingTime = 150;
    dto.summary = {
      totalRequests: 1000,
      averageResponseTime: 120,
      errorRate: 0.01,
      systemLoad: 0.75,
      memoryUsage: 1024000000,
      cacheHitRate: 0.85,
    };
    dto.endpoints = [];
    dto.database = {};
    dto.redis = {};
    dto.system = {};

    // Verify the instance is properly typed
    expect(typeof dto.timestamp).toBe('string');
    expect(typeof dto.healthScore).toBe('number');
    expect(typeof dto.processingTime).toBe('number');
    expect(typeof dto.summary).toBe('object');
    expect(Array.isArray(dto.endpoints)).toBe(true);
    expect(typeof dto.database).toBe('object');
    expect(typeof dto.redis).toBe('object');
    expect(typeof dto.system).toBe('object');
  });

  it('should support summary object structure', () => {
    const dto = new PerformanceMetricsDto();
    const summaryData = {
      totalRequests: 1500,
      averageResponseTime: 200,
      errorRate: 0.02,
      systemLoad: 0.8,
      memoryUsage: 2048000000,
      cacheHitRate: 0.9,
    };

    dto.summary = summaryData;

    expect(dto.summary.totalRequests).toBe(1500);
    expect(dto.summary.averageResponseTime).toBe(200);
    expect(dto.summary.errorRate).toBe(0.02);
    expect(dto.summary.systemLoad).toBe(0.8);
    expect(dto.summary.memoryUsage).toBe(2048000000);
    expect(dto.summary.cacheHitRate).toBe(0.9);
  });
});