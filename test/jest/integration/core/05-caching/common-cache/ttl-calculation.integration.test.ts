/**
 * TTL计算功能集成测试
 * 验证CommonCacheService.calculateOptimalTTL的集成功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommonCacheModule } from '../../../../../../src/core/05-caching/common-cache/module/common-cache.module';
import { CommonCacheService } from '../../../../../../src/core/05-caching/common-cache/services/common-cache.service';

describe('TTL计算功能集成测试', () => {
  let commonCacheService: CommonCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        CommonCacheModule,
      ],
    }).compile();

    commonCacheService = module.get<CommonCacheService>(CommonCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('CommonCacheService.calculateOptimalTTL静态方法', () => {
    it('应该为实时股票报价计算正确的TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote'
      });

      // Assert
      expect(result.ttl).toBe(300); // MARKET_OPEN_SECONDS
      expect(result.strategy).toBe('data_type_based');
      expect(result.details.baseTTL).toBe(300);
      expect(result.details.reasoning).toContain('stock-quote数据类型');
    });

    it('应该支持开市/闭市状态的TTL调整', () => {
      // Act - 开市状态
      const openMarketResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: true,
          timezone: 'America/New_York'
        }
      });

      // Act - 闭市状态
      const closedMarketResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: false,
          timezone: 'America/New_York'
        }
      });

      // Assert
      expect(openMarketResult.ttl).toBe(150); // 300 * 0.5
      expect(openMarketResult.strategy).toBe('market_aware');
      expect(closedMarketResult.ttl).toBe(600); // 300 * 2.0
      expect(closedMarketResult.strategy).toBe('market_aware');
    });

    it('应该支持新鲜度要求的TTL优化', () => {
      // Act - 实时需求
      const realtimeResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        freshnessRequirement: 'realtime'
      });

      // Act - 分析需求
      const analyticalResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        freshnessRequirement: 'analytical'
      });

      // Assert
      expect(realtimeResult.ttl).toBe(90); // 300 * 0.3
      expect(realtimeResult.strategy).toBe('freshness_optimized');
      expect(analyticalResult.ttl).toBe(450); // 300 * 1.5
      expect(analyticalResult.strategy).toBe('freshness_optimized');
    });

    it('应该支持复杂的多因子TTL计算', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        marketStatus: {
          isOpen: false,
          timezone: 'America/New_York'
        },
        freshnessRequirement: 'archive',
        customMultipliers: {
          market: 1.5,
          freshness: 2.0
        }
      });

      // Assert - 300 * 1.5 * 1.0 * 2.0 = 900
      expect(result.ttl).toBe(900);
      expect(result.strategy).toBe('freshness_optimized');
      expect(result.details.marketMultiplier).toBe(1.5);
      expect(result.details.freshnessMultiplier).toBe(2.0);
    });
  });

  describe('服务状态验证', () => {
    it('应该正确注入CommonCacheService', () => {
      expect(commonCacheService).toBeDefined();
      expect(commonCacheService).toBeInstanceOf(CommonCacheService);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极端TTL值', () => {
      // Test minimum TTL
      const minResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        customMultipliers: {
          market: 0.001,
          dataType: 0.001,
          freshness: 0.001
        }
      });
      expect(minResult.ttl).toBe(30); // MIN_SECONDS

      // Test maximum TTL
      const maxResult = CommonCacheService.calculateOptimalTTL({
        symbol: 'AAPL',
        dataType: 'stock-quote',
        customMultipliers: {
          market: 1000,
          dataType: 1000,
          freshness: 1000
        }
      });
      expect(maxResult.ttl).toBe(86400); // MAX_SECONDS
    });

    it('应该处理距离开市很久的场景', () => {
      // Arrange - 12小时后开市
      const nextStateChange = new Date(Date.now() + 12 * 60 * 60 * 1000);

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

      // Assert - 应该有更大的marketMultiplier
      expect(result.ttl).toBe(1200); // 300 * 4.0 (max multiplier)
      expect(result.details.marketMultiplier).toBe(4.0);
    });
  });
});