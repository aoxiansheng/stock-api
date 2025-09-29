import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StreamRateLimitGuard, STREAM_RATE_LIMIT_KEY } from '@core/03-fetching/stream-data-fetcher/guards/stream-rate-limit.guard';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { HttpRateLimitConfig } from '@core/03-fetching/stream-data-fetcher/interfaces/rate-limit.interfaces';

describe('StreamRateLimitGuard', () => {
  let guard: StreamRateLimitGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  const createMockRequest = (overrides: any = {}): any => ({
    url: '/api/test',
    headers: {
      'user-agent': 'test-agent',
      ...(overrides.headers || {})
    },
    connection: {
      remoteAddress: '192.168.1.100'
    },
    user: null,
    ...overrides
  });

  const createMockContext = (request = createMockRequest()): ExecutionContext => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request)
    }),
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn()
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamRateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn()
          }
        }
      ]
    }).compile();

    guard = module.get<StreamRateLimitGuard>(StreamRateLimitGuard);
    reflector = module.get<Reflector>(Reflector);

    mockRequest = createMockRequest();
    mockContext = createMockContext(mockRequest);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Guard Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(guard).toBeDefined();
      expect(guard.getStats().totalActiveIPs).toBe(0);
      expect(guard.getStats().totalActiveUsers).toBe(0);
    });

    it('should schedule cleanup timer on initialization', () => {
      jest.spyOn(global, 'setTimeout');
      const newGuard = new StreamRateLimitGuard(reflector);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
  });

  describe('canActivate', () => {
    describe('Basic Flow', () => {
      it('should allow request when all limits are within bounds', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(null);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should use decorator configuration when available', async () => {
        const customConfig: HttpRateLimitConfig = {
          enabled: true,
          limit: 5,
          windowMs: 30000,
          ttl: 30,
          perIP: true,
          perUser: false
        };

        jest.spyOn(reflector, 'get').mockReturnValue(customConfig);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(STREAM_RATE_LIMIT_KEY, expect.any(Object));
      });
    });

    describe('Destroyed Guard Protection', () => {
      it('should reject requests when guard is destroyed', async () => {
        // Destroy the guard
        guard.onModuleDestroy();

        await expect(guard.canActivate(mockContext)).rejects.toThrow();

        try {
          await guard.canActivate(mockContext);
        } catch (error) {
          expect(error.message).toContain('Stream rate limit guard service is unavailable');
          expect(error.context.guardDestroyed).toBe(true);
        }
      });
    });

    describe('IP Rate Limiting', () => {
      it('should enforce IP rate limits', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 2,
          windowMs: 60000,
          ttl: 60,
          perIP: true,
          perUser: false
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        // First two requests should pass
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        // Third request should fail
        await expect(guard.canActivate(mockContext)).rejects.toThrow();

        try {
          await guard.canActivate(mockContext);
        } catch (error) {
          expect(error.context.limitType).toBe('ip_rate_limit');
          expect(error.context.clientIP).toBe('192.168.1.100');
        }
      });

      it('should reset IP rate limit after time window', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 1,
          windowMs: 1000,
          ttl: 1,
          perIP: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);
        jest.useFakeTimers();

        // First request should pass
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        // Second request should fail immediately
        await expect(guard.canActivate(mockContext)).rejects.toThrow();

        // Fast forward past the time window
        jest.advanceTimersByTime(1100);

        // Request should now pass again
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        jest.useRealTimers();
      });

      it('should handle different IPs independently', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 1,
          windowMs: 60000,
          ttl: 60,
          perIP: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        const request1 = createMockRequest({ connection: { remoteAddress: '192.168.1.100' } });
        const request2 = createMockRequest({ connection: { remoteAddress: '192.168.1.101' } });

        const context1 = createMockContext(request1);
        const context2 = createMockContext(request2);

        // Both first requests should pass
        await expect(guard.canActivate(context1)).resolves.toBe(true);
        await expect(guard.canActivate(context2)).resolves.toBe(true);

        // Both second requests should fail
        await expect(guard.canActivate(context1)).rejects.toThrow();
        await expect(guard.canActivate(context2)).rejects.toThrow();
      });
    });

    describe('User Rate Limiting', () => {
      it('should enforce user rate limits when user is present', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 2,
          windowMs: 60000,
          ttl: 60,
          perIP: false,
          perUser: true
        };

        const requestWithUser = createMockRequest({
          user: { id: 'user123' }
        });
        const contextWithUser = createMockContext(requestWithUser);

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        // First two requests should pass
        await expect(guard.canActivate(contextWithUser)).resolves.toBe(true);
        await expect(guard.canActivate(contextWithUser)).resolves.toBe(true);

        // Third request should fail
        await expect(guard.canActivate(contextWithUser)).rejects.toThrow();

        try {
          await guard.canActivate(contextWithUser);
        } catch (error) {
          expect(error.context.limitType).toBe('user_rate_limit');
          expect(error.context.userId).toBe('user123');
        }
      });

      it('should skip user rate limiting when no user is present', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 1,
          windowMs: 60000,
          ttl: 60,
          perIP: false,
          perUser: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        // Multiple requests should pass since no user to limit
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      });

      it('should handle different users independently', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 1,
          windowMs: 60000,
          ttl: 60,
          perIP: false,
          perUser: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        const request1 = createMockRequest({ user: { id: 'user1' } });
        const request2 = createMockRequest({ user: { id: 'user2' } });

        const context1 = createMockContext(request1);
        const context2 = createMockContext(request2);

        // Both first requests should pass
        await expect(guard.canActivate(context1)).resolves.toBe(true);
        await expect(guard.canActivate(context2)).resolves.toBe(true);

        // Both second requests should fail
        await expect(guard.canActivate(context1)).rejects.toThrow();
        await expect(guard.canActivate(context2)).rejects.toThrow();
      });
    });

    describe('Burst Limiting', () => {
      it('should enforce burst limits', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 100,
          windowMs: 60000,
          ttl: 60,
          burst: 2,
          perIP: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        // First two requests should pass (within burst limit)
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        // Third request should fail due to burst limit
        await expect(guard.canActivate(mockContext)).rejects.toThrow();

        try {
          await guard.canActivate(mockContext);
        } catch (error) {
          expect(error.context.limitType).toBe('burst_limit');
          expect(error.message).toContain('Too many burst requests');
        }
      });

      it('should reset burst counter after burst window', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 100,
          windowMs: 60000,
          ttl: 60,
          burst: 1,
          perIP: true
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);
        jest.useFakeTimers();

        // First request should pass
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        // Second request should fail due to burst limit
        await expect(guard.canActivate(mockContext)).rejects.toThrow();

        // Fast forward past burst window (10 seconds)
        jest.advanceTimersByTime(11000);

        // Request should now pass again
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);

        jest.useRealTimers();
      });

      it('should skip burst limiting when burst is not configured', async () => {
        const config: HttpRateLimitConfig = {
          enabled: true,
          limit: 100,
          windowMs: 60000,
          ttl: 60,
          perIP: true
          // No burst configured
        };

        jest.spyOn(reflector, 'get').mockReturnValue(config);

        // Multiple rapid requests should pass
        for (let i = 0; i < 10; i++) {
          await expect(guard.canActivate(mockContext)).resolves.toBe(true);
        }
      });
    });
  });

  describe('Client IP Extraction', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const requestWithForwarded = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          'user-agent': 'test-agent'
        }
      });
      const contextWithForwarded = createMockContext(requestWithForwarded);

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      await guard.canActivate(contextWithForwarded);

      // Trigger rate limit to see the IP in error
      await expect(guard.canActivate(contextWithForwarded)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithForwarded);
      } catch (error) {
        expect(error.context.clientIP).toBe('203.0.113.1');
      }
    });

    it('should extract IP from X-Real-IP header when X-Forwarded-For is not present', async () => {
      const requestWithRealIP = createMockRequest({
        headers: {
          'x-real-ip': '203.0.113.2',
          'user-agent': 'test-agent'
        }
      });
      const contextWithRealIP = createMockContext(requestWithRealIP);

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      await guard.canActivate(contextWithRealIP);

      await expect(guard.canActivate(contextWithRealIP)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithRealIP);
      } catch (error) {
        expect(error.context.clientIP).toBe('203.0.113.2');
      }
    });

    it('should fall back to connection remote address', async () => {
      const requestWithoutHeaders = createMockRequest({
        headers: {
          'user-agent': 'test-agent'
        },
        connection: {
          remoteAddress: '192.168.1.200'
        }
      });
      const contextWithoutHeaders = createMockContext(requestWithoutHeaders);

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      await guard.canActivate(contextWithoutHeaders);

      await expect(guard.canActivate(contextWithoutHeaders)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithoutHeaders);
      } catch (error) {
        expect(error.context.clientIP).toBe('192.168.1.200');
      }
    });

    it('should handle unknown IP when no IP sources are available', async () => {
      const requestWithNoIP = createMockRequest({
        headers: { 'user-agent': 'test-agent' },
        connection: null,
        socket: null
      });
      const contextWithNoIP = createMockContext(requestWithNoIP);

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      await guard.canActivate(contextWithNoIP);

      await expect(guard.canActivate(contextWithNoIP)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithNoIP);
      } catch (error) {
        expect(error.context.clientIP).toBe('unknown');
      }
    });
  });

  describe('User ID Extraction', () => {
    it('should extract user ID from request.user', async () => {
      const requestWithUser = createMockRequest({
        user: { id: 'user456' }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithUser = createMockContext(requestWithUser);

      await guard.canActivate(contextWithUser);

      await expect(guard.canActivate(contextWithUser)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithUser);
      } catch (error) {
        expect(error.context.userId).toBe('user456');
      }
    });

    it('should extract user ID from API key header', async () => {
      const requestWithApiKey = createMockRequest({
        headers: {
          'x-app-key': 'api_key_12345678901234567890',
          'user-agent': 'test-agent'
        }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithApiKey = createMockContext(requestWithApiKey);

      await guard.canActivate(contextWithApiKey);

      await expect(guard.canActivate(contextWithApiKey)).rejects.toThrow();

      try {
        await guard.canActivate(contextWithApiKey);
      } catch (error) {
        expect(error.context.userId).toBe('api_key_api_key_');
      }
    });

    it('should return null when no user identification is available', async () => {
      const requestWithoutUser = createMockRequest();

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 10,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithoutUser = createMockContext(requestWithoutUser);

      const result = await guard.canActivate(contextWithoutUser);
      expect(result).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should mark guard as destroyed and clear all resources', () => {
      // Add some test data first
      const stats = guard.getStats();
      expect(stats.totalActiveIPs).toBe(0);

      // Call destroy
      guard.onModuleDestroy();

      // Should clear all counters
      const statsAfterDestroy = guard.getStats();
      expect(statsAfterDestroy.totalActiveIPs).toBe(0);
      expect(statsAfterDestroy.totalActiveUsers).toBe(0);
    });

    it('should prevent timer scheduling after destruction', () => {
      jest.spyOn(global, 'clearTimeout');

      guard.onModuleDestroy();

      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = guard.getStats();

      expect(stats).toHaveProperty('ipCounters');
      expect(stats).toHaveProperty('userCounters');
      expect(stats).toHaveProperty('totalActiveIPs');
      expect(stats).toHaveProperty('totalActiveUsers');

      expect(Array.isArray(stats.ipCounters)).toBe(true);
      expect(Array.isArray(stats.userCounters)).toBe(true);
      expect(typeof stats.totalActiveIPs).toBe('number');
      expect(typeof stats.totalActiveUsers).toBe('number');
    });

    it('should include counter details with timestamps', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 10,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Make a request to create some counter data
      await guard.canActivate(mockContext);

      const stats = guard.getStats();

      if (stats.ipCounters.length > 0) {
        const counter = stats.ipCounters[0];
        expect(counter).toHaveProperty('ip');
        expect(counter).toHaveProperty('count');
        expect(counter).toHaveProperty('burstCount');
        expect(counter).toHaveProperty('lastReset');
        expect(counter).toHaveProperty('lastBurst');
        expect(counter).toHaveProperty('age');
        expect(typeof counter.age).toBe('number');
      }
    });
  });

  describe('resetLimits', () => {
    it('should reset IP limits', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Exhaust the limit
      await guard.canActivate(mockContext);
      await expect(guard.canActivate(mockContext)).rejects.toThrow();

      // Reset the limit
      const result = guard.resetLimits('ip', '192.168.1.100');
      expect(result).toBe(true);

      // Should now be able to make requests again
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it('should reset user limits', async () => {
      const requestWithUser = createMockRequest({
        user: { id: 'testuser' }
      });
      const contextWithUser = createMockContext(requestWithUser);

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Exhaust the limit
      await guard.canActivate(contextWithUser);
      await expect(guard.canActivate(contextWithUser)).rejects.toThrow();

      // Reset the limit
      const result = guard.resetLimits('user', 'testuser');
      expect(result).toBe(true);

      // Should now be able to make requests again
      await expect(guard.canActivate(contextWithUser)).resolves.toBe(true);
    });

    it('should return false when resetting non-existent limits', () => {
      const result = guard.resetLimits('ip', 'non-existent-ip');
      expect(result).toBe(false);
    });
  });

  describe('Cleanup Process', () => {
    it('should schedule periodic cleanup and not crash when destroyed', () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');

      // Create new guard to test cleanup scheduling
      const testGuard = new StreamRateLimitGuard(reflector);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

      // Destroy guard
      testGuard.onModuleDestroy();

      // Advance timers - should not cause errors
      jest.advanceTimersByTime(60000);

      jest.useRealTimers();
    });

    it('should clean up expired counters during periodic cleanup', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 10,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      jest.useFakeTimers();

      // Make some requests to create counters
      await guard.canActivate(mockContext);

      // Fast forward past expiration threshold (10 minutes + some buffer)
      jest.advanceTimersByTime(11 * 60 * 1000);

      // The cleanup should have removed expired counters
      const stats = guard.getStats();
      expect(stats.totalActiveIPs).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions during rate limiting gracefully', async () => {
      // Mock the context to return undefined request
      const brokenContext = {
        ...mockContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(undefined)
        })
      };

      jest.spyOn(reflector, 'get').mockReturnValue(null);

      // Should throw error but not crash the application
      await expect(guard.canActivate(brokenContext as ExecutionContext)).rejects.toThrow();
    });

    it('should log DoS attack attempts with full context', async () => {
      const loggerSpy = jest.spyOn((guard as any).logger, 'error');

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Exhaust limit and trigger DoS protection
      await guard.canActivate(mockContext);

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        // Should have logged the DoS attempt
        expect(loggerSpy).toHaveBeenCalledWith(
          'DoS防护触发',
          expect.objectContaining({
            clientIP: expect.any(String),
            endpoint: expect.any(String),
            userAgent: expect.any(String),
            error: expect.any(String),
            timestamp: expect.any(String)
          })
        );
      }
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle zero limits gracefully', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 0,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Should immediately fail since limit is 0
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });

    it('should handle disabled rate limiting', async () => {
      const config: HttpRateLimitConfig = {
        enabled: false,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Should allow all requests when disabled
      for (let i = 0; i < 10; i++) {
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      }
    });

    it('should handle very short time windows', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 2,
        windowMs: 100,
        ttl: 0.1,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      jest.useFakeTimers();

      // Make requests up to limit
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Should fail
      await expect(guard.canActivate(mockContext)).rejects.toThrow();

      // Fast forward past window
      jest.advanceTimersByTime(150);

      // Should work again
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);

      jest.useRealTimers();
    });

    it('should handle configuration with no burst limit set', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 100,
        windowMs: 60000,
        ttl: 60,
        perIP: true,
        burst: undefined // No burst limit
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Should allow many rapid requests without burst limiting
      for (let i = 0; i < 15; i++) {
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      }
    });

    it('should handle both perIP and perUser disabled', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: false,
        perUser: false
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Should allow all requests when both per-IP and per-user are disabled
      for (let i = 0; i < 10; i++) {
        await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      }
    });
  });

  describe('Advanced Scenarios', () => {
    it('should handle mixed IPv4 and IPv6 addresses', async () => {
      const ipv4Request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });
      const ipv6Request = createMockRequest({
        headers: { 'x-forwarded-for': '::1' }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      const ipv4Context = createMockContext(ipv4Request);
      const ipv6Context = createMockContext(ipv6Request);

      // Both should be allowed initially
      await expect(guard.canActivate(ipv4Context)).resolves.toBe(true);
      await expect(guard.canActivate(ipv6Context)).resolves.toBe(true);

      // Both should be rate limited independently
      await expect(guard.canActivate(ipv4Context)).rejects.toThrow();
      await expect(guard.canActivate(ipv6Context)).rejects.toThrow();
    });

    it('should handle socket vs connection remote address fallback', async () => {
      const requestWithSocket = createMockRequest({
        connection: null,
        socket: { remoteAddress: '10.0.0.5' }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithSocket = createMockContext(requestWithSocket);

      await guard.canActivate(contextWithSocket);

      try {
        await guard.canActivate(contextWithSocket);
      } catch (error) {
        expect(error.context.clientIP).toBe('10.0.0.5');
      }
    });

    it('should handle user ID extraction from numeric user ID', async () => {
      const requestWithNumericUser = createMockRequest({
        user: { id: 12345 } // Numeric user ID
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithNumericUser = createMockContext(requestWithNumericUser);

      await guard.canActivate(contextWithNumericUser);

      try {
        await guard.canActivate(contextWithNumericUser);
      } catch (error) {
        expect(error.context.userId).toBe('12345');
      }
    });

    it('should handle whitespace trimming in IP headers', async () => {
      const requestWithWhitespace = createMockRequest({
        headers: {
          'x-forwarded-for': '  203.0.113.5  , 198.51.100.1  ',
          'user-agent': 'test-agent'
        }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithWhitespace = createMockContext(requestWithWhitespace);

      await guard.canActivate(contextWithWhitespace);

      try {
        await guard.canActivate(contextWithWhitespace);
      } catch (error) {
        expect(error.context.clientIP).toBe('203.0.113.5');
      }
    });

    it('should handle API key extraction with short keys', async () => {
      const requestWithShortApiKey = createMockRequest({
        headers: {
          'x-app-key': '123', // Very short API key
          'user-agent': 'test-agent'
        }
      });

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithShortKey = createMockContext(requestWithShortApiKey);

      await guard.canActivate(contextWithShortKey);

      try {
        await guard.canActivate(contextWithShortKey);
      } catch (error) {
        expect(error.context.userId).toBe('api_key_123');
      }
    });
  });

  describe('Memory Management Deep Testing', () => {
    it('should clean up old counters during periodic cleanup', async () => {
      jest.useFakeTimers();

      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 10,
        windowMs: 60000,
        ttl: 60,
        perIP: true,
        perUser: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // Create multiple IP and user counters
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest({
          connection: { remoteAddress: `192.168.1.${100 + i}` },
          user: { id: `user${i}` }
        });
        const context = createMockContext(request);
        await guard.canActivate(context);
      }

      // Verify counters exist
      const statsBefore = guard.getStats();
      expect(statsBefore.totalActiveIPs).toBe(5);
      expect(statsBefore.totalActiveUsers).toBe(5);

      // Fast forward past expiration threshold (10 minutes + buffer)
      jest.advanceTimersByTime(12 * 60 * 1000);

      // Verify counters have been cleaned up
      const statsAfter = guard.getStats();
      expect(statsAfter.totalActiveIPs).toBe(0);
      expect(statsAfter.totalActiveUsers).toBe(0);

      jest.useRealTimers();
    });

    it('should handle cleanup timer being called after destruction', () => {
      jest.useFakeTimers();

      // Destroy the guard
      guard.onModuleDestroy();

      // Advance time to trigger cleanup
      expect(() => {
        jest.advanceTimersByTime(60000);
      }).not.toThrow();

      jest.useRealTimers();
    });

    it('should not schedule new cleanup timers after destruction', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Create new guard to test scheduling
      const testGuard = new StreamRateLimitGuard(reflector);
      const initialTimeoutCalls = setTimeoutSpy.mock.calls.length;

      // Destroy the guard
      testGuard.onModuleDestroy();

      // Simulate internal cleanup call
      const scheduleMethod = (testGuard as any).scheduleNextCleanup;
      scheduleMethod.call(testGuard);

      // Should not have made additional setTimeout calls
      expect(setTimeoutSpy.mock.calls.length).toBe(initialTimeoutCalls);
    });
  });

  describe('Burst Limiting Edge Cases', () => {
    it('should handle zero burst limit', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 100,
        windowMs: 60000,
        ttl: 60,
        burst: 0,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // First request should fail immediately with zero burst
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });

    it('should handle burst checking when no counter exists initially', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 100,
        windowMs: 60000,
        ttl: 60,
        burst: 5,
        perIP: true
      };

      jest.spyOn(reflector, 'get').mockReturnValue(config);

      // First request should create counter and pass
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);

      // Check that burst counter was initialized
      const checkBurstMethod = (guard as any).checkBurstLimit;
      const result = checkBurstMethod.call(guard, '192.168.1.100', config);
      expect(result).toBe(true); // Should work since we haven't exceeded burst yet
    });
  });

  describe('Exception Context Completeness', () => {
    it('should include complete context in IP rate limit exceptions', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perIP: true
      };

      const requestWithDetails = createMockRequest({
        url: '/api/stream/connect',
        headers: {
          'user-agent': 'TestClient/1.0',
          'x-forwarded-for': '203.0.113.10'
        },
        user: { id: 'user789' }
      });

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithDetails = createMockContext(requestWithDetails);

      // Exhaust limit
      await guard.canActivate(contextWithDetails);

      try {
        await guard.canActivate(contextWithDetails);
        fail('Expected exception to be thrown');
      } catch (error) {
        expect(error.context).toEqual(
          expect.objectContaining({
            clientIP: '203.0.113.10',
            userId: 'user789',
            endpoint: '/api/stream/connect',
            userAgent: 'TestClient/1.0',
            limitType: 'ip_rate_limit'
          })
        );
      }
    });

    it('should include operation context in all exception types', async () => {
      const config: HttpRateLimitConfig = {
        enabled: true,
        limit: 1,
        windowMs: 60000,
        ttl: 60,
        perUser: true,
        burst: 1
      };

      const requestWithUser = createMockRequest({
        user: { id: 'testuser' }
      });

      jest.spyOn(reflector, 'get').mockReturnValue(config);
      const contextWithUser = createMockContext(requestWithUser);

      // Test user rate limit exception
      await guard.canActivate(contextWithUser);

      try {
        await guard.canActivate(contextWithUser);
      } catch (error) {
        expect(error.component).toBe(ComponentIdentifier.STREAM_DATA_FETCHER);
        expect(error.operation).toBe('canActivate');
        expect(error.context.limitType).toBe('user_rate_limit');
      }
    });
  });
});

describe('Decorator Integration', () => {
  it('should work correctly with the rate limit decorator', () => {
    // Test the decorator metadata key
    expect(STREAM_RATE_LIMIT_KEY).toBe('streamRateLimit');

    // Test SetMetadata integration
    const testConfig: HttpRateLimitConfig = {
      enabled: true,
      limit: 5,
      windowMs: 30000,
      ttl: 30,
      perIP: true
    };

    const decoratorResult = SetMetadata(STREAM_RATE_LIMIT_KEY, testConfig);
    expect(decoratorResult).toBeDefined();
    expect(typeof decoratorResult).toBe('function');
  });
});
