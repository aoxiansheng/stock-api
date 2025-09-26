import { RateLimitResult, AuthRateLimitConfig, ApiKeyUsageStats, DetailedUsageStats } from '@auth/interfaces/rate-limit.interface';
import { RateLimitStrategy } from '@auth/constants';

describe('Rate Limit Interfaces', () => {
  describe('RateLimitResult', () => {
    it('应该正确定义频率限制结果接口', () => {
      // Arrange
      const result: RateLimitResult = {
        allowed: true,
        limit: 100,
        current: 50,
        remaining: 50,
        resetTime: Date.now() + 3600000,
        retryAfter: 60,
      };

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.current).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetTime).toBe('number');
      expect(typeof result.retryAfter).toBe('number');
    });
  });

  describe('AuthRateLimitConfig', () => {
    it('应该正确定义频率限制配置接口', () => {
      // Arrange
      const config: AuthRateLimitConfig = {
        strategy: RateLimitStrategy.FIXED_WINDOW,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: (req: any) => 'test-key',
      };

      // Assert
      expect(config).toBeDefined();
      expect(config.strategy).toBe(RateLimitStrategy.FIXED_WINDOW);
      expect(config.skipSuccessfulRequests).toBe(true);
      expect(config.skipFailedRequests).toBe(false);
      expect(typeof config.keyGenerator).toBe('function');
    });
  });

  describe('ApiKeyUsageStats', () => {
    it('应该正确定义API Key使用统计接口', () => {
      // Arrange
      const stats: ApiKeyUsageStats = {
        currentPeriodRequestCount: 50,
        limit: 100,
        remaining: 50,
        resetTime: Date.now() + 3600000,
      };

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats.currentPeriodRequestCount).toBe('number');
      expect(typeof stats.limit).toBe('number');
      expect(typeof stats.remaining).toBe('number');
      expect(typeof stats.resetTime).toBe('number');
    });
  });

  describe('DetailedUsageStats', () => {
    it('应该正确定义详细使用统计接口', () => {
      // Arrange
      const stats: DetailedUsageStats = {
        totalRequestCount: 1000,
        currentPeriodRequestCount: 50,
        lastRequestTime: new Date(),
        averageRequestsPerHour: 100,
      };

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequestCount).toBe('number');
      expect(typeof stats.currentPeriodRequestCount).toBe('number');
      expect(stats.lastRequestTime instanceof Date).toBe(true);
      expect(typeof stats.averageRequestsPerHour).toBe('number');
    });
  });
});