/**
 * Monitoring Performance Thresholds Configuration Unit Tests
 * 测试监控统一性能阈值配置的验证、环境适配和计算逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MonitoringPerformanceThresholdsConfig,
  ApiResponseThresholdsConfig,
  CachePerformanceThresholdsConfig,
  DatabasePerformanceThresholdsConfig,
  ThroughputConcurrencyThresholdsConfig,
  SystemResourceThresholdsConfig,
  ErrorRateAvailabilityThresholdsConfig,
  monitoringPerformanceThresholdsConfig,
  MonitoringPerformanceThresholdsUtils,
} from '@monitoring/config/unified/monitoring-performance-thresholds.config';

describe('ApiResponseThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new ApiResponseThresholdsConfig();

      expect(config.apiExcellentMs).toBe(100);
      expect(config.apiGoodMs).toBe(300);
      expect(config.apiWarningMs).toBe(1000);
      expect(config.apiPoorMs).toBe(3000);
      expect(config.apiCriticalMs).toBe(5000);
      expect(config.websocketExcellentMs).toBe(50);
      expect(config.websocketGoodMs).toBe(100);
      expect(config.websocketWarningMs).toBe(200);
      expect(config.websocketPoorMs).toBe(500);
      expect(config.websocketCriticalMs).toBe(1000);
    });

    it('should validate default configuration', async () => {
      const config = new ApiResponseThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('API Response Time Validation', () => {
    it('should accept valid API response time values', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { 
        apiExcellentMs: 50,
        apiGoodMs: 150,
        apiWarningMs: 500,
        apiPoorMs: 1500,
        apiCriticalMs: 2500
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.apiExcellentMs).toBe(50);
      expect(config.apiGoodMs).toBe(150);
      expect(config.apiWarningMs).toBe(500);
      expect(config.apiPoorMs).toBe(1500);
      expect(config.apiCriticalMs).toBe(2500);
    });

    it('should reject API response time below minimum', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { apiExcellentMs: 5 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('API响应优秀阈值最小值为10ms');
    });

    it('should reject API response time above maximum', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { apiExcellentMs: 600 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('API响应优秀阈值最大值为500ms');
    });
  });

  describe('WebSocket Response Time Validation', () => {
    it('should accept valid WebSocket response time values', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { 
        websocketExcellentMs: 25,
        websocketGoodMs: 75,
        websocketWarningMs: 150,
        websocketPoorMs: 300,
        websocketCriticalMs: 750
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.websocketExcellentMs).toBe(25);
      expect(config.websocketGoodMs).toBe(75);
      expect(config.websocketWarningMs).toBe(150);
      expect(config.websocketPoorMs).toBe(300);
      expect(config.websocketCriticalMs).toBe(750);
    });

    it('should reject WebSocket response time below minimum', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { websocketExcellentMs: 2 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('WebSocket响应优秀阈值最小值为5ms');
    });

    it('should reject WebSocket response time above maximum', async () => {
      const config = plainToInstance(ApiResponseThresholdsConfig, { websocketExcellentMs: 250 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('WebSocket响应优秀阈值最大值为200ms');
    });
  });
});

describe('CachePerformanceThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new CachePerformanceThresholdsConfig();

      expect(config.redisHitRateExcellent).toBe(0.95);
      expect(config.redisHitRateGood).toBe(0.85);
      expect(config.redisResponseExcellentMs).toBe(5);
      expect(config.appCacheHitRateExcellent).toBe(0.9);
      expect(config.memoryCacheHitRateExcellent).toBe(0.85);
    });

    it('should validate default configuration', async () => {
      const config = new CachePerformanceThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Redis Hit Rate Validation', () => {
    it('should accept valid Redis hit rate values', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { 
        redisHitRateExcellent: 0.98,
        redisHitRateGood: 0.90,
        redisHitRateWarning: 0.75,
        redisHitRatePoor: 0.60,
        redisHitRateCritical: 0.40
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.redisHitRateExcellent).toBe(0.98);
      expect(config.redisHitRateGood).toBe(0.90);
      expect(config.redisHitRateWarning).toBe(0.75);
      expect(config.redisHitRatePoor).toBe(0.60);
      expect(config.redisHitRateCritical).toBe(0.40);
    });

    it('should reject Redis hit rate below minimum', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { redisHitRateExcellent: 0.75 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('Redis缓存命中率优秀阈值最小值为0.8');
    });

    it('should reject Redis hit rate above maximum', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { redisHitRateExcellent: 1.1 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('Redis缓存命中率优秀阈值最大值为1.0');
    });
  });

  describe('Redis Response Time Validation', () => {
    it('should accept valid Redis response time values', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { 
        redisResponseExcellentMs: 2,
        redisResponseGoodMs: 10,
        redisResponseWarningMs: 25,
        redisResponsePoorMs: 75,
        redisResponseCriticalMs: 250
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.redisResponseExcellentMs).toBe(2);
      expect(config.redisResponseGoodMs).toBe(10);
      expect(config.redisResponseWarningMs).toBe(25);
      expect(config.redisResponsePoorMs).toBe(75);
      expect(config.redisResponseCriticalMs).toBe(250);
    });

    it('should reject Redis response time below minimum', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { redisResponseExcellentMs: 0 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('Redis响应时间优秀阈值最小值为1ms');
    });

    it('should reject Redis response time above maximum', async () => {
      const config = plainToInstance(CachePerformanceThresholdsConfig, { redisResponseExcellentMs: 51 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('Redis响应时间优秀阈值最大值为50ms');
    });
  });
});

describe('DatabasePerformanceThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new DatabasePerformanceThresholdsConfig();

      expect(config.mongoQueryExcellentMs).toBe(50);
      expect(config.mongoQueryGoodMs).toBe(200);
      expect(config.mongoQueryWarningMs).toBe(1000);
      expect(config.aggregationQueryExcellentMs).toBe(200);
      expect(config.aggregationQueryGoodMs).toBe(1000);
    });

    it('should validate default configuration', async () => {
      const config = new DatabasePerformanceThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('MongoDB Query Time Validation', () => {
    it('should accept valid MongoDB query time values', async () => {
      const config = plainToInstance(DatabasePerformanceThresholdsConfig, { 
        mongoQueryExcellentMs: 25,
        mongoQueryGoodMs: 100,
        mongoQueryWarningMs: 500,
        mongoQueryPoorMs: 1500,
        mongoQueryCriticalMs: 5000
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.mongoQueryExcellentMs).toBe(25);
      expect(config.mongoQueryGoodMs).toBe(100);
      expect(config.mongoQueryWarningMs).toBe(500);
      expect(config.mongoQueryPoorMs).toBe(1500);
      expect(config.mongoQueryCriticalMs).toBe(5000);
    });

    it('should reject MongoDB query time below minimum', async () => {
      const config = plainToInstance(DatabasePerformanceThresholdsConfig, { mongoQueryExcellentMs: 5 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('MongoDB查询时间优秀阈值最小值为10ms');
    });

    it('should reject MongoDB query time above maximum', async () => {
      const config = plainToInstance(DatabasePerformanceThresholdsConfig, { mongoQueryExcellentMs: 250 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('MongoDB查询时间优秀阈值最大值为200ms');
    });
  });
});

describe('ThroughputConcurrencyThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new ThroughputConcurrencyThresholdsConfig();

      expect(config.apiThroughputExcellentRps).toBe(1000);
      expect(config.apiThroughputGoodRps).toBe(500);
      expect(config.apiThroughputWarningRps).toBe(100);
      expect(config.concurrentRequestsExcellent).toBe(1000);
      expect(config.concurrentRequestsGood).toBe(500);
    });

    it('should validate default configuration', async () => {
      const config = new ThroughputConcurrencyThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('API Throughput Validation', () => {
    it('should accept valid API throughput values', async () => {
      const config = plainToInstance(ThroughputConcurrencyThresholdsConfig, { 
        apiThroughputExcellentRps: 2000,
        apiThroughputGoodRps: 1000,
        apiThroughputWarningRps: 200,
        apiThroughputPoorRps: 100,
        apiThroughputCriticalRps: 20
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.apiThroughputExcellentRps).toBe(2000);
      expect(config.apiThroughputGoodRps).toBe(1000);
      expect(config.apiThroughputWarningRps).toBe(200);
      expect(config.apiThroughputPoorRps).toBe(100);
      expect(config.apiThroughputCriticalRps).toBe(20);
    });

    it('should reject API throughput below minimum', async () => {
      const config = plainToInstance(ThroughputConcurrencyThresholdsConfig, { apiThroughputExcellentRps: 50 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('API吞吐量优秀阈值最小值为100 RPS');
    });

    it('should reject API throughput above maximum', async () => {
      const config = plainToInstance(ThroughputConcurrencyThresholdsConfig, { apiThroughputExcellentRps: 15000 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('API吞吐量优秀阈值最大值为10000 RPS');
    });
  });
});

describe('SystemResourceThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new SystemResourceThresholdsConfig();

      expect(config.cpuUsageLow).toBe(0.3);
      expect(config.cpuUsageMedium).toBe(0.5);
      expect(config.cpuUsageHigh).toBe(0.7);
      expect(config.cpuUsageCritical).toBe(0.9);
      expect(config.memoryUsageLow).toBe(0.4);
      expect(config.memoryUsageMedium).toBe(0.6);
      expect(config.memoryUsageHigh).toBe(0.75);
      expect(config.memoryUsageCritical).toBe(0.95);
    });

    it('should validate default configuration', async () => {
      const config = new SystemResourceThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('CPU Usage Validation', () => {
    it('should accept valid CPU usage values', async () => {
      const config = plainToInstance(SystemResourceThresholdsConfig, { 
        cpuUsageLow: 0.1,
        cpuUsageMedium: 0.3,
        cpuUsageHigh: 0.6,
        cpuUsageCritical: 0.8
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.cpuUsageLow).toBe(0.1);
      expect(config.cpuUsageMedium).toBe(0.3);
      expect(config.cpuUsageHigh).toBe(0.6);
      expect(config.cpuUsageCritical).toBe(0.8);
    });

    it('should reject CPU usage below minimum', async () => {
      const config = plainToInstance(SystemResourceThresholdsConfig, { cpuUsageLow: 0.05 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('CPU使用率良好阈值最小值为0.1');
    });

    it('should reject CPU usage above maximum', async () => {
      const config = plainToInstance(SystemResourceThresholdsConfig, { cpuUsageLow: 0.85 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('CPU使用率良好阈值最大值为0.8');
    });
  });
});

describe('ErrorRateAvailabilityThresholdsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new ErrorRateAvailabilityThresholdsConfig();

      expect(config.errorRateAcceptable).toBe(0.05);
      expect(config.errorRateWarning).toBe(0.1);
      expect(config.errorRateCritical).toBe(0.2);
      expect(config.availabilityTarget).toBe(0.999);
      expect(config.healthCheckExcellentMs).toBe(100);
    });

    it('should validate default configuration', async () => {
      const config = new ErrorRateAvailabilityThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Error Rate Validation', () => {
    it('should accept valid error rate values', async () => {
      const config = plainToInstance(ErrorRateAvailabilityThresholdsConfig, { 
        errorRateAcceptable: 0.01,
        errorRateWarning: 0.05,
        errorRateCritical: 0.1,
        errorRateEmergency: 0.15,
        availabilityTarget: 0.9995
      });
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
      expect(config.errorRateAcceptable).toBe(0.01);
      expect(config.errorRateWarning).toBe(0.05);
      expect(config.errorRateCritical).toBe(0.1);
      expect(config.errorRateEmergency).toBe(0.15);
      expect(config.availabilityTarget).toBe(0.9995);
    });

    it('should reject error rate below minimum', async () => {
      const config = plainToInstance(ErrorRateAvailabilityThresholdsConfig, { errorRateAcceptable: 0.0005 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.min).toContain('错误率可接受阈值最小值为0.001');
    });

    it('should reject error rate above maximum', async () => {
      const config = plainToInstance(ErrorRateAvailabilityThresholdsConfig, { errorRateAcceptable: 0.25 });
      const errors = await validate(config);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.max).toContain('错误率可接受阈值最大值为0.2');
    });
  });
});

describe('MonitoringPerformanceThresholdsConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Default Configuration', () => {
    it('should initialize with default nested configurations', () => {
      const config = new MonitoringPerformanceThresholdsConfig();

      expect(config.apiResponse).toBeInstanceOf(ApiResponseThresholdsConfig);
      expect(config.cachePerformance).toBeInstanceOf(CachePerformanceThresholdsConfig);
      expect(config.databasePerformance).toBeInstanceOf(DatabasePerformanceThresholdsConfig);
      expect(config.throughputConcurrency).toBeInstanceOf(ThroughputConcurrencyThresholdsConfig);
      expect(config.systemResource).toBeInstanceOf(SystemResourceThresholdsConfig);
      expect(config.errorRateAvailability).toBeInstanceOf(ErrorRateAvailabilityThresholdsConfig);

      expect(config.apiResponse.apiExcellentMs).toBe(100);
      expect(config.cachePerformance.redisHitRateExcellent).toBe(0.95);
      expect(config.databasePerformance.mongoQueryExcellentMs).toBe(50);
    });

    it('should validate default configuration', async () => {
      const config = new MonitoringPerformanceThresholdsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Environment Adjustment', () => {
    describe('Production Environment', () => {
      it('should adjust configuration for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringPerformanceThresholdsConfig();

        config.adjustForEnvironment();

        expect(config.apiResponse.apiExcellentMs).toBe(80);
        expect(config.apiResponse.apiGoodMs).toBe(200);
        expect(config.apiResponse.apiWarningMs).toBe(500);
        expect(config.cachePerformance.redisHitRateExcellent).toBe(0.97);
        expect(config.cachePerformance.redisHitRateGood).toBe(0.9);
        expect(config.databasePerformance.mongoQueryExcellentMs).toBe(30);
        expect(config.throughputConcurrency.apiThroughputExcellentRps).toBe(2000);
        expect(config.systemResource.cpuUsageHigh).toBe(0.6);
        expect(config.systemResource.cpuUsageCritical).toBe(0.8);
        expect(config.errorRateAvailability.errorRateAcceptable).toBe(0.01);
        expect(config.errorRateAvailability.availabilityTarget).toBe(0.9995);
      });
    });

    describe('Test Environment', () => {
      it('should adjust configuration for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringPerformanceThresholdsConfig();

        config.adjustForEnvironment();

        expect(config.apiResponse.apiExcellentMs).toBe(200);
        expect(config.apiResponse.apiGoodMs).toBe(500);
        expect(config.apiResponse.apiWarningMs).toBe(2000);
        expect(config.cachePerformance.redisHitRateExcellent).toBe(0.8);
        expect(config.cachePerformance.redisHitRateGood).toBe(0.6);
        expect(config.databasePerformance.mongoQueryExcellentMs).toBe(100);
        expect(config.throughputConcurrency.apiThroughputExcellentRps).toBe(100);
        expect(config.systemResource.cpuUsageHigh).toBe(0.8);
        expect(config.systemResource.cpuUsageCritical).toBe(0.95);
        expect(config.errorRateAvailability.errorRateAcceptable).toBe(0.2);
        expect(config.errorRateAvailability.availabilityTarget).toBe(0.9);
      });
    });

    describe('Development Environment', () => {
      it('should not modify configuration for development environment', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringPerformanceThresholdsConfig();
        const originalValues = {
          apiResponse: { ...config.apiResponse },
          cachePerformance: { ...config.cachePerformance },
          databasePerformance: { ...config.databasePerformance }
        };

        config.adjustForEnvironment();

        expect(config.apiResponse).toEqual(originalValues.apiResponse);
        expect(config.cachePerformance).toEqual(originalValues.cachePerformance);
        expect(config.databasePerformance).toEqual(originalValues.databasePerformance);
      });
    });
  });

  describe('Threshold Validation', () => {
    it('should validate threshold configuration consistency', () => {
      const config = new MonitoringPerformanceThresholdsConfig();
      const result = config.validateThresholds();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect API response time threshold inconsistencies', () => {
      const config = new MonitoringPerformanceThresholdsConfig();
      config.apiResponse.apiExcellentMs = 500; // Greater than good
      config.apiResponse.apiGoodMs = 200;

      const result = config.validateThresholds();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('API响应时间优秀阈值必须小于良好阈值'))).toBe(true);
    });

    it('should detect cache hit rate threshold inconsistencies', () => {
      const config = new MonitoringPerformanceThresholdsConfig();
      config.cachePerformance.redisHitRateExcellent = 0.8; // Less than good
      config.cachePerformance.redisHitRateGood = 0.9;

      const result = config.validateThresholds();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Redis缓存命中率优秀阈值必须大于良好阈值'))).toBe(true);
    });

    it('should detect CPU usage threshold inconsistencies', () => {
      const config = new MonitoringPerformanceThresholdsConfig();
      config.systemResource.cpuUsageLow = 0.6; // Greater than medium
      config.systemResource.cpuUsageMedium = 0.5;

      const result = config.validateThresholds();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('CPU使用率低阈值必须小于中等阈值'))).toBe(true);
    });
  });
});

describe('monitoringPerformanceThresholdsConfig Factory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should create configuration with default values', () => {
    const config = monitoringPerformanceThresholdsConfig();

    expect(config.apiResponse.apiExcellentMs).toBe(100);
    expect(config.apiResponse.apiGoodMs).toBe(300);
    expect(config.cachePerformance.redisHitRateExcellent).toBe(0.95);
    expect(config.databasePerformance.mongoQueryExcellentMs).toBe(50);
  });

  it('should create configuration with environment variables', () => {
    process.env.MONITORING_API_RESPONSE_EXCELLENT_MS = '150';
    process.env.MONITORING_REDIS_HIT_RATE_EXCELLENT = '0.98';
    process.env.MONITORING_MONGO_QUERY_EXCELLENT_MS = '75';

    const config = monitoringPerformanceThresholdsConfig();

    expect(config.apiResponse.apiExcellentMs).toBe(150);
    expect(config.cachePerformance.redisHitRateExcellent).toBe(0.98);
    expect(config.databasePerformance.mongoQueryExcellentMs).toBe(75);
  });

  it('should adjust configuration for environment after creation', () => {
    process.env.NODE_ENV = 'production';

    const config = monitoringPerformanceThresholdsConfig();

    // Should be adjusted for production
    expect(config.apiResponse.apiExcellentMs).toBe(80);
    expect(config.cachePerformance.redisHitRateExcellent).toBe(0.97);
    expect(config.systemResource.cpuUsageHigh).toBe(0.6);
  });
});

describe('MonitoringPerformanceThresholdsUtils', () => {
  let config: MonitoringPerformanceThresholdsConfig;

  beforeEach(() => {
    config = new MonitoringPerformanceThresholdsConfig();
  });

  describe('getResponseTimeLevel', () => {
    it('should determine API response time level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(50, 'api', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(200, 'api', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(750, 'api', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(2000, 'api', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(6000, 'api', config)).toBe('critical');
    });

    it('should determine WebSocket response time level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(25, 'websocket', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(75, 'websocket', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(150, 'websocket', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(300, 'websocket', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(1500, 'websocket', config)).toBe('critical');
    });
  });

  describe('getCacheHitRateLevel', () => {
    it('should determine Redis cache hit rate level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.98, 'redis', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.90, 'redis', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.75, 'redis', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.60, 'redis', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.30, 'redis', config)).toBe('critical');
    });

    it('should determine application cache hit rate level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.95, 'app', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.80, 'app', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.65, 'app', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.50, 'app', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(0.20, 'app', config)).toBe('critical');
    });
  });

  describe('getSystemResourceLevel', () => {
    it('should determine CPU usage level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.2, 'cpu', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.4, 'cpu', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.6, 'cpu', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.8, 'cpu', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.95, 'cpu', config)).toBe('critical');
    });

    it('should determine memory usage level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.3, 'memory', config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.5, 'memory', config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.7, 'memory', config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.9, 'memory', config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getSystemResourceLevel(0.98, 'memory', config)).toBe('critical');
    });
  });

  describe('getErrorRateLevel', () => {
    it('should determine error rate level correctly', () => {
      expect(MonitoringPerformanceThresholdsUtils.getErrorRateLevel(0.01, config)).toBe('excellent');
      expect(MonitoringPerformanceThresholdsUtils.getErrorRateLevel(0.07, config)).toBe('good');
      expect(MonitoringPerformanceThresholdsUtils.getErrorRateLevel(0.15, config)).toBe('warning');
      expect(MonitoringPerformanceThresholdsUtils.getErrorRateLevel(0.25, config)).toBe('poor');
      expect(MonitoringPerformanceThresholdsUtils.getErrorRateLevel(0.35, config)).toBe('critical');
    });
  });

  describe('getEnvironmentVariableMapping', () => {
    it('should return correct environment variable mapping', () => {
      const mapping = MonitoringPerformanceThresholdsUtils.getEnvironmentVariableMapping();

      expect(mapping['apiResponse.apiExcellentMs']).toBe('MONITORING_API_RESPONSE_EXCELLENT_MS');
      expect(mapping['cachePerformance.redisHitRateExcellent']).toBe('MONITORING_REDIS_HIT_RATE_EXCELLENT');
      expect(mapping['databasePerformance.mongoQueryExcellentMs']).toBe('MONITORING_MONGO_QUERY_EXCELLENT_MS');
      expect(mapping['throughputConcurrency.apiThroughputExcellentRps']).toBe('MONITORING_API_THROUGHPUT_EXCELLENT_RPS');
      expect(mapping['systemResource.cpuUsageHigh']).toBe('MONITORING_CPU_USAGE_HIGH');
      expect(mapping['errorRateAvailability.errorRateAcceptable']).toBe('MONITORING_ERROR_RATE_ACCEPTABLE');
    });
  });
});

describe('Type Exports', () => {
  it('should export MonitoringPerformanceThresholdsType correctly', () => {
    const configType: import('@monitoring/config/unified/monitoring-performance-thresholds.config').MonitoringPerformanceThresholdsType = 
      new MonitoringPerformanceThresholdsConfig();

    expect(configType.apiResponse).toBeDefined();
    expect(configType.cachePerformance).toBeDefined();
    expect(configType.databasePerformance).toBeDefined();
    expect(configType.throughputConcurrency).toBeDefined();
    expect(configType.systemResource).toBeDefined();
    expect(configType.errorRateAvailability).toBeDefined();
  });

  it('should export PerformanceLevel correctly', () => {
    const performanceLevel: import('@monitoring/config/unified/monitoring-performance-thresholds.config').PerformanceLevel = 'excellent';
    expect(['excellent', 'good', 'warning', 'poor', 'critical']).toContain(performanceLevel);
  });

  it('should export ResponseTimeType correctly', () => {
    const responseType: import('@monitoring/config/unified/monitoring-performance-thresholds.config').ResponseTimeType = 'api';
    expect(['api', 'websocket', 'internal']).toContain(responseType);
  });

  it('should export CacheType correctly', () => {
    const cacheType: import('@monitoring/config/unified/monitoring-performance-thresholds.config').CacheType = 'redis';
    expect(['redis', 'app', 'memory']).toContain(cacheType);
  });

  it('should export SystemResourceType correctly', () => {
    const resourceType: import('@monitoring/config/unified/monitoring-performance-thresholds.config').SystemResourceType = 'cpu';
    expect(['cpu', 'memory', 'disk', 'connection', 'fd']).toContain(resourceType);
  });
});