
import { Test, TestingModule } from '@nestjs/testing';
import { AuthConfigService } from '@auth/services/infrastructure/auth-config.service';
import authConfig from '@auth/config/auth-configuration';

// Mock configuration
const mockAuthConfiguration = {
  security: {
    maxPayloadSizeBytes: 1024,
    maxPayloadSizeString: '1KB',
    maxStringLengthSanitize: 1000,
    maxObjectDepthComplexity: 5,
    maxObjectFieldsComplexity: 50,
    maxStringLengthComplexity: 2000,
    findLongStringThreshold: 500,
    maxQueryParams: 10,
    maxRecursionDepth: 3,
  },
  rateLimit: {
    globalThrottle: {
      ttl: 60,
      limit: 10,
    },
    redis: {
      host: 'localhost',
      port: 6379,
    },
    ipRateLimit: {
      enabled: true,
      windowMs: 900000,
      max: 100,
    },
  },
  strategies: {
    jwt: {
      enabled: true,
    },
    apiKey: {
      enabled: true,
    },
  },
};

describe('AuthConfigService', () => {
  let service: AuthConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthConfigService,
        {
          provide: authConfig.KEY,
          useValue: mockAuthConfiguration,
        },
      ],
    }).compile();

    service = module.get<AuthConfigService>(AuthConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('securityConfig', () => {
    it('should return security config', () => {
      expect(service.securityConfig).toEqual(mockAuthConfiguration.security);
    });
  });

  describe('rateLimitConfig', () => {
    it('should return rate limit config', () => {
      expect(service.rateLimitConfig).toEqual(mockAuthConfiguration.rateLimit);
    });
  });

  describe('strategiesConfig', () => {
    it('should return strategies config', () => {
      expect(service.strategiesConfig).toEqual(mockAuthConfiguration.strategies);
    });
  });

  describe('Security limit methods', () => {
    it('should return max payload size in bytes', () => {
      expect(service.getMaxPayloadSizeBytes()).toBe(1024);
    });

    it('should return max payload size as string', () => {
      expect(service.getMaxPayloadSizeString()).toBe('1KB');
    });

    it('should return max string length for sanitization', () => {
      expect(service.getMaxStringLengthSanitize()).toBe(1000);
    });

    it('should return max object depth complexity', () => {
      expect(service.getMaxObjectDepthComplexity()).toBe(5);
    });

    it('should return max object fields complexity', () => {
      expect(service.getMaxObjectFieldsComplexity()).toBe(50);
    });

    it('should return max string length complexity', () => {
      expect(service.getMaxStringLengthComplexity()).toBe(2000);
    });

    it('should return find long string threshold', () => {
      expect(service.getFindLongStringThreshold()).toBe(500);
    });

    it('should return max query params', () => {
      expect(service.getMaxQueryParams()).toBe(10);
    });

    it('should return max recursion depth', () => {
      expect(service.getMaxRecursionDepth()).toBe(3);
    });
  });

  describe('Rate limit methods', () => {
    it('should return global throttle config', () => {
      expect(service.getGlobalThrottleConfig()).toEqual(mockAuthConfiguration.rateLimit.globalThrottle);
    });

    it('should return redis config', () => {
      expect(service.getRedisConfig()).toEqual(mockAuthConfiguration.rateLimit.redis);
    });

    it('should return IP rate limit config', () => {
      expect(service.getIpRateLimitConfig()).toEqual(mockAuthConfiguration.rateLimit.ipRateLimit);
    });
  });

  describe('Strategies methods', () => {
    it('should return rate limit strategies', () => {
      expect(service.getRateLimitStrategies()).toEqual(mockAuthConfiguration.strategies);
    });
  });

  describe('Convenience methods', () => {
    it('should check if IP rate limit is enabled', () => {
      expect(service.isIpRateLimitEnabled()).toBe(true);
    });

    it('should return global throttle TTL', () => {
      expect(service.getGlobalThrottleTtl()).toBe(60);
    });

    it('should return global throttle limit', () => {
      expect(service.getGlobalThrottleLimit()).toBe(10);
    });
  });
});
