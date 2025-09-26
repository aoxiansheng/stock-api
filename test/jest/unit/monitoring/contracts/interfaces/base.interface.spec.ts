/**
 * Base Interface Unit Tests
 * 测试基础接口定义的完整性和类型安全
 */

import {
  type BaseHealthMetrics,
  type BaseTimestamp,
  type BaseTrendMetric,
  type BasePerformanceSummary,
  type BaseEndpointIdentifier,
  type BaseCacheMetrics,
  type TimestampedHealthMetrics,
  type TimestampedPerformanceSummary,
  type ComponentHealthStatus,
} from '@monitoring/contracts/interfaces/base.interface';

describe('BaseInterface', () => {
  describe('Individual Interface Definitions', () => {
    it('should define BaseHealthMetrics interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseHealth: BaseHealthMetrics = {
        healthScore: 90,
        responseTimeMs: 50,
        errorRate: 0.1,
      };
      
      expect(baseHealth).toBeDefined();
      expect(typeof baseHealth.healthScore).toBe('number');
      expect(typeof baseHealth.responseTimeMs).toBe('number');
      expect(typeof baseHealth.errorRate).toBe('number');
    });

    it('should define BaseTimestamp interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseTimestamp: BaseTimestamp = {
        timestamp: new Date(),
      };
      
      expect(baseTimestamp).toBeDefined();
      expect(baseTimestamp.timestamp).toBeInstanceOf(Date);
    });

    it('should define BaseTrendMetric interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseTrend: BaseTrendMetric<number> = {
        current: 100,
        previous: 90,
        trend: 'up',
        changePercentage: 10,
      };
      
      const stringTrend: BaseTrendMetric<string> = {
        current: 'high',
        previous: 'medium',
        trend: 'up',
        changePercentage: 0,
      };
      
      expect(baseTrend).toBeDefined();
      expect(stringTrend).toBeDefined();
    });

    it('should define BasePerformanceSummary interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseSummary: BasePerformanceSummary = {
        totalOperations: 100,
        successfulOperations: 90,
        failedOperations: 10,
      };
      
      expect(baseSummary).toBeDefined();
      expect(typeof baseSummary.totalOperations).toBe('number');
      expect(typeof baseSummary.successfulOperations).toBe('number');
      expect(typeof baseSummary.failedOperations).toBe('number');
    });

    it('should define BaseEndpointIdentifier interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseEndpoint: BaseEndpointIdentifier = {
        endpoint: '/api/test',
        method: 'GET',
      };
      
      expect(baseEndpoint).toBeDefined();
      expect(typeof baseEndpoint.endpoint).toBe('string');
      expect(typeof baseEndpoint.method).toBe('string');
    });

    it('should define BaseCacheMetrics interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const baseCache: BaseCacheMetrics = {
        hits: 90,
        misses: 10,
        hitRate: 0.9,
      };
      
      expect(baseCache).toBeDefined();
      expect(typeof baseCache.hits).toBe('number');
      expect(typeof baseCache.misses).toBe('number');
      expect(typeof baseCache.hitRate).toBe('number');
    });
  });

  describe('Combined Interface Definitions', () => {
    it('should define TimestampedHealthMetrics interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const timestampedHealth: TimestampedHealthMetrics = {
        healthScore: 90,
        responseTimeMs: 50,
        errorRate: 0.1,
        timestamp: new Date(),
      };
      
      expect(timestampedHealth).toBeDefined();
    });

    it('should define TimestampedPerformanceSummary interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const timestampedSummary: TimestampedPerformanceSummary = {
        totalOperations: 100,
        successfulOperations: 90,
        failedOperations: 10,
        timestamp: new Date(),
      };
      
      expect(timestampedSummary).toBeDefined();
    });

    it('should define ComponentHealthStatus interface correctly', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const componentHealth: ComponentHealthStatus = {
        healthScore: 90,
        responseTimeMs: 50,
        errorRate: 0.1,
        timestamp: new Date(),
        componentName: 'test-component',
        componentType: 'api',
      };
      
      expect(componentHealth).toBeDefined();
    });
  });
});