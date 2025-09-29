/**
 * SmartCacheConfig Interface 单元测试
 * 测试智能缓存配置接口和策略枚举
 */

import { CacheStrategy } from '@core/05-caching/module/smart-cache/interfaces/smart-cache-config.interface';

describe('SmartCacheConfig Interface', () => {
  describe('CacheStrategy Enum', () => {
    it('should define all five cache strategies', () => {
      expect(CacheStrategy.STRONG_TIMELINESS).toBe('strong_timeliness');
      expect(CacheStrategy.WEAK_TIMELINESS).toBe('weak_timeliness');
      expect(CacheStrategy.MARKET_AWARE).toBe('market_aware');
      expect(CacheStrategy.NO_CACHE).toBe('no_cache');
      expect(CacheStrategy.ADAPTIVE).toBe('adaptive');
    });

    it('should have exactly 5 strategies defined', () => {
      const strategies = Object.keys(CacheStrategy);
      expect(strategies).toHaveLength(5);
    });

    it('should use consistent naming convention', () => {
      const strategies = Object.values(CacheStrategy);
      strategies.forEach(strategy => {
        expect(strategy).toMatch(/^[a-z_]+$/); // Only lowercase letters and underscores
        expect(strategy).not.toContain(' '); // No spaces
        expect(strategy).not.toContain('-'); // No hyphens
      });
    });

    it('should have unique values for each strategy', () => {
      const values = Object.values(CacheStrategy);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should provide strategies for different use cases', () => {
      // Strong timeliness for real-time scenarios like Receiver
      expect(CacheStrategy.STRONG_TIMELINESS).toBeDefined();

      // Weak timeliness for batch scenarios like Query
      expect(CacheStrategy.WEAK_TIMELINESS).toBeDefined();

      // Market aware for dynamic TTL based on market status
      expect(CacheStrategy.MARKET_AWARE).toBeDefined();

      // No cache for scenarios requiring fresh data
      expect(CacheStrategy.NO_CACHE).toBeDefined();

      // Adaptive for dynamic adjustment based on data patterns
      expect(CacheStrategy.ADAPTIVE).toBeDefined();
    });

    it('should be compatible with string type checking', () => {
      const strategy: string = CacheStrategy.STRONG_TIMELINESS;
      expect(typeof strategy).toBe('string');

      // Test that enum values can be used in string operations
      expect(strategy.includes('timeliness')).toBe(true);
      expect(strategy.toUpperCase()).toBe('STRONG_TIMELINESS');
    });

    it('should support iteration over all strategies', () => {
      const strategyNames = Object.keys(CacheStrategy);
      const strategyValues = Object.values(CacheStrategy);

      expect(strategyNames).toContain('STRONG_TIMELINESS');
      expect(strategyNames).toContain('WEAK_TIMELINESS');
      expect(strategyNames).toContain('MARKET_AWARE');
      expect(strategyNames).toContain('NO_CACHE');
      expect(strategyNames).toContain('ADAPTIVE');

      expect(strategyValues).toContain('strong_timeliness');
      expect(strategyValues).toContain('weak_timeliness');
      expect(strategyValues).toContain('market_aware');
      expect(strategyValues).toContain('no_cache');
      expect(strategyValues).toContain('adaptive');
    });

    it('should support reverse lookup from value to key', () => {
      // Test that we can find the enum key from the value
      const findKeyByValue = (value: string) => {
        return Object.keys(CacheStrategy).find(
          key => CacheStrategy[key as keyof typeof CacheStrategy] === value
        );
      };

      expect(findKeyByValue('strong_timeliness')).toBe('STRONG_TIMELINESS');
      expect(findKeyByValue('weak_timeliness')).toBe('WEAK_TIMELINESS');
      expect(findKeyByValue('market_aware')).toBe('MARKET_AWARE');
      expect(findKeyByValue('no_cache')).toBe('NO_CACHE');
      expect(findKeyByValue('adaptive')).toBe('ADAPTIVE');
    });

    it('should handle invalid strategy values gracefully in type checking', () => {
      const isValidStrategy = (value: string): value is CacheStrategy => {
        return Object.values(CacheStrategy).includes(value as CacheStrategy);
      };

      expect(isValidStrategy('strong_timeliness')).toBe(true);
      expect(isValidStrategy('weak_timeliness')).toBe(true);
      expect(isValidStrategy('market_aware')).toBe(true);
      expect(isValidStrategy('no_cache')).toBe(true);
      expect(isValidStrategy('adaptive')).toBe(true);

      expect(isValidStrategy('invalid_strategy')).toBe(false);
      expect(isValidStrategy('')).toBe(false);
      expect(isValidStrategy('STRONG_TIMELINESS')).toBe(false); // Wrong case
    });

    it('should support strategy categorization', () => {
      const timeBasedStrategies = [
        CacheStrategy.STRONG_TIMELINESS,
        CacheStrategy.WEAK_TIMELINESS
      ];

      const dynamicStrategies = [
        CacheStrategy.MARKET_AWARE,
        CacheStrategy.ADAPTIVE
      ];

      const specialStrategies = [
        CacheStrategy.NO_CACHE
      ];

      // Verify categorization completeness
      const allStrategies = [
        ...timeBasedStrategies,
        ...dynamicStrategies,
        ...specialStrategies
      ];

      expect(allStrategies).toHaveLength(5);
      expect(new Set(allStrategies).size).toBe(5); // All unique
    });

    it('should maintain consistency with service layer expectations', () => {
      // Test that strategy values match what services would expect
      const expectedServiceStrategies = [
        'strong_timeliness', // For Receiver component
        'weak_timeliness',   // For Query component
        'market_aware',      // For market-sensitive caching
        'no_cache',          // For real-time requirements
        'adaptive'           // For dynamic optimization
      ];

      const actualStrategies = Object.values(CacheStrategy).sort();
      expect(actualStrategies).toEqual(expectedServiceStrategies.sort());
    });

    it('should support JSON serialization and deserialization', () => {
      const strategiesObject = {
        primary: CacheStrategy.STRONG_TIMELINESS,
        secondary: CacheStrategy.WEAK_TIMELINESS,
        fallback: CacheStrategy.NO_CACHE
      };

      const serialized = JSON.stringify(strategiesObject);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.primary).toBe('strong_timeliness');
      expect(deserialized.secondary).toBe('weak_timeliness');
      expect(deserialized.fallback).toBe('no_cache');

      // Verify round-trip consistency
      expect(deserialized.primary).toBe(CacheStrategy.STRONG_TIMELINESS);
      expect(deserialized.secondary).toBe(CacheStrategy.WEAK_TIMELINESS);
      expect(deserialized.fallback).toBe(CacheStrategy.NO_CACHE);
    });

    it('should support functional programming patterns', () => {
      const strategies = Object.values(CacheStrategy);

      // Test filter operations
      const timelinessStrategies = strategies.filter(s => s.includes('timeliness'));
      expect(timelinessStrategies).toHaveLength(2);

      // Test map operations
      const upperCaseStrategies = strategies.map(s => s.toUpperCase());
      expect(upperCaseStrategies).toContain('STRONG_TIMELINESS');
      expect(upperCaseStrategies).toContain('MARKET_AWARE');

      // Test reduce operations
      const longestStrategyName = strategies.reduce((a, b) => a.length > b.length ? a : b);
      expect(longestStrategyName).toBe('strong_timeliness'); // 17 characters

      // Test some/every operations
      expect(strategies.some(s => s.includes('cache'))).toBe(true);
      expect(strategies.every(s => typeof s === 'string')).toBe(true);
    });
  });

  describe('Interface Validation and Type Safety', () => {
    it('should enforce string literal types for strategies', () => {
      // This test ensures TypeScript compilation enforces correct types
      const validStrategy: CacheStrategy = CacheStrategy.STRONG_TIMELINESS;
      expect(validStrategy).toBe('strong_timeliness');

      // Test assignment compatibility
      const strategies: CacheStrategy[] = [
        CacheStrategy.STRONG_TIMELINESS,
        CacheStrategy.WEAK_TIMELINESS,
        CacheStrategy.MARKET_AWARE,
        CacheStrategy.NO_CACHE,
        CacheStrategy.ADAPTIVE
      ];

      expect(strategies).toHaveLength(5);
      strategies.forEach(strategy => {
        expect(typeof strategy).toBe('string');
        expect(Object.values(CacheStrategy)).toContain(strategy);
      });
    });

    it('should support conditional logic based on strategy types', () => {
      const getStrategyTTL = (strategy: CacheStrategy): number => {
        switch (strategy) {
          case CacheStrategy.STRONG_TIMELINESS:
            return 5; // 5 seconds for real-time
          case CacheStrategy.WEAK_TIMELINESS:
            return 300; // 5 minutes for batch
          case CacheStrategy.MARKET_AWARE:
            return 30; // 30 seconds, dynamic based on market
          case CacheStrategy.NO_CACHE:
            return 0; // No caching
          case CacheStrategy.ADAPTIVE:
            return 60; // 1 minute, adjustable
          default:
            return 30; // Fallback
        }
      };

      expect(getStrategyTTL(CacheStrategy.STRONG_TIMELINESS)).toBe(5);
      expect(getStrategyTTL(CacheStrategy.WEAK_TIMELINESS)).toBe(300);
      expect(getStrategyTTL(CacheStrategy.MARKET_AWARE)).toBe(30);
      expect(getStrategyTTL(CacheStrategy.NO_CACHE)).toBe(0);
      expect(getStrategyTTL(CacheStrategy.ADAPTIVE)).toBe(60);
    });

    it('should maintain backward compatibility as deprecated interface', () => {
      // Even though deprecated, the interface should continue to work
      // for existing code until migration is complete

      const legacyConfigs = {
        receiverStrategy: CacheStrategy.STRONG_TIMELINESS,
        queryStrategy: CacheStrategy.WEAK_TIMELINESS,
        defaultStrategy: CacheStrategy.MARKET_AWARE
      };

      expect(legacyConfigs.receiverStrategy).toBe('strong_timeliness');
      expect(legacyConfigs.queryStrategy).toBe('weak_timeliness');
      expect(legacyConfigs.defaultStrategy).toBe('market_aware');
    });
  });

  describe('Integration with Cache System', () => {
    it('should provide strategies suitable for different cache layers', () => {
      // Smart Cache layer strategies
      const smartCacheStrategies = [
        CacheStrategy.STRONG_TIMELINESS, // Receiver component
        CacheStrategy.WEAK_TIMELINESS,   // Query component
        CacheStrategy.MARKET_AWARE       // Dynamic TTL based on market
      ];

      // Special handling strategies
      const specialStrategies = [
        CacheStrategy.NO_CACHE,          // Bypass cache entirely
        CacheStrategy.ADAPTIVE           // Machine learning based
      ];

      smartCacheStrategies.forEach(strategy => {
        expect(Object.values(CacheStrategy)).toContain(strategy);
      });

      specialStrategies.forEach(strategy => {
        expect(Object.values(CacheStrategy)).toContain(strategy);
      });
    });

    it('should support strategy validation for cache orchestrator', () => {
      const validateCacheStrategy = (strategy: unknown): strategy is CacheStrategy => {
        return typeof strategy === 'string' &&
               Object.values(CacheStrategy).includes(strategy as CacheStrategy);
      };

      // Valid strategies
      expect(validateCacheStrategy(CacheStrategy.STRONG_TIMELINESS)).toBe(true);
      expect(validateCacheStrategy('weak_timeliness')).toBe(true);
      expect(validateCacheStrategy('market_aware')).toBe(true);

      // Invalid strategies
      expect(validateCacheStrategy('invalid')).toBe(false);
      expect(validateCacheStrategy(123)).toBe(false);
      expect(validateCacheStrategy(null)).toBe(false);
      expect(validateCacheStrategy(undefined)).toBe(false);
      expect(validateCacheStrategy({})).toBe(false);
    });
  });
});