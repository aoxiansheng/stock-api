import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@cache/services/cache.service';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import { ApiKey } from '@auth/schemas/apikey.schema';
import { RateLimitStrategy } from '@auth/constants';
import { BadRequestException } from '@nestjs/common';
import { RateLimitTemplateUtil } from '@auth/utils/rate-limit-template.util';

// Mock RateLimitTemplateUtil
jest.mock('@auth/utils/rate-limit-template.util', () => ({
  RateLimitTemplateUtil: {
    generateErrorMessage: jest.fn((code, params) => `Error: ${code} - ${JSON.stringify(params)}`),
  },
}));

describe('RateLimitService', () => {
  let service: RateLimitService;
  let cacheService: jest.Mocked<CacheService>;

  const mockApiKey: ApiKey = {
    appKey: 'test-app-key',
    rateLimit: {
      requestLimit: 100,
      window: '1h',
    },
  } as ApiKey;

  beforeEach(async () => {
    const mockCacheService = {
      multi: jest.fn().mockReturnThis(),
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn(),
      eval: jest.fn(),
      safeGet: jest.fn(),
      zcard: jest.fn(),
      zrange: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('应该成功检查固定窗口频率限制', async () => {
      // Arrange
      // 修复：正确模拟 Redis pipeline.exec() 返回的嵌套数组格式
      const mockResult = [[null, 50], [null, 'OK']]; // [[err, value], [err, value]]
      (cacheService as any).exec.mockResolvedValue(mockResult);
      
      // Act
      const result = await service.checkRateLimit(
        mockApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        allowed: true,
        limit: 100,
        current: 50,
        remaining: 50,
        resetTime: expect.any(Number),
        retryAfter: undefined,
      });
    });

    it('应该成功检查滑动窗口频率限制', async () => {
      // Arrange
      cacheService.eval.mockResolvedValue([1, 30, 70, 0]); // [allowed, current, remaining, retryAfter]

      // Act
      const result = await service.checkRateLimit(
        mockApiKey,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        allowed: true,
        limit: 100,
        current: 30,
        remaining: 70,
        resetTime: expect.any(Number),
        retryAfter: undefined,
      });
    });

    it('应该在不支持的策略时抛出BadRequestException', async () => {
      // Act & Assert
      await expect(
        service.checkRateLimit(mockApiKey, 'INVALID_STRATEGY' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该在缓存服务失败时启用fail-open模式', async () => {
      // Arrange
      (cacheService as any).exec.mockRejectedValue(new Error('Cache service error'));

      // Act
      const result = await service.checkRateLimit(
        mockApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        allowed: true,
        limit: 100,
        current: 0,
        remaining: 100,
        resetTime: expect.any(Number),
        retryAfter: undefined,
      });
    });
  });

  describe('getCurrentUsage', () => {
    it('应该成功获取固定窗口的当前使用情况', async () => {
      // Arrange
      cacheService.safeGet.mockResolvedValue('50');

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        current: 50,
        limit: 100,
        remaining: 50,
        resetTime: expect.any(Number),
      });
    });

    it('应该成功获取滑动窗口的当前使用情况', async () => {
      // Arrange
      cacheService.zcard.mockResolvedValue(30);
      cacheService.zrange.mockResolvedValue(['1000000']);

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        current: 30,
        limit: 100,
        remaining: 70,
        resetTime: expect.any(Number),
      });
    });

    it('应该在缓存服务失败时返回降级数据', async () => {
      // Arrange
      cacheService.safeGet.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        current: 0,
        limit: 100,
        remaining: 100,
        resetTime: expect.any(Number),
      });
    });
  });

  describe('resetRateLimit', () => {
    it('应该成功重置固定窗口频率限制', async () => {
      // Act
      await service.resetRateLimit(mockApiKey, RateLimitStrategy.FIXED_WINDOW);

      // Assert
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('应该成功重置滑动窗口频率限制', async () => {
      // Act
      await service.resetRateLimit(mockApiKey, RateLimitStrategy.SLIDING_WINDOW);

      // Assert
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('应该在不支持的策略时记录警告但不执行删除', async () => {
      // Arrange
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.resetRateLimit(mockApiKey, 'INVALID_STRATEGY' as any);

      // Assert
      expect(warnSpy).toHaveBeenCalled();
      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });

  describe('getUsageStatistics', () => {
    it('应该成功获取API密钥使用统计', async () => {
      // Arrange
      const mockApiKeyWithStats = {
        ...mockApiKey,
        totalRequestCount: 500,
        lastAccessedAt: new Date(),
      } as ApiKey;
      
      const mockCurrentUsage = {
        current: 30,
        limit: 100,
        remaining: 70,
        resetTime: Date.now(),
      };
      
      // Mock getCurrentUsage method
      jest.spyOn(service, 'getCurrentUsage').mockResolvedValue(mockCurrentUsage);

      // Act
      const result = await service.getUsageStatistics(
        mockApiKeyWithStats,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result).toEqual({
        totalRequestCount: 500,
        currentPeriodRequestCount: 30,
        lastRequestTime: mockApiKeyWithStats.lastAccessedAt,
        averageRequestsPerHour: expect.any(Number),
      });
    });
  });

  describe('parseWindowToSeconds', () => {
    it('应该正确解析时间窗口字符串', () => {
      // Act & Assert
      expect((service as any).parseWindowToSeconds('1s')).toBe(1);
      expect((service as any).parseWindowToSeconds('1m')).toBe(60);
      expect((service as any).parseWindowToSeconds('1h')).toBe(3600);
      expect((service as any).parseWindowToSeconds('1d')).toBe(86400);
    });

    it('应该在无效格式时抛出BadRequestException', () => {
      // Act & Assert
      expect(() => (service as any).parseWindowToSeconds('invalid')).toThrow(
        BadRequestException,
      );
    });

    it('应该在不支持的时间单位时抛出BadRequestException', () => {
      // Act & Assert
      expect(() => (service as any).parseWindowToSeconds('1w')).toThrow(
        BadRequestException,
      );
    });
  });
});