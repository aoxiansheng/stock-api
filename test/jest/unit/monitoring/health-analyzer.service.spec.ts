import { Test, TestingModule } from '@nestjs/testing';
import { ConfigType } from '@nestjs/config';
import { HealthAnalyzerService } from '@monitoring/analyzer/analyzer-health.service';
import { AnalyzerHealthScoreCalculator } from '@monitoring/analyzer/analyzer-score.service';
import { CacheService } from '@cache/services/cache.service';
import { MonitoringUnifiedTtl } from '@monitoring/config/unified/monitoring-unified-ttl.config';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';

describe('HealthAnalyzerService', () => {
  let service: HealthAnalyzerService;
  let cacheService: jest.Mocked<CacheService>;

  const mockTtlConfig = {
    health: 300,
    trend: 600,
    performance: 180,
    cache: 120,
    alert: 240,
  };

  const mockRawMetrics = {
    requests: [
      {
        endpoint: '/api/users',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 150,
        timestamp: new Date(Date.now() - 60000),
      },
      {
        endpoint: '/api/posts',
        method: 'POST',
        statusCode: 500,
        responseTimeMs: 2000,
        timestamp: new Date(Date.now() - 30000),
      },
      {
        endpoint: '/api/comments',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 100,
        timestamp: new Date(),
      },
    ],
    database: [
      {
        operation: 'find',
        responseTimeMs: 80,
        success: true,
        timestamp: new Date(Date.now() - 45000),
        collection: 'users',
      },
      {
        operation: 'aggregate',
        responseTimeMs: 200,
        success: false,
        timestamp: new Date(Date.now() - 15000),
        collection: 'posts',
      },
    ],
    cache: [
      {
        operation: 'get',
        hit: true,
        responseTimeMs: 10,
        timestamp: new Date(Date.now() - 50000),
        key: 'user:123',
      },
      {
        operation: 'set',
        hit: false,
        responseTimeMs: 15,
        timestamp: new Date(Date.now() - 25000),
        key: 'post:456',
      },
      {
        operation: 'get',
        hit: true,
        responseTimeMs: 5,
        timestamp: new Date(),
        key: 'comment:789',
      },
    ],
    system: {
      memory: { used: 2048, total: 4096, percentage: 0.5 },
      cpu: { usage: 0.75 },
      uptime: 86400,
      timestamp: new Date(),
    },
  };

  beforeEach(async () => {
    const mockCacheService = {
      safeGetOrSet: jest.fn(),
      safeGet: jest.fn(),
      safeSet: jest.fn(),
      delByPattern: jest.fn(),
    };

    const mockHealthScoreCalculator = {
      calculateOverallHealthScore: jest.fn(),
      getHealthGrade: jest.fn(),
      getHealthStatus: jest.fn(),
      calculateApiHealthScore: jest.fn(),
      calculateDatabaseHealthScore: jest.fn(),
      calculateCacheHealthScore: jest.fn(),
      calculateSystemHealthScore: jest.fn(),
      generateHealthRecommendations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAnalyzerService,
        {
          provide: AnalyzerHealthScoreCalculator,
          useValue: mockHealthScoreCalculator,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MonitoringUnifiedTtl.KEY,
          useValue: mockTtlConfig,
        },
      ],
    }).compile();

    service = module.get<HealthAnalyzerService>(HealthAnalyzerService);
    cacheService = module.get(CacheService);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateHealthReport', () => {
    it('should generate comprehensive health report', async () => {
      // Mock cache to execute factory function
      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.generateHealthReport(mockRawMetrics);

      expect(result).toMatchObject({
        timestamp: expect.any(Date),
        overall: expect.objectContaining({
          healthScore: expect.any(Number),
          status: expect.any(String),
        }),
        components: expect.objectContaining({
          api: expect.objectContaining({
            score: expect.any(Number),
            status: expect.any(String),
            metrics: expect.objectContaining({
              totalRequests: expect.any(Number),
              errorRate: expect.any(Number),
              averageResponseTime: expect.any(Number),
            }),
          }),
          database: expect.objectContaining({
            score: expect.any(Number),
            status: expect.any(String),
            metrics: expect.objectContaining({
              totalOperations: expect.any(Number),
              errorRate: expect.any(Number),
              averageResponseTime: expect.any(Number),
            }),
          }),
          cache: expect.objectContaining({
            score: expect.any(Number),
            status: expect.any(String),
            metrics: expect.objectContaining({
              totalOperations: expect.any(Number),
              hitRate: expect.any(Number),
              averageResponseTime: expect.any(Number),
            }),
          }),
          system: expect.objectContaining({
            score: expect.any(Number),
            status: expect.any(String),
            metrics: expect.objectContaining({
              cpuUsage: expect.any(Number),
              memoryUsage: expect.any(Number),
              uptime: expect.any(Number),
            }),
          }),
        }),
        recommendations: expect.any(Array),
      });

      expect(result.overall.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.overall.healthScore).toBeLessThanOrEqual(100);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
        expect.stringMatching(/monitoring:health:/),
        expect.any(Function),
        { ttl: mockTtlConfig.health },
      );
    });

    it('should use cached health report when available', async () => {
      const cachedReport = {
        timestamp: new Date(),
        overall: {
          healthScore: 85,
          status: 'good',
        },
        components: {
          api: { score: 80, status: 'good' },
          database: { score: 90, status: 'excellent' },
          cache: { score: 85, status: 'good' },
          system: { score: 85, status: 'good' },
        },
        recommendations: ['Optimize API response times'],
      };

      cacheService.safeGetOrSet.mockResolvedValue(cachedReport);

      const result = await service.generateHealthReport(mockRawMetrics);

      expect(result).toEqual(cachedReport);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledTimes(1);
    });

    it('should handle empty metrics gracefully', async () => {
      const emptyMetrics = {
        requests: [],
        database: [],
        cache: [],
        system: null,
      };

      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.generateHealthReport(emptyMetrics);

      expect(result).toBeDefined();
      expect(result.overall.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.components.api.responseTimeMs).toBe(0);
      expect(result.components.database.responseTimeMs).toBe(0);
      expect(result.components.cache.responseTimeMs).toBe(0);
    });

    it('should generate appropriate recommendations based on health scores', async () => {
      const poorMetrics = {
        requests: Array.from({ length: 100 }, (_, i) => ({
          endpoint: '/api/slow',
          method: 'GET',
          statusCode: i % 2 === 0 ? 500 : 200, // 50% error rate
          responseTimeMs: 3000, // Very slow
          timestamp: new Date(Date.now() - i * 1000),
        })),
        database: Array.from({ length: 50 }, (_, i) => ({
          operation: 'find',
          responseTimeMs: 5000, // Very slow
          success: i % 3 !== 0, // ~33% success rate
          timestamp: new Date(Date.now() - i * 2000),
          collection: 'test_collection',
        })),
        cache: Array.from({ length: 30 }, (_, i) => ({
          operation: 'get',
          hit: i % 5 === 0, // 20% hit rate
          responseTimeMs: 100, // Slow cache
          timestamp: new Date(Date.now() - i * 1500),
          key: `key_${i}`,
        })),
        system: {
          memory: { used: 3900, total: 4096, percentage: 0.95 }, // Very high memory
          cpu: { usage: 0.95 }, // Very high CPU
          uptime: 86400,
          timestamp: new Date(),
        },
      };

      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.generateHealthReport(poorMetrics);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should have performance-related recommendations
      const recommendations = result.recommendations.join(' ').toLowerCase();
      expect(recommendations).toMatch(/(performance|response|time|error|cpu|memory)/);
    });

    it('should calculate correct component scores', async () => {
      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.generateHealthReport(mockRawMetrics);

      // API component should have lower score due to error and slow response
      expect(result.components.api.healthScore).toBeLessThan(100);
      expect(result.components.api.errorRate).toBeGreaterThan(0);

      // Database component should reflect the mixed performance
      expect(result.components.database.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.components.database.errorRate).toBeGreaterThan(0);

      // Cache component should have good score due to good hit rate
      expect(result.components.cache.healthScore).toBeGreaterThan(result.components.api.healthScore);
      expect(result.components.cache.hitRate).toBeGreaterThan(0.5);

      // System component should reflect medium performance
      expect(result.components.system.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.components.system.cpuUsage).toBe(0.75);
      expect(result.components.system.memoryUsage).toBe(0.5);
    });
  });

  describe('analyzeApiHealth', () => {
    it('should analyze API health correctly', () => {
      const apiHealth = service['analyzeApiHealth'](mockRawMetrics.requests);

      expect(apiHealth).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        metrics: expect.objectContaining({
          totalRequests: 3,
          errorRate: expect.any(Number),
          averageResponseTime: expect.any(Number),
          slowRequests: expect.any(Number),
        }),
      });

      // Calculate expected values
      const totalRequests = mockRawMetrics.requests.length;
      const errorRequests = mockRawMetrics.requests.filter(r => r.statusCode >= 400).length;
      const expectedErrorRate = errorRequests / totalRequests;

      expect(apiHealth.metrics.totalRequests).toBe(totalRequests);
      expect(apiHealth.metrics.errorRate).toBeCloseTo(expectedErrorRate, 2);
      expect(apiHealth.score).toBeGreaterThanOrEqual(0);
      expect(apiHealth.score).toBeLessThanOrEqual(100);
    });

    it('should handle empty requests array', () => {
      const apiHealth = service['analyzeApiHealth']([]);

      expect(apiHealth).toMatchObject({
        score: 100, // Perfect score for no requests
        status: 'excellent',
        metrics: {
          totalRequests: 0,
          errorRate: 0,
          averageResponseTime: 0,
          slowRequests: 0,
        },
      });
    });

    it('should identify slow requests correctly', () => {
      const slowRequests = [
        ...mockRawMetrics.requests,
        {
          type: 'request',
          endpoint: '/api/very-slow',
          method: 'GET',
          statusCode: 200,
          responseTimeMs: 5000, // Very slow
          timestamp: new Date(),
        },
      ];

      const apiHealth = service['analyzeApiHealth'](slowRequests);

      expect(apiHealth.metrics.slowRequests).toBeGreaterThan(0);
      expect(apiHealth.score).toBeLessThan(90); // Should penalize for slow requests
    });

    it('should handle high error rates', () => {
      const errorRequests = Array.from({ length: 10 }, (_, i) => ({
        type: 'request',
        endpoint: '/api/error',
        method: 'GET',
        statusCode: 500,
        responseTimeMs: 100,
        timestamp: new Date(Date.now() - i * 1000),
      }));

      const apiHealth = service['analyzeApiHealth'](errorRequests);

      expect(apiHealth.metrics.errorRate).toBe(1.0); // 100% error rate
      expect(apiHealth.score).toBeLessThan(50); // Should be low score
      expect(apiHealth.status).toMatch(/(critical|poor)/);
    });
  });

  describe('analyzeDatabaseHealth', () => {
    it('should analyze database health correctly', () => {
      const dbHealth = service['analyzeDatabaseHealth'](mockRawMetrics.database);

      expect(dbHealth).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        metrics: expect.objectContaining({
          totalOperations: 2,
          errorRate: expect.any(Number),
          averageResponseTime: expect.any(Number),
          slowQueries: expect.any(Number),
        }),
      });

      // Calculate expected values
      const totalOps = mockRawMetrics.database.length;
      const failedOps = mockRawMetrics.database.filter(db => !db.success).length;
      const expectedErrorRate = failedOps / totalOps;

      expect(dbHealth.metrics.totalOperations).toBe(totalOps);
      expect(dbHealth.metrics.errorRate).toBeCloseTo(expectedErrorRate, 2);
    });

    it('should handle empty database operations', () => {
      const dbHealth = service['analyzeDatabaseHealth']([]);

      expect(dbHealth).toMatchObject({
        score: 100,
        status: 'excellent',
        metrics: {
          totalOperations: 0,
          errorRate: 0,
          averageResponseTime: 0,
          slowQueries: 0,
        },
      });
    });

    it('should identify slow queries', () => {
      const slowDbOps = [
        ...mockRawMetrics.database,
        {
          type: 'database',
          responseTimeMs: 10000, // Very slow query
          timestamp: new Date(),
          metadata: { operation: 'complex_aggregate', success: true },
        },
      ];

      const dbHealth = service['analyzeDatabaseHealth'](slowDbOps);

      expect(dbHealth.metrics.slowQueries).toBeGreaterThan(0);
      expect(dbHealth.score).toBeLessThan(95);
    });
  });

  describe('analyzeCacheHealth', () => {
    it('should analyze cache health correctly', () => {
      const cacheHealth = service['analyzeCacheHealth'](mockRawMetrics.cache);

      expect(cacheHealth).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        metrics: expect.objectContaining({
          totalOperations: 3,
          hitRate: expect.any(Number),
          averageResponseTime: expect.any(Number),
        }),
      });

      // Calculate expected hit rate
      const totalOps = mockRawMetrics.cache.length;
      const hits = mockRawMetrics.cache.filter(c => c.hit).length;
      const expectedHitRate = hits / totalOps;

      expect(cacheHealth.metrics.totalOperations).toBe(totalOps);
      expect(cacheHealth.metrics.hitRate).toBeCloseTo(expectedHitRate, 2);
    });

    it('should handle empty cache operations', () => {
      const cacheHealth = service['analyzeCacheHealth']([]);

      expect(cacheHealth).toMatchObject({
        score: 100,
        status: 'excellent',
        metrics: {
          totalOperations: 0,
          hitRate: 1, // Perfect hit rate for no operations
          averageResponseTime: 0,
        },
      });
    });

    it('should penalize low hit rates', () => {
      const lowHitRateCache = Array.from({ length: 10 }, (_, i) => ({
        type: 'cache',
        responseTimeMs: 10,
        timestamp: new Date(Date.now() - i * 1000),
        metadata: { operation: 'get', hit: i === 0 }, // Only first one hits (10% hit rate)
      }));

      const cacheHealth = service['analyzeCacheHealth'](lowHitRateCache);

      expect(cacheHealth.metrics.hitRate).toBe(0.1);
      expect(cacheHealth.score).toBeLessThan(70); // Should be penalized
    });
  });

  describe('analyzeSystemHealth', () => {
    it('should analyze system health correctly', () => {
      const systemHealth = service['analyzeSystemHealth'](mockRawMetrics.system);

      expect(systemHealth).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        metrics: expect.objectContaining({
          cpuUsage: 0.75,
          memoryUsage: 0.5,
          uptime: 86400,
        }),
      });

      expect(systemHealth.score).toBeGreaterThanOrEqual(0);
      expect(systemHealth.score).toBeLessThanOrEqual(100);
    });

    it('should handle null system metrics', () => {
      const systemHealth = service['analyzeSystemHealth'](null);

      expect(systemHealth).toMatchObject({
        score: 50, // Default middle score
        status: 'unknown',
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          uptime: 0,
        },
      });
    });

    it('should penalize high resource usage', () => {
      const highUsageSystem = {
        memory: { used: 3900, total: 4096, percentage: 0.95 },
        cpu: { usage: 0.95 },
        uptime: 3600,
        timestamp: new Date(),
      };

      const systemHealth = service['analyzeSystemHealth'](highUsageSystem);

      expect(systemHealth.score).toBeLessThan(50); // Should be penalized for high usage
      expect(systemHealth.status).toMatch(/(critical|poor)/);
    });

    it('should reward good resource usage', () => {
      const goodUsageSystem = {
        memory: { used: 1024, total: 4096, percentage: 0.25 },
        cpu: { usage: 0.3 },
        uptime: 86400,
        timestamp: new Date(),
      };

      const systemHealth = service['analyzeSystemHealth'](goodUsageSystem);

      expect(systemHealth.score).toBeGreaterThan(80); // Should have good score
      expect(systemHealth.status).toMatch(/(excellent|good)/);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted overall score', () => {
      const componentScores = {
        api: 80,
        database: 90,
        cache: 85,
        system: 75,
      };

      const overallScore = service['calculateOverallScore'](componentScores);

      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);
      expect(typeof overallScore).toBe('number');

      // Should be a weighted average, so between the min and max
      const scores = Object.values(componentScores);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      expect(overallScore).toBeGreaterThanOrEqual(minScore - 5); // Allow some variance
      expect(overallScore).toBeLessThanOrEqual(maxScore + 5);
    });

    it('should handle edge case scores', () => {
      const perfectScores = {
        api: 100,
        database: 100,
        cache: 100,
        system: 100,
      };

      const poorScores = {
        api: 0,
        database: 0,
        cache: 0,
        system: 0,
      };

      const perfectOverall = service['calculateOverallScore'](perfectScores);
      const poorOverall = service['calculateOverallScore'](poorScores);

      expect(perfectOverall).toBe(100);
      expect(poorOverall).toBe(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return correct status for different scores', () => {
      expect(service['getHealthStatus'](95)).toBe('excellent');
      expect(service['getHealthStatus'](80)).toBe('good');
      expect(service['getHealthStatus'](65)).toBe('fair');
      expect(service['getHealthStatus'](45)).toBe('poor');
      expect(service['getHealthStatus'](25)).toBe('critical');
    });

    it('should handle edge case scores', () => {
      expect(service['getHealthStatus'](100)).toBe('excellent');
      expect(service['getHealthStatus'](0)).toBe('critical');
      expect(service['getHealthStatus'](-10)).toBe('critical');
      expect(service['getHealthStatus'](110)).toBe('excellent');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations based on component scores', () => {
      const componentAnalysis = {
        api: { score: 60, status: 'fair', metrics: { errorRate: 0.1 } },
        database: { score: 40, status: 'poor', metrics: { slowQueries: 5 } },
        cache: { score: 50, status: 'poor', metrics: { hitRate: 0.4 } },
        system: { score: 30, status: 'critical', metrics: { cpuUsage: 0.95 } },
      };

      const recommendations = service['generateRecommendations'](componentAnalysis);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should contain relevant recommendations
      const allRecommendations = recommendations.join(' ').toLowerCase();
      expect(allRecommendations).toMatch(/(database|performance|cpu|cache)/);
    });

    it('should generate few recommendations for good health', () => {
      const goodComponentAnalysis = {
        api: { score: 95, status: 'excellent', metrics: { errorRate: 0.001 } },
        database: { score: 90, status: 'excellent', metrics: { slowQueries: 0 } },
        cache: { score: 88, status: 'good', metrics: { hitRate: 0.9 } },
        system: { score: 85, status: 'good', metrics: { cpuUsage: 0.4 } },
      };

      const recommendations = service['generateRecommendations'](goodComponentAnalysis);

      expect(recommendations.length).toBeLessThan(3); // Fewer recommendations for good health
    });

    it('should handle empty metrics gracefully', () => {
      const emptyComponentAnalysis = {
        api: { score: 100, status: 'excellent', metrics: {} },
        database: { score: 100, status: 'excellent', metrics: {} },
        cache: { score: 100, status: 'excellent', metrics: {} },
        system: { score: 100, status: 'excellent', metrics: {} },
      };

      const recommendations = service['generateRecommendations'](emptyComponentAnalysis);

      expect(recommendations).toBeInstanceOf(Array);
      // Should not throw error and should return minimal recommendations
    });
  });

  describe('invalidateHealthCache', () => {
    it('should invalidate health cache pattern', async () => {
      cacheService.delByPattern.mockResolvedValue(undefined);

      await service.invalidateHealthCache();

      expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:health:*');
    });

    it('should handle cache invalidation errors gracefully', async () => {
      cacheService.delByPattern.mockRejectedValue(new Error('Cache service unavailable'));

      // Should not throw error
      await expect(service.invalidateHealthCache()).resolves.toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed metrics data', async () => {
      const malformedMetrics = {
        requests: [
          { statusCode: 'invalid' }, // Invalid status code
          { responseTimeMs: -100 }, // Negative response time
          null, // Null request
        ],
        database: [
          { metadata: null }, // Null metadata
          { responseTimeMs: 'slow' }, // Invalid response time
        ],
        cache: [
          { metadata: { hit: 'maybe' } }, // Invalid hit value
        ],
        system: {
          memory: { percentage: 'high' }, // Invalid percentage
          cpu: { usage: null }, // Null usage
        },
      };

      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      // Should handle gracefully without throwing
      const result = await service.generateHealthReport(malformedMetrics as any);

      expect(result).toBeDefined();
      expect(result.overall.healthScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large datasets', async () => {
      const largeMetrics = {
        requests: Array.from({ length: 10000 }, (_, i) => ({
          endpoint: `/api/endpoint${i % 100}`,
          method: i % 2 === 0 ? 'GET' : 'POST',
          statusCode: i % 10 === 0 ? 500 : 200,
          responseTimeMs: Math.random() * 1000,
          timestamp: new Date(Date.now() - i * 1000),
        })),
        database: Array.from({ length: 1000 }, (_, i) => ({
          operation: 'query',
          responseTimeMs: Math.random() * 500,
          success: i % 20 !== 0,
          timestamp: new Date(Date.now() - i * 2000),
          collection: 'test_collection',
        })),
        cache: Array.from({ length: 2000 }, (_, i) => ({
          operation: 'get',
          hit: i % 4 !== 0,
          responseTimeMs: Math.random() * 50,
          timestamp: new Date(Date.now() - i * 1000),
          key: `key_${i}`,
        })),
        system: mockRawMetrics.system,
      };

      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const startTime = Date.now();
      const result = await service.generateHealthReport(largeMetrics);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.components.api.responseTimeMs).toBeGreaterThan(0);
      expect(result.components.database.responseTimeMs).toBeGreaterThan(0);
      expect(result.components.cache.responseTimeMs).toBeGreaterThan(0);
    });
  });
});