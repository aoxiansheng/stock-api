/**
 * CommonCacheService TTL计算功能单元测试
 * 测试Phase 4.1.3的calculateOptimalTTL静态方法
 */

import { CommonCacheService } from '../../../../../../../src/core/shared/common-cache/services/common-cache.service';

describe('CommonCacheService TTL计算功能', () => {
  describe('calculateOptimalTTL静态方法', () => {
    it('应该为实时数据类型返回正确的基础TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote'
      });

      // Assert
      expect(result.ttl).toBe(300); // MARKET_OPEN_SECONDS
      expect(result.strategy).toBe('data_type_based');
      expect(result.details.baseTTL).toBe(300);
      expect(result.details.dataTypeMultiplier).toBe(1.0);
      expect(result.details.reasoning).toContain('stock-quote数据类型');
    });

    it('应该为历史数据类型返回正确的基础TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'historical'
      });

      // Assert
      expect(result.ttl).toBe(3600); // MARKET_CLOSED_SECONDS
      expect(result.strategy).toBe('data_type_based');
      expect(result.details.baseTTL).toBe(3600);
      expect(result.details.dataTypeMultiplier).toBe(1.0);
    });

    it('应该为静态数据类型返回最大TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'company-info'
      });

      // Assert
      expect(result.ttl).toBe(86400); // MAX_SECONDS
      expect(result.strategy).toBe('data_type_based');
      expect(result.details.baseTTL).toBe(86400);
    });

    it('应该在开市时缩短TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: true,
          timezone: 'America/New_York'
        }
      });

      // Assert
      expect(result.ttl).toBe(150); // 300 * 0.5
      expect(result.strategy).toBe('market_aware');
      expect(result.details.marketMultiplier).toBe(0.5);
      expect(result.details.reasoning).toContain('市场开放');
    });

    it('应该在闭市时延长TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: false,
          timezone: 'America/New_York'
        }
      });

      // Assert
      expect(result.ttl).toBe(600); // 300 * 2.0
      expect(result.strategy).toBe('market_aware');
      expect(result.details.marketMultiplier).toBe(2.0);
      expect(result.details.reasoning).toContain('市场关闭');
    });

    it('应该为实时新鲜度需求大幅缩短TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        freshnessRequirement: 'realtime'
      });

      // Assert
      expect(result.ttl).toBe(90); // 300 * 0.3
      expect(result.strategy).toBe('freshness_optimized');
      expect(result.details.freshnessMultiplier).toBe(0.3);
      expect(result.details.reasoning).toContain('realtime需求');
    });

    it('应该为分析型需求适度延长TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        freshnessRequirement: 'analytical'
      });

      // Assert
      expect(result.ttl).toBe(450); // 300 * 1.5
      expect(result.strategy).toBe('freshness_optimized');
      expect(result.details.freshnessMultiplier).toBe(1.5);
      expect(result.details.reasoning).toContain('analytical需求');
    });

    it('应该为归档需求大幅延长TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        freshnessRequirement: 'archive'
      });

      // Assert
      expect(result.ttl).toBe(900); // 300 * 3.0
      expect(result.strategy).toBe('freshness_optimized');
      expect(result.details.freshnessMultiplier).toBe(3.0);
      expect(result.details.reasoning).toContain('archive需求');
    });

    it('应该支持自定义倍数', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        customMultipliers: {
          market: 0.8,
          dataType: 1.2,
          freshness: 0.6
        }
      });

      // Assert
      expect(result.ttl).toBe(173); // Math.round(300 * 0.8 * 1.2 * 0.6)
      expect(result.details.marketMultiplier).toBe(0.8);
      expect(result.details.dataTypeMultiplier).toBe(1.2);
      expect(result.details.freshnessMultiplier).toBe(0.6);
    });

    it('应该组合多个影响因子', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: true,
          timezone: 'America/New_York'
        },
        freshnessRequirement: 'realtime'
      });

      // Assert
      expect(result.ttl).toBe(45); // 300 * 0.5 (market) * 0.3 (freshness)
      expect(result.strategy).toBe('freshness_optimized'); // 新鲜度优先
      expect(result.details.marketMultiplier).toBe(0.5);
      expect(result.details.freshnessMultiplier).toBe(0.3);
      expect(result.details.reasoning).toContain('市场开放');
      expect(result.details.reasoning).toContain('realtime需求');
    });

    it('应该在离开市很久时进一步延长TTL', () => {
      // Arrange - 10小时后开市
      const nextStateChange = new Date(Date.now() + 10 * 60 * 60 * 1000);

      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: false,
          timezone: 'America/New_York',
          nextStateChange
        }
      });

      // Assert
      expect(result.ttl).toBe(1200); // 300 * min(4.0, 2.0 * 2)
      expect(result.strategy).toBe('market_aware');
      expect(result.details.marketMultiplier).toBe(4.0);
    });

    it('应该应用TTL边界限制', () => {
      // Act - 测试最小值限制
      const minResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        customMultipliers: {
          market: 0.01, // 导致极小TTL
          dataType: 0.01,
          freshness: 0.01
        }
      });

      // Assert
      expect(minResult.ttl).toBe(30); // MIN_SECONDS

      // Act - 测试最大值限制
      const maxResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        customMultipliers: {
          market: 1000, // 导致极大TTL
          dataType: 1000,
          freshness: 1000
        }
      });

      // Assert
      expect(maxResult.ttl).toBe(86400); // MAX_SECONDS
    });

    it('应该为未知数据类型使用默认策略', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'unknown-type'
      });

      // Assert
      expect(result.ttl).toBe(3600); // DEFAULT_SECONDS
      expect(result.strategy).toBe('default_fallback');
      expect(result.details.baseTTL).toBe(3600);
    });

    it('应该为默认策略忽略市场状态和新鲜度要求', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'unknown-type',
        marketStatus: {
          isOpen: true,
          timezone: 'America/New_York'
        },
        freshnessRequirement: 'realtime'
      });

      // Assert
      expect(result.ttl).toBe(3600); // 应该忽略其他因子
      expect(result.strategy).toBe('default_fallback');
      expect(result.details.marketMultiplier).toBe(1.0);
      expect(result.details.freshnessMultiplier).toBe(1.0);
    });
  });
});