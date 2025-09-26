/**
 * Injection Tokens Unit Tests
 * 测试监控系统依赖注入令牌的定义和类型安全
 */

import {
  MONITORING_COLLECTOR_TOKEN,
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN,
  COMMON_CACHE_CONFIG_TOKEN,
} from '@monitoring/contracts/tokens/injection.tokens';

describe('InjectionTokens', () => {
  describe('Token Definitions', () => {
    it('should define monitoring collector token', () => {
      expect(MONITORING_COLLECTOR_TOKEN).toBeDefined();
      expect(typeof MONITORING_COLLECTOR_TOKEN).toBe('symbol');
    });

    it('should define cache redis client token', () => {
      expect(CACHE_REDIS_CLIENT_TOKEN).toBeDefined();
      expect(typeof CACHE_REDIS_CLIENT_TOKEN).toBe('symbol');
    });

    it('should define stream cache config token', () => {
      expect(STREAM_CACHE_CONFIG_TOKEN).toBeDefined();
      expect(typeof STREAM_CACHE_CONFIG_TOKEN).toBe('symbol');
    });

    it('should define common cache config token', () => {
      expect(COMMON_CACHE_CONFIG_TOKEN).toBeDefined();
      expect(typeof COMMON_CACHE_CONFIG_TOKEN).toBe('symbol');
    });
  });

  describe('Token Uniqueness', () => {
    it('should have unique token symbols', () => {
      const tokens = [
        MONITORING_COLLECTOR_TOKEN,
        CACHE_REDIS_CLIENT_TOKEN,
        STREAM_CACHE_CONFIG_TOKEN,
        COMMON_CACHE_CONFIG_TOKEN,
      ];
      
      // Convert symbols to strings for comparison
      const tokenStrings = tokens.map(token => token.toString());
      const uniqueTokenStrings = [...new Set(tokenStrings)];
      
      expect(tokenStrings).toHaveLength(uniqueTokenStrings.length);
    });
  });

  describe('Token Usage', () => {
    it('should be usable as injection tokens', () => {
      // This is a compile-time test - if it compiles, the tokens are correctly defined
      const collectorToken = MONITORING_COLLECTOR_TOKEN;
      const redisToken = CACHE_REDIS_CLIENT_TOKEN;
      const streamConfigToken = STREAM_CACHE_CONFIG_TOKEN;
      const commonConfigToken = COMMON_CACHE_CONFIG_TOKEN;
      
      expect(collectorToken).toBeDefined();
      expect(redisToken).toBeDefined();
      expect(streamConfigToken).toBeDefined();
      expect(commonConfigToken).toBeDefined();
    });
  });
});