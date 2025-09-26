import { Test, TestingModule } from '@nestjs/testing';
import { CacheStatusController } from '@cache/controllers/cache-status.controller';
import { CacheService } from '@cache/services/cache.service';
import { CACHE_STATUS } from '@cache/constants/status/cache-status.constants';

// Mock PaginationService since it may not be available
class PaginationService {
  normalizePaginationQuery = jest.fn();
  createPaginatedResponse = jest.fn();
}

// Mock DTOs since they may not exist
interface CacheKeyPatternAnalysisQueryDto {
  page?: number;
  limit?: number;
  pattern?: string;
  minHits?: number;
}

interface CachePerformanceMonitoringQueryDto {
  page?: number;
  limit?: number;
  operation?: string;
  slowOperationsOnly?: boolean;
  startTime?: string;
  endTime?: string;
}

// Mock PaginationService
const mockPaginationService = {
  normalizePaginationQuery: jest.fn(),
  createPaginatedResponse: jest.fn(),
};

describe('CacheStatusController', () => {
  let controller: CacheStatusController;
  let cacheService: jest.Mocked<CacheService>;
  let paginationService: any;

  beforeEach(async () => {
    const mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheStatusController],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: PaginationService, useValue: mockPaginationService },
      ],
    }).compile();

    controller = module.get<CacheStatusController>(CacheStatusController);
    cacheService = module.get(CacheService);
    paginationService = mockPaginationService;
  });

  describe('getHealth', () => {
    it('should return healthy status when cache is working', async () => {
      cacheService.set.mockResolvedValue(true);
      cacheService.get.mockResolvedValue('ok');

      const result = await controller.getHealth();

      expect(result.status).toBe(CACHE_STATUS.HEALTHY);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.errors).toEqual([]);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.memoryInfo).toBeDefined();
    });

    it('should return degraded status when cache returns unexpected result', async () => {
      cacheService.set.mockResolvedValue(true);
      cacheService.get.mockResolvedValue('unexpected');

      const result = await controller.getHealth();

      expect(result.status).toBe(CACHE_STATUS.DEGRADED);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.errors).toEqual([]);
    });

    it('should return unhealthy status when cache throws error', async () => {
      cacheService.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = await controller.getHealth();

      expect(result.status).toBe(CACHE_STATUS.UNHEALTHY);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.errors).toContain('Redis connection failed');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should measure response latency correctly', async () => {
      const startTime = Date.now();
      cacheService.set.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(true), 10));
      });
      cacheService.get.mockResolvedValue('ok');

      const result = await controller.getHealth();

      expect(result.latency).toBeGreaterThanOrEqual(10);
      expect(result.latency).toBeLessThan(1000); // Should complete quickly in tests
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const result = await controller.getStats();

      expect(result).toEqual({
        hitRate: 0.85,
        totalRequests: 1000,
        totalHits: 850,
        totalMisses: 150,
        totalKeys: 500,
        memoryUsage: 52428800, // 50MB
        ttlDistribution: {
          '0-300': 100,
          '300-3600': 300,
          '3600+': 100,
        },
        topKeys: [
          { key: 'user:123', accessCount: 50 },
          { key: 'config:app', accessCount: 30 },
        ],
        performanceMetrics: {
          avgResponseTime: 2.5,
          p95ResponseTime: 5.0,
          p99ResponseTime: 10.0,
        },
      });
    });

    it('should return consistent data structure', async () => {
      const result = await controller.getStats();

      expect(result.hitRate).toBeGreaterThanOrEqual(0);
      expect(result.hitRate).toBeLessThanOrEqual(1);
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.totalHits + result.totalMisses).toBe(result.totalRequests);
      expect(result.ttlDistribution).toBeDefined();
      expect(result.topKeys).toBeInstanceOf(Array);
      expect(result.performanceMetrics).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return cache configuration', async () => {
      const result = await controller.getConfig();

      expect(result).toEqual({
        defaultTtl: 3600,
        maxSize: 10485760, // 10MB
        enabled: true,
        serializer: 'json',
        compressionThreshold: 1024,
      });
    });

    it('should return valid configuration structure', async () => {
      const result = await controller.getConfig();

      expect(typeof result.defaultTtl).toBe('number');
      expect(typeof result.maxSize).toBe('number');
      expect(typeof result.enabled).toBe('boolean');
      expect(typeof result.serializer).toBe('string');
      expect(typeof result.compressionThreshold).toBe('number');
    });
  });

  describe('getKeyPatterns', () => {
    const mockQuery: CacheKeyPatternAnalysisQueryDto = {
      page: 1,
      limit: 10,
    };

    beforeEach(() => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('should return paginated key patterns without filters', async () => {
      const mockPaginatedResponse = {
        data: [
          {
            pattern: 'user:*',
            hits: 1250,
            misses: 150,
            hitRate: 0.89,
            totalRequests: 1400,
            lastAccessTime: expect.any(Number),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };
      paginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResponse);

      const result = await controller.getKeyPatterns(mockQuery);

      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(mockQuery);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should filter by pattern when provided', async () => {
      const queryWithPattern = { ...mockQuery, pattern: 'user' };

      await controller.getKeyPatterns(queryWithPattern);

      // Verify that createPaginatedResponse was called with filtered data
      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];

      // All items should contain 'user' in their pattern
      filteredData.forEach(item => {
        expect(item.pattern.includes('user')).toBe(true);
      });
    });

    it('should filter by minimum hits when provided', async () => {
      const queryWithMinHits = { ...mockQuery, minHits: 1000 };

      await controller.getKeyPatterns(queryWithMinHits);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];

      // All items should have hits >= 1000
      filteredData.forEach(item => {
        expect(item.hits).toBeGreaterThanOrEqual(1000);
      });
    });

    it('should combine multiple filters', async () => {
      const queryWithFilters = {
        ...mockQuery,
        pattern: 'session',
        minHits: 2000
      };

      await controller.getKeyPatterns(queryWithFilters);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];

      filteredData.forEach(item => {
        expect(item.pattern.includes('session')).toBe(true);
        expect(item.hits).toBeGreaterThanOrEqual(2000);
      });
    });

    it('should handle pagination correctly', async () => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 2, limit: 5 });

      await controller.getKeyPatterns({ ...mockQuery, page: 2, limit: 5 });

      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        expect.any(Array),
        2,
        5,
        expect.any(Number)
      );
    });

    it('should return empty results when no patterns match filter', async () => {
      const queryWithNonMatchingPattern = { ...mockQuery, pattern: 'nonexistent' };
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });

      const result = await controller.getKeyPatterns(queryWithNonMatchingPattern);

      expect((result as any).data).toHaveLength(0);
      expect((result as any).meta.total).toBe(0);
    });
  });

  describe('getPerformanceData', () => {
    const mockQuery: CachePerformanceMonitoringQueryDto = {
      page: 1,
      limit: 10,
    };

    beforeEach(() => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('should return paginated performance data without filters', async () => {
      const mockPaginatedResponse = {
        data: [
          {
            operation: 'get',
            processingTimeMs: 2.5,
            timestamp: expect.any(Number),
            isSlowOperation: false,
            slowOperationThreshold: 100,
            additionalMetrics: { keySize: 15, valueSize: 2048 },
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };
      paginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResponse);

      const result = await controller.getPerformanceData(mockQuery);

      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(mockQuery);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should filter by operation when provided', async () => {
      const queryWithOperation = { ...mockQuery, operation: 'set' };

      await controller.getPerformanceData(queryWithOperation);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];

      filteredData.forEach(item => {
        expect(item.operation).toBe('set');
      });
    });

    it('should filter slow operations only when requested', async () => {
      const queryWithSlowOnly = { ...mockQuery, slowOperationsOnly: true };

      await controller.getPerformanceData(queryWithSlowOnly);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];

      filteredData.forEach(item => {
        expect(item.isSlowOperation).toBe(true);
      });
    });

    it('should filter by start time when provided', async () => {
      const startTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const queryWithStartTime = { ...mockQuery, startTime };

      await controller.getPerformanceData(queryWithStartTime);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];
      const startTimestamp = new Date(startTime).getTime();

      filteredData.forEach(item => {
        expect(item.timestamp).toBeGreaterThanOrEqual(startTimestamp);
      });
    });

    it('should filter by end time when provided', async () => {
      const endTime = new Date(Date.now() - 1800000).toISOString(); // 30 minutes ago
      const queryWithEndTime = { ...mockQuery, endTime };

      await controller.getPerformanceData(queryWithEndTime);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];
      const endTimestamp = new Date(endTime).getTime();

      filteredData.forEach(item => {
        expect(item.timestamp).toBeLessThanOrEqual(endTimestamp);
      });
    });

    it('should filter by time range when both start and end time provided', async () => {
      const startTime = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
      const endTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const queryWithTimeRange = { ...mockQuery, startTime, endTime };

      await controller.getPerformanceData(queryWithTimeRange);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];
      const startTimestamp = new Date(startTime).getTime();
      const endTimestamp = new Date(endTime).getTime();

      filteredData.forEach(item => {
        expect(item.timestamp).toBeGreaterThanOrEqual(startTimestamp);
        expect(item.timestamp).toBeLessThanOrEqual(endTimestamp);
      });
    });

    it('should combine multiple filters', async () => {
      const queryWithFilters = {
        ...mockQuery,
        operation: 'del',
        slowOperationsOnly: true,
        startTime: new Date(Date.now() - 7200000).toISOString(),
      };

      await controller.getPerformanceData(queryWithFilters);

      const callArgs = paginationService.createPaginatedResponse.mock.calls[0];
      const filteredData = callArgs[0];
      const startTimestamp = new Date(queryWithFilters.startTime).getTime();

      filteredData.forEach(item => {
        expect(item.operation).toBe('del');
        expect(item.isSlowOperation).toBe(true);
        expect(item.timestamp).toBeGreaterThanOrEqual(startTimestamp);
      });
    });

    it('should handle pagination correctly', async () => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 2, limit: 5 });

      await controller.getPerformanceData({ ...mockQuery, page: 2, limit: 5 });

      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        expect.any(Array),
        2,
        5,
        expect.any(Number)
      );
    });

    it('should return empty results when no data matches filters', async () => {
      const queryWithNonMatchingOperation = { ...mockQuery, operation: 'nonexistent' as any };
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });

      const result = await controller.getPerformanceData(queryWithNonMatchingOperation);

      expect((result as any).data).toHaveLength(0);
      expect((result as any).meta.total).toBe(0);
    });
  });

  describe('Integration with Services', () => {
    it('should use CacheService for health checks', async () => {
      cacheService.set.mockResolvedValue(true);
      cacheService.get.mockResolvedValue('ok');

      await controller.getHealth();

      expect(cacheService.set).toHaveBeenCalledWith('health-check', 'ok', { ttl: 10 });
      expect(cacheService.get).toHaveBeenCalledWith('health-check');
    });

    it('should use PaginationService for paginated endpoints', async () => {
      const query = { page: 1, limit: 10 };
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.getKeyPatterns(query);

      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle CacheService errors gracefully in health check', async () => {
      cacheService.set.mockRejectedValue(new Error('Connection timeout'));

      const result = await controller.getHealth();

      expect(result.status).toBe(CACHE_STATUS.UNHEALTHY);
      expect(result.errors).toContain('Connection timeout');
    });

    it('should not throw when PaginationService methods are called', async () => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.createPaginatedResponse.mockReturnValue({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await expect(controller.getKeyPatterns({})).resolves.not.toThrow();
      await expect(controller.getPerformanceData({})).resolves.not.toThrow();
    });
  });
});