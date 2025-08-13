/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import {
  RateLimitGuard,
  RATE_LIMITKEY,
} from "../../../../../src/auth/guards/rate-limit.guard";
import { RateLimitService } from "../../../../../src/auth/services/rate-limit.service";
import { RateLimitStrategy } from "../../../../../src/common/constants/rate-limit.constants";
import { RateLimitConfig } from "../../../../../src/auth/interfaces/rate-limit.interface";
import { ApiKeyDocument } from "../../../../../src/auth/schemas/apikey.schema";
import { Permission } from "../../../../../src/auth/enums/user-role.enum";
import { Types } from "mongoose";

// Mock createLogger
const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => mockLoggerInstance),
}));

describe("RateLimitGuard", () => {
  let guard: RateLimitGuard;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let reflector: jest.Mocked<Reflector>;
  let executionContext: jest.Mocked<ExecutionContext>;
  let request: jest.Mocked<Request>;
  let response: jest.Mocked<Response>;
  let mockLogger: any;

  const mockApiKey = {
    id: new Types.ObjectId("507f1f77bcf86cd799439011"),
    appKey: "test-app-key",
    accessToken: "test-access-token",
    name: "Test API Key",
    userId: new Types.ObjectId("607f1f77bcf86cd799439011"),
    permissions: [Permission.DATA_READ],
    rateLimit: {
      requests: 100,
      window: "1h",
    },
    isActive: true,
    usageCount: 10,
    lastUsedAt: new Date(),
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ApiKeyDocument;

  const mockRateLimitResult = {
    allowed: true,
    limit: 100,
    current: 10,
    remaining: 90,
    resetTime: Date.now() + 3600000, // 1 hour from now
    retryAfter: null,
  };

  beforeEach(async () => {
    const mockRateLimitService = {
      checkRateLimit: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    // Clear all previous calls before getting the logger
    jest.clearAllMocks();

    // Use the same mock logger instance
    mockLogger = mockLoggerInstance;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: RateLimitService, useValue: mockRateLimitService },
        { provide: Reflector, useValue: mockReflector },
      ],
    })
      .setLogger(new Logger())
      .compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    rateLimitService = module.get(RateLimitService);
    reflector = module.get(Reflector);

    // Mock execution context
    request = {
      user: mockApiKey,
      ip: "127.0.0.1",
      get: jest.fn().mockReturnValue("test-user-agent"),
    } as any;

    response = {
      setHeader: jest.fn(),
    } as any;

    executionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(response),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Also clear the logger mock calls
    if (mockLogger) {
      mockLogger.log.mockClear();
      mockLogger.error.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.debug.mockClear();
    }
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("canActivate", () => {
    it("should allow request when rate limit check passes", async () => {
      rateLimitService.checkRateLimit.mockResolvedValue(mockRateLimitResult);
      reflector.getAllAndOverride.mockReturnValue({});

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        mockApiKey,
        RateLimitStrategy.FIXEDWINDOW,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Limit",
        100,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Remaining",
        90,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Reset",
        expect.any(Number),
      );
    });

    it("should allow request when API key is not present", async () => {
      request.user = null;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it("should allow request when API key has no rate limit configuration", async () => {
      const apiKeyWithoutRateLimit = { ...mockApiKey, rateLimit: undefined };
      request.user = apiKeyWithoutRateLimit;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it("should throw HttpException when rate limit is exceeded", async () => {
      const rateLimitExceeded = {
        ...mockRateLimitResult,
        allowed: false,
        current: 101,
        remaining: 0,
        retryAfter: 3600,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitExceeded);
      reflector.getAllAndOverride.mockReturnValue({});

      await expect(guard.canActivate(executionContext)).rejects.toThrow(
        HttpException,
      );
      await expect(guard.canActivate(executionContext)).rejects.toThrow(
        "API Key请求频率超出限制",
      );

      try {
        await guard.canActivate(executionContext);
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANYREQUESTS);
        expect(error.getResponse()).toMatchObject({
          statusCode: HttpStatus.TOO_MANYREQUESTS,
          message: "API Key请求频率超出限制",
          error: "Too Many Requests",
          details: {
            limit: 100,
            current: 101,
            remaining: 0,
            resetTime: expect.any(Number),
            retryAfter: 3600,
          },
        });
      }
    });

    it("should use custom rate limit strategy from decorator", async () => {
      const config: RateLimitConfig = {
        strategy: RateLimitStrategy.SLIDING_WINDOW,
      };

      reflector.getAllAndOverride.mockReturnValue(config);
      rateLimitService.checkRateLimit.mockResolvedValue(mockRateLimitResult);

      await guard.canActivate(executionContext);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        mockApiKey,
        RateLimitStrategy.SLIDING_WINDOW,
      );
    });

    it("should set Retry-After header when rate limit is exceeded and retryAfter is provided", async () => {
      const rateLimitExceeded = {
        ...mockRateLimitResult,
        allowed: false,
        retryAfter: 300,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitExceeded);
      reflector.getAllAndOverride.mockReturnValue({});

      try {
        await guard.canActivate(executionContext);
      } catch {
        // The exception should be thrown, but headers should still be set
      }

      expect(response.setHeader).toHaveBeenCalledWith("X-API-Retry-After", 300);
    });

    it("should allow request when rate limit service throws an error", async () => {
      rateLimitService.checkRateLimit.mockRejectedValue(
        new Error("Redis connection failed"),
      );
      reflector.getAllAndOverride.mockReturnValue({});

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("频率限制检查失败"),
        expect.any(String),
        expect.objectContaining({
          appKey: "test-app-key",
          ip: "127.0.0.1",
        }),
      );
    });

    it("should re-throw HttpException when rate limit service throws HttpException", async () => {
      const httpException = new HttpException(
        "Rate limit error",
        HttpStatus.INTERNAL_SERVERERROR,
      );
      rateLimitService.checkRateLimit.mockRejectedValue(httpException);
      reflector.getAllAndOverride.mockReturnValue({});

      await expect(guard.canActivate(executionContext)).rejects.toThrow(
        httpException,
      );
    });

    it("should get rate limit configuration from method and class decorators", async () => {
      const mockConfig: RateLimitConfig = {
        strategy: RateLimitStrategy.SLIDING_WINDOW,
        skipSuccessfulRequests: true,
      };

      reflector.getAllAndOverride.mockReturnValue(mockConfig);
      rateLimitService.checkRateLimit.mockResolvedValue(mockRateLimitResult);

      await guard.canActivate(executionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(RATE_LIMIT_KEY, [
        executionContext.getHandler(),
        executionContext.getClass(),
      ]);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        mockApiKey,
        RateLimitStrategy.SLIDING_WINDOW,
      );
    });

    it("should handle missing reflector configuration gracefully", async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      rateLimitService.checkRateLimit.mockResolvedValue(mockRateLimitResult);

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        mockApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );
    });

    it("should log appropriate debug and warning messages", async () => {
      const rateLimitExceeded = {
        ...mockRateLimitResult,
        allowed: false,
        current: 101,
        remaining: 0,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitExceeded);
      reflector.getAllAndOverride.mockReturnValue({});

      try {
        await guard.canActivate(executionContext);
      } catch {
        // Expected to throw
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "执行API Key频率限制检查",
        expect.objectContaining({
          appKey: "test-app-key",
          endpoint: undefined,
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("频率限制超出"),
        expect.objectContaining({
          appKey: "test-app-key",
          limit: 100,
          current: 101,
        }),
      );
    });

    it("should handle case when API key has empty rate limit object", async () => {
      const apiKeyWithEmptyRateLimit = { ...mockApiKey, rateLimit: {} as any };
      request.user = apiKeyWithEmptyRateLimit;
      rateLimitService.checkRateLimit.mockResolvedValue(mockRateLimitResult);
      reflector.getAllAndOverride.mockReturnValue({});

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      // The guard actually checks for rateLimit existence (truthy), not specific properties
      expect(rateLimitService.checkRateLimit).toHaveBeenCalled();
    });

    it("should handle different user agent headers", async () => {
      request.get = jest.fn().mockImplementation((header: string) => {
        if (header.toLowerCase() === "user-agent")
          return "Custom-User-Agent/1.0";
        return undefined;
      });

      const rateLimitExceeded = {
        ...mockRateLimitResult,
        allowed: false,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitExceeded);
      reflector.getAllAndOverride.mockReturnValue({});

      try {
        await guard.canActivate(executionContext);
      } catch {
        // Expected to throw
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userAgent: "Custom-User-Agent/1.0",
        }),
      );
    });

    it("should handle rate limit result without retryAfter", async () => {
      const resultWithoutRetryAfter = {
        ...mockRateLimitResult,
        retryAfter: undefined,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(
        resultWithoutRetryAfter,
      );
      reflector.getAllAndOverride.mockReturnValue({});

      await guard.canActivate(executionContext);

      expect(response.setHeader).not.toHaveBeenCalledWith(
        "X-API-Retry-After",
        expect.anything(),
      );
    });

    it("should handle missing request IP", async () => {
      const requestWithoutIp = {
        ...request,
        ip: undefined,
      };
      (executionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithoutIp,
      );

      const rateLimitExceeded = {
        ...mockRateLimitResult,
        allowed: false,
      };

      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitExceeded);
      reflector.getAllAndOverride.mockReturnValue({});

      try {
        await guard.canActivate(executionContext);
      } catch {
        // Expected to throw
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ip: undefined,
        }),
      );
    });
  });

  describe("setRateLimitHeaders", () => {
    it("should set all required rate limit headers", () => {
      const result = {
        limit: 100,
        remaining: 50,
        resetTime: 1640995200000, // Unix timestamp
        retryAfter: null,
      };

      // Access private method for testing
      (guard as any).setRateLimitHeaders(response, result);

      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Limit",
        100,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Remaining",
        50,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Reset",
        1640995200,
      );
      expect(response.setHeader).not.toHaveBeenCalledWith(
        "X-API-Retry-After",
        expect.anything(),
      );
    });

    it("should set Retry-After header when retryAfter is provided", () => {
      const result = {
        limit: 100,
        remaining: 0,
        resetTime: 1640995200000,
        retryAfter: 300,
      };

      (guard as any).setRateLimitHeaders(response, result);

      expect(response.setHeader).toHaveBeenCalledWith("X-API-Retry-After", 300);
    });

    it("should handle fractional reset time correctly", () => {
      const result = {
        limit: 100,
        remaining: 25,
        resetTime: 1640995200500, // .5 seconds
        retryAfter: null,
      };

      (guard as any).setRateLimitHeaders(response, result);

      expect(response.setHeader).toHaveBeenCalledWith(
        "X-API-RateLimit-Reset",
        1640995201,
      ); // Ceil to next second
    });
  });

  describe("constructor logging", () => {
    it("should log construction message", () => {
      // Clear previous calls
      jest.clearAllMocks();

      new RateLimitGuard(rateLimitService, reflector);

      expect(mockLogger.debug).toHaveBeenCalledWith("RateLimitGuard 已实例化");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined API key gracefully", async () => {
      request.user = undefined;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it("should handle API key without required properties", async () => {
      request.user = { appKey: "test-key" } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });
  });
});
