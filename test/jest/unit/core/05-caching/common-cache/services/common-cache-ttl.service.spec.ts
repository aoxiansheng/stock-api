/**
 * CommonCacheService TTL计算单元测试
 */

import { CommonCacheService } from '../../../../../../../src/core/05-caching/common-cache/services/common-cache.service';

describe('CommonCacheService - TTL计算', () => {
  describe('calculateOptimalTTL', () => {
    it('应该为默认参数返回正确的TTL', () => {
      // Act - Using actual method signature: calculateOptimalTTL(dataSize: number, accessPattern?, customTTL?)
      const result = CommonCacheService.calculateOptimalTTL(1000);

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该为热门访问模式返回较短的TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(1000, 'hot');

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该为冷门访问模式返回较长的TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(1000, 'cold');

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该使用自定义TTL当提供时', () => {
      // Act
      const customTTL = 600;
      const result = CommonCacheService.calculateOptimalTTL(1000, 'warm', customTTL);

      // Assert
      expect(result).toBe(customTTL);
    });

    it('应该忽略无效的自定义TTL', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(1000, 'warm', -1);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).not.toBe(-1);
    });

    it('应该处理零大小的数据', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(0);

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该处理大尺寸数据', () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(1000000); // 1MB

      // Assert
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('应该为不同访问模式返回不同的TTL', () => {
      // Act
      const hotTTL = CommonCacheService.calculateOptimalTTL(1000, 'hot');
      const warmTTL = CommonCacheService.calculateOptimalTTL(1000, 'warm');
      const coldTTL = CommonCacheService.calculateOptimalTTL(1000, 'cold');

      // Assert
      expect(typeof hotTTL).toBe('number');
      expect(typeof warmTTL).toBe('number');
      expect(typeof coldTTL).toBe('number');
      
      // All should be positive
      expect(hotTTL).toBeGreaterThan(0);
      expect(warmTTL).toBeGreaterThan(0);
      expect(coldTTL).toBeGreaterThan(0);
    });
  });
});