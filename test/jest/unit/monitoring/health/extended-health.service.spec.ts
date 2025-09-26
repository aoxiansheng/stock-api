/**
 * ExtendedHealthService Unit Tests
 * 测试扩展健康检查服务的完整功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExtendedHealthService } from '@monitoring/health/extended-health.service';
import { HealthCheckService } from '@monitoring/health/health-check.service';
import { createLogger } from '@common/logging/index';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants/config/monitoring-health.constants';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('@appcore/config/logger.config');
jest.mock('ioredis');
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    db: jest.fn(() => ({
      admin: jest.fn(() => ({
        ping: jest.fn(),
      })),
    })),
    close: jest.fn(),
  })),
}));

describe('ExtendedHealthService', () => {
  let service: ExtendedHealthService;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let redisClient: jest.Mocked<Redis>;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    redisClient = {
      connect: jest.fn(),
      ping: jest.fn(),
      quit: jest.fn(),
    } as any;

    healthCheckService = {
      checkHealth: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtendedHealthService,
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: 'REDIS',
          useValue: redisClient,
        },
      ],
    }).compile();

    service = module.get<ExtendedHealthService>(ExtendedHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFullHealthStatus', () => {
    it('should return comprehensive health status when all services are healthy', async () => {
      // Mock all dependency checks to pass
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockResolvedValue(undefined);
      mongoClient().db().admin().ping.mockResolvedValue(undefined);
      mongoClient().close.mockResolvedValue(undefined);

      redisClient.connect.mockResolvedValue(undefined);
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.quit.mockResolvedValue('OK');

      // Set environment variables
      process.env.LONGPORT_APP_KEY = 'test-key';
      process.env.LONGPORT_APP_SECRET = 'test-secret';
      process.env.LONGPORT_ACCESS_TOKEN = 'test-token';

      const result = await service.getFullHealthStatus();

      expect(result.status).toBe(MONITORING_HEALTH_STATUS.HEALTHY);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.system.nodeVersion).toBe(process.version);
      expect(result.system.platform).toBe(process.platform);
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.mongodb).toBeDefined();
      expect(result.dependencies.redis).toBeDefined();
      expect(result.dependencies.externalServices.longport).toBeDefined();
      expect(result.healthScore).toBeGreaterThanOrEqual(80);
      expect(result.recommendations).toBeDefined();
    });

    it('should handle MongoDB connection failure', async () => {
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getFullHealthStatus();

      expect(result.dependencies.mongodb.status).toBe('error');
      expect(result.dependencies.mongodb.error).toBe('Connection failed');
      expect(result.healthScore).toBeLessThan(100);
    });

    it('should handle Redis connection failure', async () => {
      redisClient.connect.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getFullHealthStatus();

      expect(result.dependencies.redis.status).toBe('error');
      expect(result.dependencies.redis.error).toBe('Redis connection failed');
      expect(result.healthScore).toBeLessThan(100);
    });

    it('should return failure status on complete system error', async () => {
      // Mock system failure
      jest.spyOn(service as any, 'getDependenciesHealth').mockRejectedValue(new Error('System failure'));

      const result = await service.getFullHealthStatus();

      expect(result.status).toBe(MONITORING_HEALTH_STATUS.UNHEALTHY);
      expect(result.healthScore).toBe(0);
      expect(result.recommendations).toContain('Health check system error: System failure');
    });
  });

  describe('getConfigHealthStatus', () => {
    it('should return valid config status when validation passes', async () => {
      const result = await service.getConfigHealthStatus();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.validatedAt).toBeDefined();
    });

    it('should handle config validation errors gracefully', async () => {
      // Mock validation failure
      jest.spyOn(service as any, 'getConfigurationHealth').mockRejectedValue(new Error('Config error'));

      const result = await service.getConfigHealthStatus();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration validation failed: Config error');
      expect(result.validatedAt).toBeDefined();
    });
  });

  describe('getDependenciesHealthStatus', () => {
    it('should return dependencies health status', async () => {
      const result = await service.getDependenciesHealthStatus();

      expect(result).toBeDefined();
      expect(result.mongodb).toBeDefined();
      expect(result.redis).toBeDefined();
      expect(result.externalServices).toBeDefined();
      expect(result.externalServices.longport).toBeDefined();
    });
  });

  describe('performStartupCheck', () => {
    it('should execute startup check and cache result', async () => {
      const mockHealthResult = {
        status: 'healthy',
        timestamp: new Date(),
        checks: [
          {
            name: 'database',
            status: 'healthy',
            duration: 100,
            message: 'OK',
          },
        ],
      } as any;

      healthCheckService.checkHealth.mockResolvedValue(mockHealthResult);

      const result = await service.performStartupCheck();

      expect(result).toBe(mockHealthResult);
      expect(healthCheckService.checkHealth).toHaveBeenCalled();
    });

    it('should handle startup check failures', async () => {
      healthCheckService.checkHealth.mockRejectedValue(new Error('Startup check failed'));

      await expect(service.performStartupCheck()).rejects.toThrow('Startup check failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Startup check failed', {
        error: 'Startup check failed',
      });
    });
  });

  describe('Health Score Calculation', () => {
    it('should calculate health score based on configuration and dependencies', async () => {
      // Test with all services healthy
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockResolvedValue(undefined);
      mongoClient().db().admin().ping.mockResolvedValue(undefined);
      mongoClient().close.mockResolvedValue(undefined);

      redisClient.connect.mockResolvedValue(undefined);
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.quit.mockResolvedValue(undefined);

      const result = await service.getFullHealthStatus();
      expect(result.healthScore).toBe(100);
    });

    it('should reduce health score when MongoDB is down', async () => {
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockRejectedValue(new Error('MongoDB down'));

      redisClient.connect.mockResolvedValue(undefined);
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.quit.mockResolvedValue(undefined);

      const result = await service.getFullHealthStatus();
      expect(result.healthScore).toBeLessThan(100);
      expect(result.healthScore).toBeGreaterThanOrEqual(75); // 100 - 25 for MongoDB
    });

    it('should reduce health score when Redis is down', async () => {
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockResolvedValue(undefined);
      mongoClient().db().admin().ping.mockResolvedValue(undefined);
      mongoClient().close.mockResolvedValue(undefined);

      redisClient.connect.mockRejectedValue(new Error('Redis down'));

      const result = await service.getFullHealthStatus();
      expect(result.healthScore).toBeLessThan(100);
      expect(result.healthScore).toBeGreaterThanOrEqual(80); // 100 - 20 for Redis
    });
  });

  describe('Status Determination', () => {
    it('should determine HEALTHY status for high scores', () => {
      const healthyScore = 85;
      const status = (service as any).determineOverallStatus(healthyScore);
      expect(status).toBe(MONITORING_HEALTH_STATUS.HEALTHY);
    });

    it('should determine DEGRADED status for medium scores', () => {
      const degradedScore = 65;
      const status = (service as any).determineOverallStatus(degradedScore);
      expect(status).toBe(MONITORING_HEALTH_STATUS.DEGRADED);
    });

    it('should determine UNHEALTHY status for low scores', () => {
      const unhealthyScore = 30;
      const status = (service as any).determineOverallStatus(unhealthyScore);
      expect(status).toBe(MONITORING_HEALTH_STATUS.UNHEALTHY);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate recommendations based on system state', async () => {
      // Mock MongoDB failure
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockRejectedValue(new Error('MongoDB down'));

      const result = await service.getFullHealthStatus();

      expect(result.recommendations).toContain('Ensure MongoDB is running and accessible');
    });

    it('should recommend LongPort configuration when not configured', async () => {
      delete process.env.LONGPORT_APP_KEY;
      delete process.env.LONGPORT_APP_SECRET;
      delete process.env.LONGPORT_ACCESS_TOKEN;

      const result = await service.getFullHealthStatus();

      expect(result.recommendations).toContain(
        'Consider configuring LongPort API for full functionality'
      );
    });

    it('should provide positive feedback when system is healthy', async () => {
      // Mock all services healthy
      const mongoClient = require('mongodb').MongoClient;
      mongoClient().connect.mockResolvedValue(undefined);
      mongoClient().db().admin().ping.mockResolvedValue(undefined);
      mongoClient().close.mockResolvedValue(undefined);

      redisClient.connect.mockResolvedValue(undefined);
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.quit.mockResolvedValue(undefined);

      process.env.LONGPORT_APP_KEY = 'test-key';
      process.env.LONGPORT_APP_SECRET = 'test-secret';
      process.env.LONGPORT_ACCESS_TOKEN = 'test-token';

      const result = await service.getFullHealthStatus();

      expect(result.recommendations).toContain('System is operating normally');
    });
  });

  describe('External Service Checks', () => {
    describe('checkLongPortHealth', () => {
      it('should return not_configured when credentials are missing', async () => {
        delete process.env.LONGPORT_APP_KEY;
        delete process.env.LONGPORT_APP_SECRET;
        delete process.env.LONGPORT_ACCESS_TOKEN;

        const result = await (service as any).checkLongPortHealth();

        expect(result.status).toBe('not_configured');
      });

      it('should return available when all credentials are present', async () => {
        process.env.LONGPORT_APP_KEY = 'test-key';
        process.env.LONGPORT_APP_SECRET = 'test-secret';
        process.env.LONGPORT_ACCESS_TOKEN = 'test-token';

        const result = await (service as any).checkLongPortHealth();

        expect(result.status).toBe('available');
      });
    });

    describe('checkRedisHealth', () => {
      it('should measure response time for Redis connection', async () => {
        redisClient.connect.mockResolvedValue(undefined);
        redisClient.ping.mockResolvedValue('PONG');
        redisClient.quit.mockResolvedValue('OK');

        const result = await (service as any).checkRedisHealth();

        expect(result.status).toBe('connected');
        expect(result.responseTime).toBeGreaterThan(0);
      });
    });

    describe('checkMongoDBHealth', () => {
      it('should measure response time for MongoDB connection', async () => {
        const mongoClient = require('mongodb').MongoClient;
        mongoClient().connect.mockResolvedValue(undefined);
        mongoClient().db().admin().ping.mockResolvedValue(undefined);
        mongoClient().close.mockResolvedValue(undefined);

        const result = await (service as any).checkMongoDBHealth();

        expect(result.status).toBe('connected');
        expect(result.responseTime).toBeGreaterThan(0);
      });
    });
  });

  describe('System Information', () => {
    it('should return comprehensive system information', async () => {
      const systemInfo = await (service as any).getSystemInfo();

      expect(systemInfo.nodeVersion).toBe(process.version);
      expect(systemInfo.platform).toBe(process.platform);
      expect(systemInfo.architecture).toBe(process.arch);
      expect(systemInfo.memory).toBeDefined();
      expect(systemInfo.memory.used).toBeGreaterThan(0);
      expect(systemInfo.memory.total).toBeGreaterThan(0);
      expect(systemInfo.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(systemInfo.memory.percentage).toBeLessThanOrEqual(100);
      expect(systemInfo.cpu).toBeDefined();
      expect(systemInfo.cpu.usage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Staleness', () => {
    it('should detect when validation is stale', () => {
      // Set last validation to old time
      (service as any).lastValidation = {
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      };

      const isStale = (service as any).isValidationStale();
      expect(isStale).toBe(true);
    });

    it('should detect when validation is fresh', () => {
      // Set last validation to recent time
      (service as any).lastValidation = {
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(), // Now
        },
      };

      const isStale = (service as any).isValidationStale();
      expect(isStale).toBe(false);
    });
  });
});
