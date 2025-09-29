import {
  BatchMappingResult,
  SymbolMapperCacheStatsDto
} from '@core/05-caching/module/symbol-mapper-cache/interfaces/cache-stats.interface';
import { MappingDirection } from '@core/shared/constants/cache.constants';

describe('Cache Stats Interfaces', () => {
  describe('BatchMappingResult', () => {
    it('should define the correct structure for successful batch mapping', () => {
      const result: BatchMappingResult = {
        success: true,
        mappingDetails: {
          '700.HK': '00700',
          '1.HK': '00001'
        },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 2,
        processingTimeMs: 150
      };

      expect(result.success).toBe(true);
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.mappingDetails).toBe('object');
      expect(Array.isArray(result.failedSymbols)).toBe(true);
      expect(typeof result.provider).toBe('string');
      expect(typeof result.direction).toBe('string');
      expect(typeof result.totalProcessed).toBe('number');
      expect(typeof result.cacheHits).toBe('number');
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should define the correct structure for failed batch mapping', () => {
      const result: BatchMappingResult = {
        success: false,
        mappingDetails: {
          '700.HK': '00700' // Partial success
        },
        failedSymbols: ['INVALID.HK', 'UNKNOWN.US'],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 3,
        cacheHits: 1,
        processingTimeMs: 250
      };

      expect(result.success).toBe(false);
      expect(result.failedSymbols.length).toBe(2);
      expect(result.failedSymbols).toContain('INVALID.HK');
      expect(result.failedSymbols).toContain('UNKNOWN.US');
      expect(result.totalProcessed).toBe(3);
      expect(result.cacheHits).toBeLessThan(result.totalProcessed);
    });

    it('should support different mapping directions', () => {
      const toStandardResult: BatchMappingResult = {
        success: true,
        mappingDetails: { '700.HK': '00700' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 50
      };

      const fromStandardResult: BatchMappingResult = {
        success: true,
        mappingDetails: { '00700': '700.HK' },
        failedSymbols: [],
        provider: 'longport',
        direction: MappingDirection.FROM_STANDARD,
        totalProcessed: 1,
        cacheHits: 0,
        processingTimeMs: 100
      };

      expect(toStandardResult.direction).toBe(MappingDirection.TO_STANDARD);
      expect(fromStandardResult.direction).toBe(MappingDirection.FROM_STANDARD);
    });

    it('should handle empty mapping results', () => {
      const emptyResult: BatchMappingResult = {
        success: true,
        mappingDetails: {},
        failedSymbols: [],
        provider: 'test-provider',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 0,
        cacheHits: 0,
        processingTimeMs: 5
      };

      expect(Object.keys(emptyResult.mappingDetails)).toHaveLength(0);
      expect(emptyResult.failedSymbols).toHaveLength(0);
      expect(emptyResult.totalProcessed).toBe(0);
    });

    it('should validate mapping details structure', () => {
      const result: BatchMappingResult = {
        success: true,
        mappingDetails: {
          'input1': 'output1',
          'input2': 'output2',
          'input3': 'output3'
        },
        failedSymbols: [],
        provider: 'test',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 3,
        cacheHits: 3,
        processingTimeMs: 75
      };

      // Should be a Record<string, string>
      Object.entries(result.mappingDetails).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      });
    });

    it('should maintain logical consistency between fields', () => {
      const result: BatchMappingResult = {
        success: true,
        mappingDetails: {
          'symbol1': 'mapped1',
          'symbol2': 'mapped2'
        },
        failedSymbols: ['symbol3'],
        provider: 'test',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 3,
        cacheHits: 2,
        processingTimeMs: 100
      };

      const successfulMappings = Object.keys(result.mappingDetails).length;
      const failedMappings = result.failedSymbols.length;

      // Total processed should equal successful + failed
      expect(successfulMappings + failedMappings).toBe(result.totalProcessed);

      // Cache hits should not exceed successful mappings
      expect(result.cacheHits).toBeLessThanOrEqual(successfulMappings);
    });
  });

  describe('SymbolMapperCacheStatsDto', () => {
    it('should define the correct structure for cache statistics', () => {
      const stats: SymbolMapperCacheStatsDto = {
        totalQueries: 1000,
        l1HitRatio: 85.5,
        l2HitRatio: 92.3,
        l3HitRatio: 78.9,
        layerStats: {
          l1: { hits: 855, misses: 145, total: 1000 },
          l2: { hits: 923, misses: 77, total: 1000 },
          l3: { hits: 789, misses: 211, total: 1000 }
        },
        cacheSize: {
          l1: 50,
          l2: 800,
          l3: 200
        }
      };

      expect(typeof stats.totalQueries).toBe('number');
      expect(typeof stats.l1HitRatio).toBe('number');
      expect(typeof stats.l2HitRatio).toBe('number');
      expect(typeof stats.l3HitRatio).toBe('number');
      expect(typeof stats.layerStats).toBe('object');
      expect(typeof stats.cacheSize).toBe('object');
    });

    it('should validate layer statistics structure', () => {
      const stats: SymbolMapperCacheStatsDto = {
        totalQueries: 500,
        l1HitRatio: 80.0,
        l2HitRatio: 90.0,
        l3HitRatio: 70.0,
        layerStats: {
          l1: { hits: 400, misses: 100, total: 500 },
          l2: { hits: 450, misses: 50, total: 500 },
          l3: { hits: 350, misses: 150, total: 500 }
        },
        cacheSize: {
          l1: 100,
          l2: 1000,
          l3: 500
        }
      };

      // Validate L1 stats
      expect(stats.layerStats.l1.hits).toBe(400);
      expect(stats.layerStats.l1.misses).toBe(100);
      expect(stats.layerStats.l1.total).toBe(500);

      // Validate L2 stats
      expect(stats.layerStats.l2.hits).toBe(450);
      expect(stats.layerStats.l2.misses).toBe(50);
      expect(stats.layerStats.l2.total).toBe(500);

      // Validate L3 stats
      expect(stats.layerStats.l3.hits).toBe(350);
      expect(stats.layerStats.l3.misses).toBe(150);
      expect(stats.layerStats.l3.total).toBe(500);
    });

    it('should validate cache size structure', () => {
      const stats: SymbolMapperCacheStatsDto = {
        totalQueries: 100,
        l1HitRatio: 75.0,
        l2HitRatio: 85.0,
        l3HitRatio: 65.0,
        layerStats: {
          l1: { hits: 75, misses: 25, total: 100 },
          l2: { hits: 85, misses: 15, total: 100 },
          l3: { hits: 65, misses: 35, total: 100 }
        },
        cacheSize: {
          l1: 50,
          l2: 500,
          l3: 250
        }
      };

      expect(typeof stats.cacheSize.l1).toBe('number');
      expect(typeof stats.cacheSize.l2).toBe('number');
      expect(typeof stats.cacheSize.l3).toBe('number');

      // Cache sizes should be non-negative
      expect(stats.cacheSize.l1).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize.l2).toBeGreaterThanOrEqual(0);
      expect(stats.cacheSize.l3).toBeGreaterThanOrEqual(0);
    });

    it('should maintain mathematical consistency in hit ratios', () => {
      const stats: SymbolMapperCacheStatsDto = {
        totalQueries: 1000,
        l1HitRatio: 80.0,
        l2HitRatio: 90.0,
        l3HitRatio: 70.0,
        layerStats: {
          l1: { hits: 800, misses: 200, total: 1000 },
          l2: { hits: 900, misses: 100, total: 1000 },
          l3: { hits: 700, misses: 300, total: 1000 }
        },
        cacheSize: {
          l1: 100,
          l2: 1000,
          l3: 500
        }
      };

      // Hit ratio should match calculated ratio from hits/total
      const l1CalculatedRatio = (stats.layerStats.l1.hits / stats.layerStats.l1.total) * 100;
      const l2CalculatedRatio = (stats.layerStats.l2.hits / stats.layerStats.l2.total) * 100;
      const l3CalculatedRatio = (stats.layerStats.l3.hits / stats.layerStats.l3.total) * 100;

      expect(stats.l1HitRatio).toBeCloseTo(l1CalculatedRatio, 1);
      expect(stats.l2HitRatio).toBeCloseTo(l2CalculatedRatio, 1);
      expect(stats.l3HitRatio).toBeCloseTo(l3CalculatedRatio, 1);

      // Hits + misses should equal total
      expect(stats.layerStats.l1.hits + stats.layerStats.l1.misses).toBe(stats.layerStats.l1.total);
      expect(stats.layerStats.l2.hits + stats.layerStats.l2.misses).toBe(stats.layerStats.l2.total);
      expect(stats.layerStats.l3.hits + stats.layerStats.l3.misses).toBe(stats.layerStats.l3.total);
    });

    it('should handle zero values gracefully', () => {
      const emptyStats: SymbolMapperCacheStatsDto = {
        totalQueries: 0,
        l1HitRatio: 0,
        l2HitRatio: 0,
        l3HitRatio: 0,
        layerStats: {
          l1: { hits: 0, misses: 0, total: 0 },
          l2: { hits: 0, misses: 0, total: 0 },
          l3: { hits: 0, misses: 0, total: 0 }
        },
        cacheSize: {
          l1: 0,
          l2: 0,
          l3: 0
        }
      };

      expect(emptyStats.totalQueries).toBe(0);
      expect(emptyStats.l1HitRatio).toBe(0);
      expect(emptyStats.l2HitRatio).toBe(0);
      expect(emptyStats.l3HitRatio).toBe(0);
    });

    it('should support realistic cache size hierarchies', () => {
      const stats: SymbolMapperCacheStatsDto = {
        totalQueries: 10000,
        l1HitRatio: 95.0,
        l2HitRatio: 88.5,
        l3HitRatio: 75.2,
        layerStats: {
          l1: { hits: 9500, misses: 500, total: 10000 },
          l2: { hits: 8850, misses: 1150, total: 10000 },
          l3: { hits: 7520, misses: 2480, total: 10000 }
        },
        cacheSize: {
          l1: 100,    // Small provider rules cache
          l2: 1000,   // Medium symbol mapping cache
          l3: 500     // Batch result cache
        }
      };

      // L1 should be smallest (provider rules)
      expect(stats.cacheSize.l1).toBeLessThan(stats.cacheSize.l2);

      // L2 should be largest (individual symbols)
      expect(stats.cacheSize.l2).toBeGreaterThan(stats.cacheSize.l3);

      // Hit ratios should reflect cache hierarchy (L1 typically highest)
      expect(stats.l1HitRatio).toBeGreaterThan(stats.l3HitRatio);
    });
  });

  describe('Interface Integration', () => {
    it('should support combining multiple BatchMappingResults', () => {
      const result1: BatchMappingResult = {
        success: true,
        mappingDetails: { 'symbol1': 'mapped1' },
        failedSymbols: [],
        provider: 'provider1',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 50
      };

      const result2: BatchMappingResult = {
        success: false,
        mappingDetails: { 'symbol2': 'mapped2' },
        failedSymbols: ['symbol3'],
        provider: 'provider2',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 2,
        cacheHits: 1,
        processingTimeMs: 100
      };

      // Should be able to process multiple results
      const results = [result1, result2];
      const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0);
      const totalCacheHits = results.reduce((sum, r) => sum + r.cacheHits, 0);

      expect(totalProcessed).toBe(3);
      expect(totalCacheHits).toBe(2);
    });

    it('should support updating cache stats from mapping results', () => {
      const initialStats: SymbolMapperCacheStatsDto = {
        totalQueries: 100,
        l1HitRatio: 80.0,
        l2HitRatio: 85.0,
        l3HitRatio: 75.0,
        layerStats: {
          l1: { hits: 80, misses: 20, total: 100 },
          l2: { hits: 85, misses: 15, total: 100 },
          l3: { hits: 75, misses: 25, total: 100 }
        },
        cacheSize: {
          l1: 50,
          l2: 500,
          l3: 200
        }
      };

      const mappingResult: BatchMappingResult = {
        success: true,
        mappingDetails: { 'new_symbol': 'new_mapped' },
        failedSymbols: [],
        provider: 'test',
        direction: MappingDirection.TO_STANDARD,
        totalProcessed: 1,
        cacheHits: 1,
        processingTimeMs: 25
      };

      // Should be able to derive updated stats
      expect(initialStats.totalQueries).toBe(100);
      expect(mappingResult.cacheHits).toBe(1);
    });
  });
});
