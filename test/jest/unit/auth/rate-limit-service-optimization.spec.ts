import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
} from "@nestjs/common";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { RateLimitService } from "../../../../src/auth/services/rate-limit.service";
import { RateLimitStrategy } from "../../../../src/common/constants/rate-limit.constants";
import {
  RATE_LIMIT_OPERATIONS,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_LUA_SCRIPTS,
  RateLimitTemplateUtil,
} from "../../../../src/common/constants/rate-limit.constants";

describe("RateLimitService Optimization Features", () => {
  let service: RateLimitService;
  let redisService: jest.Mocked<RedisService>;
  let mockRedis: any;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockRedis = {
      pipeline: jest.fn().mockReturnValue({
        incr: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, "OK"],
        ]),
      }),
      eval: jest.fn(),
      get: jest.fn(),
      zcard: jest.fn(),
      zrange: jest.fn(),
      del: jest.fn(),
    };

    const mockRedisService = {
      getOrThrow: jest.fn().mockReturnValue(mockRedis),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    redisService = module.get(RedisService);

    // Spy on logger
    loggerSpy = jest
      .spyOn((service as any).logger, "debug")
      .mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use operation constants for all methods", () => {
      expect(RATE_LIMIT_OPERATIONS.CHECK_RATE_LIMIT).toBe("checkRateLimit");
      expect(RATE_LIMIT_OPERATIONS.CHECK_FIXED_WINDOW).toBe("checkFixedWindow");
      expect(RATE_LIMIT_OPERATIONS.CHECK_SLIDING_WINDOW).toBe(
        "checkSlidingWindow",
      );
      expect(RATE_LIMIT_OPERATIONS.RESET_RATE_LIMIT).toBe("resetRateLimit");
    });

    it("should use message constants for logging", () => {
      expect(RATE_LIMIT_MESSAGES.RATE_LIMIT_CHECK_STARTED).toBe("检查频率限制");
      expect(RATE_LIMIT_MESSAGES.FIXED_WINDOW_CHECK).toBe("固定窗口检查");
      expect(RATE_LIMIT_MESSAGES.SLIDING_WINDOW_CHECK).toBe("滑动窗口检查");
      expect(RATE_LIMIT_MESSAGES.RATE_LIMIT_RESET).toBe(
        "重置API Key的频率限制计数器",
      );
    });

    it("should use Lua script constants", () => {
      expect(RATE_LIMIT_LUA_SCRIPTS.SLIDING_WINDOW).toContain(
        "local key = KEYS[1]",
      );
      expect(RATE_LIMIT_LUA_SCRIPTS.SLIDING_WINDOW).toContain(
        "ZREMRANGEBYSCORE",
      );
      expect(RATE_LIMIT_LUA_SCRIPTS.SLIDING_WINDOW).toContain("ZCARD");
    });
  });

  describe("Enhanced Rate Limit Checking", () => {
    const mockApiKey = {
      appKey: "test-app-key",
      rateLimit: {
        requests: 100,
        window: "1h",
      },
      usageCount: 50,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    };

    it("should use constants for rate limit check start logging", async () => {
      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.RATE_LIMIT_CHECK_STARTED,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_RATE_LIMIT,
          appKey: "test-app-key",
          strategy: RateLimitStrategy.FIXED_WINDOW,
        }),
      );
    });

    it("should use constants for fixed window check logging", async () => {
      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.FIXED_WINDOW_CHECK,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_FIXED_WINDOW,
        }),
      );
    });

    it("should use constants for sliding window check logging", async () => {
      mockRedis.eval.mockResolvedValue([1, 1, 99, 0]);

      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.SLIDING_WINDOW_CHECK,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_SLIDING_WINDOW,
        }),
      );
    });

    it("should use template utility for unsupported strategy error", async () => {
      await expect(
        service.checkRateLimit(
          mockApiKey as any,
          "UNSUPPORTED_STRATEGY" as any,
        ),
      ).rejects.toThrow(BadRequestException);

      // The error message should be generated using the template utility
      try {
        await service.checkRateLimit(
          mockApiKey as any,
          "UNSUPPORTED_STRATEGY" as any,
        );
      } catch (error) {
        expect(error.message).toContain("不支持的频率限制策略");
        expect(error.message).toContain("UNSUPPORTED_STRATEGY");
      }
    });

    it("should use constants for rate limit check failure logging and fail open", async () => {
      const errorSpy = jest.spyOn((service as any).logger, "error");
      const warnSpy = jest.spyOn((service as any).logger, "warn");
      const mockError = new Error("Redis error");

      (redisService.getOrThrow as jest.Mock).mockImplementation(() => {
        const mockPipeline = {
          incr: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(mockError),
        };
        const mockRedis = {
          pipeline: jest.fn().mockReturnValue(mockPipeline),
        };
        return mockRedis as any;
      });

      const result = await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      expect(result.allowed).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        "限流服务异常，启用fail-open模式允许请求通过",
        expect.any(Object),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.RATE_LIMIT_CHECK_FAILED,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_RATE_LIMIT,
          error: expect.stringContaining("Redis error"),
        }),
      );
    });
  });

  describe("Enhanced Fixed Window Algorithm", () => {
    it("should use constants for exceeded limit warning", async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();
      const mockApiKey = {
        appKey: "test-app-key",
        rateLimit: { requests: 5, window: "1h" },
      };

      // Mock pipeline to return count exceeding limit
      mockRedis.pipeline.mockReturnValue({
        incr: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 6],
          [null, "OK"],
        ]), // 6 > 5 limit
      });

      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.FIXED_WINDOW_EXCEEDED,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_FIXED_WINDOW,
          current: 6,
          limit: 5,
        }),
      );
    });
  });

  describe("Enhanced Sliding Window Algorithm", () => {
    it("should use Lua script constants", async () => {
      const mockApiKey = {
        appKey: "test-app-key",
        rateLimit: { requests: 100, window: "1h" },
      };

      mockRedis.eval.mockResolvedValue([1, 1, 99, 0]);

      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      expect(mockRedis.eval).toHaveBeenCalledWith(
        RATE_LIMIT_LUA_SCRIPTS.SLIDING_WINDOW,
        1,
        expect.any(String), // sliding key
        expect.any(String), // current time
        expect.any(String), // window seconds
        expect.any(String), // limit
        expect.any(String), // expire buffer
      );
    });

    it("should use constants for exceeded limit warning", async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();
      const mockApiKey = {
        appKey: "test-app-key",
        rateLimit: { requests: 5, window: "1h" },
      };

      // Mock Lua script to return denied request
      mockRedis.eval.mockResolvedValue([0, 6, 0, 3600]); // denied, current=6, remaining=0, retry_after=3600

      await service.checkRateLimit(
        mockApiKey as any,
        RateLimitStrategy.SLIDING_WINDOW,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.SLIDING_WINDOW_EXCEEDED,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.CHECK_SLIDING_WINDOW,
          current: 6,
          limit: 5,
        }),
      );
    });
  });

  describe("Enhanced Time Window Parsing", () => {
    it("should use template utility for invalid window format error", () => {
      expect(() => {
        (service as any).parseWindowToSeconds("invalid");
      }).toThrow(BadRequestException);

      try {
        (service as any).parseWindowToSeconds("invalid");
      } catch (error) {
        expect(error.message).toContain("无效的时间窗口格式");
        expect(error.message).toContain("invalid");
      }
    });

    it("should use template utility for unsupported time unit error", () => {
      // '1x' doesn't match the regex pattern, so it throws BadRequestException for invalid format
      expect(() => {
        (service as any).parseWindowToSeconds("1x");
      }).toThrow(BadRequestException);

      try {
        (service as any).parseWindowToSeconds("1x");
      } catch (error) {
        expect(error.message).toContain("无效的时间窗口格式");
        expect(error.message).toContain("1x");
      }
    });

    it("should use time multiplier constants for parsing", () => {
      expect((service as any).parseWindowToSeconds("1s")).toBe(1);
      expect((service as any).parseWindowToSeconds("1m")).toBe(60);
      expect((service as any).parseWindowToSeconds("1h")).toBe(3600);
      expect((service as any).parseWindowToSeconds("1d")).toBe(86400);
    });
  });

  describe("Enhanced Rate Limit Reset", () => {
    const mockApiKey = {
      appKey: "test-app-key",
      rateLimit: { requests: 100, window: "1h" },
    };

    it("should use constants for successful reset logging", async () => {
      const logSpy = jest
        .spyOn((service as any).logger, "log")
        .mockImplementation();
      mockRedis.del.mockResolvedValue(1);

      await service.resetRateLimit(
        mockApiKey as any,
        RateLimitStrategy.FIXED_WINDOW,
      );

      expect(logSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.RATE_LIMIT_RESET,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.RESET_RATE_LIMIT,
          appKey: "test-app-key",
          strategy: RateLimitStrategy.FIXED_WINDOW,
        }),
      );
    });

    it("should use constants for unsupported strategy warning", async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      await service.resetRateLimit(
        mockApiKey as any,
        "UNSUPPORTED_STRATEGY" as any,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        RATE_LIMIT_MESSAGES.UNSUPPORTED_STRATEGY_RESET,
        expect.objectContaining({
          operation: RATE_LIMIT_OPERATIONS.RESET_RATE_LIMIT,
          appKey: "test-app-key",
          strategy: "UNSUPPORTED_STRATEGY",
        }),
      );
    });
  });

  describe("Template Utility Functions", () => {
    it("should generate error messages using templates", () => {
      const message = RateLimitTemplateUtil.generateErrorMessage(
        "UNSUPPORTED_STRATEGY",
        {
          strategy: "INVALID_STRATEGY",
        },
      );

      expect(message).toBe("不支持的频率限制策略: INVALID_STRATEGY");
    });

    it("should generate error messages for invalid window format", () => {
      const message = RateLimitTemplateUtil.generateErrorMessage(
        "INVALID_WINDOW_FORMAT",
        {
          window: "invalid_format",
        },
      );

      expect(message).toContain("无效的时间窗口格式: invalid_format");
      expect(message).toContain("期望格式如: 1s, 5m, 1h, 1d");
    });

    it("should generate error messages for unsupported time unit", () => {
      const message = RateLimitTemplateUtil.generateErrorMessage(
        "UNSUPPORTED_TIME_UNIT",
        {
          unit: "x",
        },
      );

      expect(message).toContain("不支持的时间单位: x");
      expect(message).toContain("支持的单位: s(秒), m(分), h(时), d(天)");
    });

    it("should validate window format correctly", () => {
      expect(RateLimitTemplateUtil.isValidWindowFormat("1s")).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat("60m")).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat("24h")).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat("7d")).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat("invalid")).toBe(false);
      expect(RateLimitTemplateUtil.isValidWindowFormat("1x")).toBe(false);
    });

    it("should validate app key format correctly", () => {
      expect(RateLimitTemplateUtil.isValidAppKey("valid-app-key")).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey("valid_app_key")).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey("validappkey123")).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey("ab")).toBe(false); // too short
      expect(RateLimitTemplateUtil.isValidAppKey("invalid@key")).toBe(false); // invalid chars
    });
  });
});
