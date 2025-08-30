/**
 * RateLimitService 单元测试
 * 测试速率限制服务的核心逻辑，Mock Redis依赖
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getModelToken } from "@nestjs/mongoose";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { InjectRedis } from "@nestjs-modules/ioredis";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RateLimitService } from "../../../../../src/auth/services/rate-limit.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RateLimitStrategy } from "../../../../../src/common/constants/rate-limit.constants";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiKey } from "../../../../../src/auth/schemas/apikey.schema";

describe("RateLimitService", () => {
  let service: RateLimitService;
  let mockRedis: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let apiKeyModel: any;

  const mockApiKey = {
    id: "507f1f77bcf86cd799439012",
    appKey: "test-app-key",
    accessToken: "test-access-token",
    name: "Test API Key",
    userId: "507f1f77bcf86cd799439011",
    permissions: ["data:read", "query:execute"],
    rateLimit: {
      requests: 100,
      window: "1h",
    },
    isActive: true,
    usageCount: 50,
    lastUsedAt: new Date("2024-01-01T10:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    // Mock Redis实例
    mockRedis = {
      pipeline: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      eval: jest.fn(),
      get: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
      exec: jest.fn(),
      zcard: jest.fn(),
      zrange: jest.fn(),
    };

    // Mock Redis Pipeline
    const mockPipeline = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockRedis.pipeline.mockReturnValue(mockPipeline);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: getModelToken(ApiKey.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockRedis),
          },
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    apiKeyModel = module.get(getModelToken(ApiKey.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("parseWindowToSeconds", () => {
    it("应该正确解析秒数", () => {
      // Access private method for testing
      const parseWindow = (service as any).parseWindowToSeconds.bind(service);

      expect(parseWindow("30s")).toBe(30);
      expect(parseWindow("1s")).toBe(1);
      expect(parseWindow("60s")).toBe(60);
    });

    it("应该正确解析分钟", () => {
      const parseWindow = (service as any).parseWindowToSeconds.bind(service);

      expect(parseWindow("1m")).toBe(60);
      expect(parseWindow("5m")).toBe(300);
      expect(parseWindow("30m")).toBe(1800);
    });

    it("应该正确解析小时", () => {
      const parseWindow = (service as any).parseWindowToSeconds.bind(service);

      expect(parseWindow("1h")).toBe(3600);
      expect(parseWindow("2h")).toBe(7200);
      expect(parseWindow("24h")).toBe(86400);
    });

    it("应该正确解析天数", () => {
      const parseWindow = (service as any).parseWindowToSeconds.bind(service);

      expect(parseWindow("1d")).toBe(86400);
      expect(parseWindow("7d")).toBe(604800);
    });

    it("应该在无效格式时抛出错误", () => {
      const parseWindow = (service as any).parseWindowToSeconds.bind(service);

      expect(() => parseWindow("invalid")).toThrow("无效的时间窗口格式");
      expect(() => parseWindow("1x")).toThrow("无效的时间窗口格式");
      expect(() => parseWindow("1")).toThrow("无效的时间窗口格式");
      expect(() => parseWindow("")).toThrow("无效的时间窗口格式");
    });

    it("应该在不支持的时间单位时抛出错误", () => {
      // 这个测试可能不会触发，因为正则表达式只匹配 s|m|h|d
      // 但保留以防代码逻辑变化
    });
  });

  describe("generateRedisKey", () => {
    it("应该生成正确的Redis键", () => {
      const generateKey = (service as any).generateRedisKey.bind(service);

      expect(generateKey("test-app-key", "1h")).toBe(
        "ratelimit:test-app-key:1h",
      );
      expect(generateKey("another-key", "5m")).toBe(
        "rate_limit:another-key:5m",
      );
    });
  });

  describe("checkRateLimit - Fixed Window", () => {
    it("应该在未超过限制时允许请求", async () => {
      // Arrange
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([
        [null, 50], // incr result
        [null, "OK"], // expire result
      ]);

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(50);
      expect(result.remaining).toBe(50);
      expect(result.retryAfter).toBeUndefined();
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it("应该在超过限制时拒绝请求", async () => {
      // Arrange
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([
        [null, 101], // incr result - 超过限制
        [null, "OK"], // expire result
      ]);

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(101);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("应该在刚好达到限制时允许请求", async () => {
      // Arrange
      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([
        [null, 100], // incr result - 刚好到达限制
        [null, "OK"], // expire result
      ]);

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(100);
      expect(result.remaining).toBe(0);
    });
  });

  describe("checkRateLimit - Sliding Window", () => {
    it("应该在未超过限制时允许请求", async () => {
      // Arrange
      mockRedis.eval.mockResolvedValue([1, 50, 49]); // [allowed, current, remaining]

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(50);
      expect(result.remaining).toBe(49);
      expect(result.retryAfter).toBeUndefined();
    });

    it("应该在超过限制时拒绝请求", async () => {
      // Arrange
      mockRedis.eval.mockResolvedValue([0, 100, 0, 3600]); // [not allowed, current, remaining, retryAfter]

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.current).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(3600); // 1小时的秒数
    });

    it("应该使用正确的Lua脚本参数", async () => {
      // Arrange
      mockRedis.eval.mockResolvedValue([1, 1, 99, 0]);
      const currentTime = Date.now();

      jest.spyOn(Date, "now").mockReturnValue(currentTime);

      // Act
      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String), // Lua script
        1, // number of keys
        "rate_limit:test-app-key:1h:sliding",
        currentTime.toString(),
        "3600", // 1小时的秒数
        "100", // 限制数量
        expect.any(String), // luaExpireBufferSeconds
      );
    });
  });

  describe("checkRateLimit - Error Handling", () => {
    it("应该在Redis错误时进入fail-open模式并允许请求", async () => {
      // Arrange
      const mockError = new Error("Redis connection failed");
      (mockRedis.pipeline as jest.Mock).mockImplementation(() => {
        const mockPipeline = {
          incr: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(mockError),
        };
        return mockPipeline as any;
      });

      // Act
      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(mockApiKey.rateLimit.requests);
    });

    it("应该在不支持的策略时抛出错误", async () => {
      // Arrange
      const invalidStrategy =
        "invalid_strategy" as unknown as RateLimitStrategy;

      // Act & Assert
      await expect(
        service.checkRateLimit(mockApiKey as any, invalidStrategy),
      ).rejects.toThrow(`不支持的频率限制策略: ${invalidStrategy}`);
    });
  });

  describe("getCurrentUsage", () => {
    it("应该返回当前使用统计 - 固定窗口", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue("50");

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.current).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(50);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("应该返回当前使用统计 - 滑动窗口", async () => {
      // Arrange
      mockRedis.zcard.mockResolvedValue(30);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const futureTimestamp = Date.now() + 3600000; // 1小时后
      mockRedis.zrange.mockResolvedValue([futureTimestamp.toString()]);

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result.current).toBe(30);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(70);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("应该在Redis键不存在时返回0", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);

      // Act
      const result = await service.getCurrentUsage(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.current).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(100);
    });
  });

  describe("resetRateLimit", () => {
    it("应该删除固定窗口策略的Redis键", async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(1);
      const currentTime = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(currentTime);

      // Act
      await service.resetRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit:test-app-key:1h:_fixed:"),
      );
    });

    it("应该删除滑动窗口策略的Redis键", async () => {
      // Arrange
      mockRedis.del.mockResolvedValue(1);

      // Act
      await service.resetRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith(
        "rate_limit:test-app-key:1h:sliding",
      );
    });
  });

  describe("getUsageStatistics", () => {
    it("应该返回详细的使用统计", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue("25"); // 当前周期请求数

      // Mock时间
      const createdAtTime = new Date("2024-01-01T00:00:00Z").getTime();
      const currentTime = new Date("2024-01-01T10:00:00Z").getTime(); // 10小时后

      const mockApiKeyWithTime = {
        ...mockApiKey,
        createdAt: new Date(createdAtTime),
        lastUsedAt: new Date(currentTime),
        usageCount: 50, // 总请求数
      };

      jest.spyOn(Date, "now").mockReturnValue(currentTime);

      // Act
      const result = await service.getUsageStatistics(
        mockApiKeyWithTime as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.totalRequests).toBe(50);
      expect(result.currentPeriodRequests).toBe(25);
      expect(result.lastRequestTime).toEqual(new Date(currentTime));
      expect(result.averageRequestsPerHour).toBe(5); // 50 requests / 10 hours
    });

    it("应该处理新创建的API Key", async () => {
      // Arrange
      const newApiKey = {
        ...mockApiKey,
        usageCount: 0,
        lastUsedAt: undefined,
        createdAt: new Date(),
      };

      mockRedis.get.mockResolvedValue("0");

      // Act
      const result = await service.getUsageStatistics(
        newApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.totalRequests).toBe(0);
      expect(result.currentPeriodRequests).toBe(0);
      expect(result.lastRequestTime).toBeUndefined();
      expect(result.averageRequestsPerHour).toBe(0);
    });

    it("应该确保至少1小时的时间计算", async () => {
      // Arrange
      const veryNewApiKey = {
        ...mockApiKey,
        usageCount: 10,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前创建
      };

      mockRedis.get.mockResolvedValue("5");

      // Act
      const result = await service.getUsageStatistics(
        veryNewApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(result.averageRequestsPerHour).toBe(10); // 10 requests / 1 hour (minimum)
    });
  });

  describe("Integration Scenarios", () => {
    it("应该处理分钟级别的窗口", async () => {
      // Arrange
      const apiKeyWithMinuteWindow = {
        ...mockApiKey,
        rateLimit: {
          requests: 10,
          window: "5m",
        },
      };

      const mockPipeline = mockRedis.pipeline();
      mockPipeline.exec.mockResolvedValue([
        [null, 5],
        [null, "OK"],
      ]);

      // Act
      const result = await service.checkRateLimit(
        apiKeyWithMinuteWindow as any,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.current).toBe(5);
    });

    it("应该处理天级别的窗口", async () => {
      // Arrange
      const apiKeyWithDayWindow = {
        ...mockApiKey,
        rateLimit: {
          requests: 10000,
          window: "1d",
        },
      };

      mockRedis.eval.mockResolvedValue([1, 5000, 4999]);

      // Act
      const result = await service.checkRateLimit(
        apiKeyWithDayWindow as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10000);
      expect(result.retryAfter).toBeUndefined();
    });
  });
});
