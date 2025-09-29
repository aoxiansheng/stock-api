import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard, RATE_LIMIT_KEY, RateLimit } from '@auth/guards/rate-limit.guard';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AuthenticatedRequest } from '@auth/interfaces/authenticated-request.interface';
import { RateLimitStrategy } from '@auth/constants';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { TestingModule } from '@nestjs/testing';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let testContext: TestingModule;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
      getResponse: jest.fn(),
    }),
  } as unknown as ExecutionContext;

  const mockRequest = {
    user: {
      appKey: 'test-app-key',
      rateLimit: {
        limit: 100,
        window: '1m',
      },
    },
    url: '/api/v1/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn(),
  } as unknown as AuthenticatedRequest;

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const mockRateLimitService = {
    checkRateLimit: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeAll(async () => {
    testContext = await UnitTestSetup.createBasicTestModule({
      providers: [
        RateLimitGuard,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    });

    await testContext.init();

    guard = await UnitTestSetup.validateServiceInjection<RateLimitGuard>(
      testContext,
      RateLimitGuard,
      RateLimitGuard
    );
    reflector = UnitTestSetup.getService<jest.Mocked<Reflector>>(testContext, Reflector);
    rateLimitService = UnitTestSetup.getService<jest.Mocked<RateLimitService>>(testContext, RateLimitService);
  });

  afterAll(async () => {
    await UnitTestSetup.cleanupModule(testContext);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock behaviors
    (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
    (mockExecutionContext.switchToHttp().getResponse as jest.Mock).mockReturnValue(mockResponse);
  });

  describe('canActivate', () => {
    describe('public endpoints', () => {
      it('should allow access to public endpoints without rate limit check', async () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
      });
    });

    describe('endpoints without API key', () => {
      it('should allow access when no API key is present', async () => {
        reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic = false
        const requestWithoutApiKey = { ...mockRequest, user: undefined };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithoutApiKey);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
      });

      it('should allow access when API key has no rate limit config', async () => {
        reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic = false
        const requestWithoutRateLimit = { ...mockRequest, user: { appKey: 'test-key' } };
        (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(requestWithoutRateLimit);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
      });
    });

    describe('rate limit checking', () => {
      beforeEach(() => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // rate limit config
      });

      it('should allow access when rate limit check passes', async () => {
        const rateLimitResult = {
          allowed: true,
          limit: 100,
          current: 50,
          remaining: 50,
          resetTime: Date.now() + 60000,
          retryAfter: 0,
        };
        
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
          mockRequest.user,
          RateLimitStrategy.SLIDING_WINDOW
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Limit', 100);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Remaining', 50);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Reset', expect.any(Number));
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Type', 'API_KEY');
      });

      it('should throw HttpException when rate limit is exceeded', async () => {
        const rateLimitResult = {
          allowed: false,
          limit: 100,
          current: 105,
          remaining: -5,
          resetTime: Date.now() + 60000,
          retryAfter: 60,
        };
        
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(HttpException);
        await expect(guard.canActivate(mockExecutionContext)).rejects.toHaveProperty('status', HttpStatus.TOO_MANY_REQUESTS);
        
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Limit', 100);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Remaining', -5);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-RateLimit-Reset', expect.any(Number));
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Retry-After', 60);
      });

      it('should use custom rate limit strategy from decorator', async () => {
        const customConfig = { strategy: RateLimitStrategy.FIXED_WINDOW };

        // 重置Mock状态并重新设置
        jest.clearAllMocks();
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(customConfig); // rate limit config

        const rateLimitResult = { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 };
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        await guard.canActivate(mockExecutionContext);

        expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
          mockRequest.user,
          RateLimitStrategy.FIXED_WINDOW
        );
      });

      it('should set retry-after header when available', async () => {
        const rateLimitResult = {
          allowed: true,
          limit: 100,
          current: 50,
          remaining: 50,
          resetTime: Date.now() + 60000,
          retryAfter: 30,
        };
        
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        await guard.canActivate(mockExecutionContext);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Retry-After', 30);
      });

      it('should not set retry-after header when not available', async () => {
        const rateLimitResult = {
          allowed: true,
          limit: 100,
          current: 50,
          remaining: 50,
          resetTime: Date.now() + 60000,
          retryAfter: 0,
        };
        
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        await guard.canActivate(mockExecutionContext);

        expect(mockResponse.setHeader).not.toHaveBeenCalledWith('X-API-Retry-After', expect.anything());
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // rate limit config
      });

      it('should allow access when rate limit service throws an error', async () => {
        rateLimitService.checkRateLimit.mockRejectedValue(new Error('Rate limit service error'));

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });

      it('should re-throw HttpException from rate limit service', async () => {
        const httpException = new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
        rateLimitService.checkRateLimit.mockRejectedValue(httpException);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(HttpException);
        await expect(guard.canActivate(mockExecutionContext)).rejects.toHaveProperty('status', HttpStatus.TOO_MANY_REQUESTS);
      });

      it('should handle rate limit service returning null or undefined', async () => {
        rateLimitService.checkRateLimit.mockResolvedValue(null as any);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle missing response object', async () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // rate limit config

        const rateLimitResult = { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 };
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        (mockExecutionContext.switchToHttp().getResponse as jest.Mock).mockReturnValue(undefined);

        // Should not throw error even without response object
        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should handle response setHeader throwing errors', async () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // rate limit config

        const rateLimitResult = { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 };
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        mockResponse.setHeader.mockImplementation(() => {
          throw new Error('Header set error');
        });

        // Should not throw error even if setting headers fails
        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });

      it('should handle reflector returning undefined for public check', async () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // isPublic = undefined (falsy)
          .mockReturnValueOnce(undefined); // rate limit config

        const rateLimitResult = { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 };
        rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(rateLimitService.checkRateLimit).toHaveBeenCalled();
      });
    });
  });

  describe('RateLimit decorator', () => {
    it('should create rate limit decorator with default config', () => {
      const decorator = RateLimit();
      
      expect(decorator).toBeDefined();
    });

    it('should create rate limit decorator with custom config', () => {
      const config = { strategy: RateLimitStrategy.FIXED_WINDOW, limit: 50 };
      const decorator = RateLimit(config);
      
      expect(decorator).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should work with different execution contexts', async () => {
      const wsContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToWs: jest.fn().mockReturnValue({
          getClient: jest.fn().mockReturnValue({}),
        }),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic = false
        .mockReturnValueOnce(undefined); // rate limit config

      const rateLimitResult = { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 };
      rateLimitService.checkRateLimit.mockResolvedValue(rateLimitResult);

      const result = await guard.canActivate(wsContext);

      expect(result).toBe(true);
    });

    it('should handle concurrent requests properly', async () => {
      // 清除之前的Mock设置
      jest.clearAllMocks();

      const rateLimitResults = [
        { allowed: true, limit: 100, current: 50, remaining: 50, resetTime: Date.now() + 60000, retryAfter: 0 },
        { allowed: true, limit: 100, current: 51, remaining: 49, resetTime: Date.now() + 60000, retryAfter: 0 },
        { allowed: false, limit: 100, current: 105, remaining: -5, resetTime: Date.now() + 60000, retryAfter: 60 },
      ];

      // 为每个请求单独设置Mock
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic = false (第一次调用)
        .mockReturnValueOnce(undefined) // rate limit config (第一次调用)
        .mockReturnValueOnce(false) // isPublic = false (第二次调用)
        .mockReturnValueOnce(undefined) // rate limit config (第二次调用)
        .mockReturnValueOnce(false) // isPublic = false (第三次调用)
        .mockReturnValueOnce(undefined); // rate limit config (第三次调用)

      rateLimitService.checkRateLimit
        .mockResolvedValueOnce(rateLimitResults[0])
        .mockResolvedValueOnce(rateLimitResults[1])
        .mockResolvedValueOnce(rateLimitResults[2]);

      // First request
      const result1 = await guard.canActivate(mockExecutionContext);
      expect(result1).toBe(true);

      // Second request
      const result2 = await guard.canActivate(mockExecutionContext);
      expect(result2).toBe(true);

      // Third request (rate limited)
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(HttpException);
    });
  });
});