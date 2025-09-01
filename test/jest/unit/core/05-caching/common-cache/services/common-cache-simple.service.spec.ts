import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CommonCacheService } from "@core/05-caching/common-cache/services/common-cache.service";
import { CacheCompressionService } from "@core/05-caching/common-cache/services/cache-compression.service";
// Mock CollectorService class
class MockCollectorService {
  recordCacheOperation = jest.fn();
}

describe("CommonCacheService - Simple Monitoring Test", () => {
  let service: CommonCacheService;
  let mockRedis: any;
  let mockCompressionService: any;
  let mockCollectorService: MockCollectorService;

  beforeEach(async () => {
    // Mock Redis客户端
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      pttl: jest.fn(),
      ping: jest.fn(),
    };

    // Mock压缩服务
    mockCompressionService = {
      shouldCompress: jest.fn().mockReturnValue(false),
      compress: jest.fn(),
      decompress: jest.fn(),
    };

    // Mock CollectorService
    mockCollectorService = {
      recordCacheOperation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCacheService,
        {
          provide: "REDIS_CLIENT",
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
        {
          provide: CacheCompressionService,
          useValue: mockCompressionService,
        },
        {
          provide: "CollectorService",
          useClass: MockCollectorService,
        },
      ],
    }).compile();

    service = module.get<CommonCacheService>(CommonCacheService);
    mockCollectorService = module.get("CollectorService");
  });

  describe("Service with CollectorService Integration", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should use CollectorService for monitoring", async () => {
      const key = "test:key";
      mockRedis.get.mockResolvedValue(null);

      await service.get(key);

      // 验证CollectorService被调用
      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
    });

    it("should handle cache operations with monitoring", async () => {
      const key = "test:key";
      const value = { test: "data" };

      mockRedis.setex.mockResolvedValue("OK");

      await service.set(key, value, 300);

      // 验证CollectorService被调用用于监控
      expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
    });
  });
});
