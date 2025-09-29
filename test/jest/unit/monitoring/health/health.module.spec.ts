/**
 * HealthModule Unit Tests
 * 测试健康检查模块的配置和服务注册
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthModule } from '@monitoring/health/health.module';
import { HealthCheckService } from '@monitoring/health/health-check.service';
import { ExtendedHealthService } from '@monitoring/health/extended-health.service';
import { createLogger } from '@common/logging/index';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('@common/logging/index');
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

describe('HealthModule', () => {
  let module: TestingModule;
  let healthCheckService: HealthCheckService;
  let extendedHealthService: ExtendedHealthService;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Mock Redis client
    const mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

    module = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'MONGODB_URI':
                  return 'mongodb://localhost:27017/test';
                case 'REDIS_URL':
                  return 'redis://localhost:6379';
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: 'REDIS',
          useValue: mockRedis,
        },
      ],
    }).compile();

    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    extendedHealthService = module.get<ExtendedHealthService>(ExtendedHealthService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should compile successfully', async () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('Service Registration', () => {
    it('should provide HealthCheckService', () => {
      expect(healthCheckService).toBeDefined();
      expect(healthCheckService).toBeInstanceOf(HealthCheckService);
    });

    it('should provide ExtendedHealthService', () => {
      expect(extendedHealthService).toBeDefined();
      expect(extendedHealthService).toBeInstanceOf(ExtendedHealthService);
    });

    it('should export HealthCheckService', () => {
      const exportedService = module.get<HealthCheckService>(HealthCheckService);
      expect(exportedService).toBe(healthCheckService);
    });

    it('should export ExtendedHealthService', () => {
      const exportedService = module.get<ExtendedHealthService>(ExtendedHealthService);
      expect(exportedService).toBe(extendedHealthService);
    });
  });

  describe('Service Integration', () => {
    it('should allow HealthCheckService to perform basic health checks', async () => {
      // Mock successful connections
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };

      const mongoose = require('mongoose');
      jest.doMock('mongoose', () => ({
        createConnection: jest.fn().mockReturnValue(mockConnection),
      }));

      const result = await healthCheckService.checkHealth();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should allow ExtendedHealthService to perform comprehensive health checks', async () => {
      // Set up environment variables
      process.env.LONGPORT_APP_KEY = 'test-key';
      process.env.LONGPORT_APP_SECRET = 'test-secret';
      process.env.LONGPORT_ACCESS_TOKEN = 'test-token';

      const result = await extendedHealthService.getFullHealthStatus();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.healthScore).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);

      // Clean up environment variables
      delete process.env.LONGPORT_APP_KEY;
      delete process.env.LONGPORT_APP_SECRET;
      delete process.env.LONGPORT_ACCESS_TOKEN;
    });

    it('should handle ExtendedHealthService dependency on HealthCheckService', async () => {
      const healthResult = {
        status: 'healthy' as const,
        checks: [
          { name: 'mongodb', status: 'healthy' as const, message: 'OK', duration: 10 },
          { name: 'redis', status: 'healthy' as const, message: 'OK', duration: 5 },
          { name: 'memory', status: 'healthy' as const, message: 'OK' },
        ],
        timestamp: new Date(),
      };

      jest.spyOn(healthCheckService, 'checkHealth').mockResolvedValue(healthResult);

      const startupResult = await extendedHealthService.performStartupCheck();

      expect(startupResult).toEqual(healthResult);
      expect(healthCheckService.checkHealth).toHaveBeenCalled();
    });

    it('should provide configuration health status', async () => {
      const configHealth = await extendedHealthService.getConfigHealthStatus();

      expect(configHealth).toBeDefined();
      expect(configHealth.isValid).toBeDefined();
      expect(configHealth.errors).toBeInstanceOf(Array);
      expect(configHealth.warnings).toBeInstanceOf(Array);
      expect(configHealth.validatedAt).toBeDefined();
    });

    it('should provide dependencies health status', async () => {
      const depsHealth = await extendedHealthService.getDependenciesHealthStatus();

      expect(depsHealth).toBeDefined();
      expect(depsHealth.mongodb).toBeDefined();
      expect(depsHealth.redis).toBeDefined();
      expect(depsHealth.externalServices).toBeDefined();
      expect(depsHealth.externalServices.longport).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle module initialization with missing dependencies gracefully', async () => {
      // This test ensures the module can initialize even with some missing dependencies
      const testModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined), // Return undefined for all config
            },
          },
        ],
      }).compile();

      const testHealthService = testModule.get<HealthCheckService>(HealthCheckService);
      const testExtendedService = testModule.get<ExtendedHealthService>(ExtendedHealthService);

      expect(testHealthService).toBeDefined();
      expect(testExtendedService).toBeDefined();

      await testModule.close();
    });

    it('should handle health check failures gracefully', async () => {
      // Mock health check service to throw an error
      jest.spyOn(healthCheckService, 'checkHealth').mockRejectedValue(new Error('Health check failed'));

      try {
        await extendedHealthService.performStartupCheck();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Health check failed');
      }
    });

    it('should handle extended health service errors gracefully', async () => {
      // Mock environment to cause failures
      delete process.env.MONGODB_URI;
      delete process.env.REDIS_URL;

      const result = await extendedHealthService.getFullHealthStatus();

      // Should still return a result, even if unhealthy
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Module Lifecycle', () => {
    it('should properly initialize services during module creation', () => {
      expect(healthCheckService).toBeDefined();
      expect(extendedHealthService).toBeDefined();
    });

    it('should properly clean up resources during module destruction', async () => {
      // Test module cleanup
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle multiple module instances', async () => {
      const secondModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                  case 'MONGODB_URI':
                    return 'mongodb://localhost:27017/test2';
                  case 'REDIS_URL':
                    return 'redis://localhost:6380';
                  default:
                    return undefined;
                }
              }),
            },
          },
          {
            provide: 'REDIS',
            useValue: {
              connect: jest.fn().mockResolvedValue(undefined),
              ping: jest.fn().mockResolvedValue('PONG'),
              quit: jest.fn().mockResolvedValue('OK'),
            },
          },
        ],
      }).compile();

      const secondHealthService = secondModule.get<HealthCheckService>(HealthCheckService);
      const secondExtendedService = secondModule.get<ExtendedHealthService>(ExtendedHealthService);

      expect(secondHealthService).toBeDefined();
      expect(secondExtendedService).toBeDefined();
      expect(secondHealthService).not.toBe(healthCheckService);
      expect(secondExtendedService).not.toBe(extendedHealthService);

      await secondModule.close();
    });
  });

  describe('Service Dependencies', () => {
    it('should inject HealthCheckService into ExtendedHealthService correctly', () => {
      // Access private property for testing dependency injection
      const healthServiceDependency = (extendedHealthService as any).healthCheckService;
      expect(healthServiceDependency).toBe(healthCheckService);
    });

    it('should inject Redis client into ExtendedHealthService correctly', () => {
      // Access private property for testing dependency injection
      const redisClientDependency = (extendedHealthService as any).redisClient;
      expect(redisClientDependency).toBeDefined();
    });

    it('should inject ConfigService into HealthCheckService correctly', () => {
      // Access private property for testing dependency injection
      const configServiceDependency = (healthCheckService as any).config;
      expect(configServiceDependency).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete module initialization within reasonable time', async () => {
      const startTime = Date.now();

      const perfModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                  case 'MONGODB_URI':
                    return 'mongodb://localhost:27017/perftest';
                  case 'REDIS_URL':
                    return 'redis://localhost:6379';
                  default:
                    return undefined;
                }
              }),
            },
          },
          {
            provide: 'REDIS',
            useValue: {
              connect: jest.fn().mockResolvedValue(undefined),
              ping: jest.fn().mockResolvedValue('PONG'),
              quit: jest.fn().mockResolvedValue('OK'),
            },
          },
        ],
      }).compile();

      const initTime = Date.now() - startTime;
      expect(initTime).toBeLessThan(1000); // Should initialize in less than 1 second

      await perfModule.close();
    });

    it('should handle concurrent health checks efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        extendedHealthService.getConfigHealthStatus()
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.isValid).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
      });
    });

    it('should handle high-load concurrent operations', async () => {
      const healthCheckPromises = Array.from({ length: 10 }, () => healthCheckService.checkHealth());
      const extendedHealthPromises = Array.from({ length: 10 }, () => extendedHealthService.getFullHealthStatus());

      const [healthResults, extendedResults] = await Promise.all([
        Promise.allSettled(healthCheckPromises),
        Promise.allSettled(extendedHealthPromises),
      ]);

      expect(healthResults.every(result => result.status === 'fulfilled')).toBe(true);
      expect(extendedResults.every(result => result.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Module Configuration Edge Cases', () => {
    it('should handle module with minimal configuration', async () => {
      const minimalModule = await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();

      expect(minimalModule).toBeDefined();

      const healthService = minimalModule.get<HealthCheckService>(HealthCheckService);
      const extendedService = minimalModule.get<ExtendedHealthService>(ExtendedHealthService);

      expect(healthService).toBeDefined();
      expect(extendedService).toBeDefined();

      await minimalModule.close();
    });

    it('should handle module with custom Redis provider', async () => {
      const customRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('CUSTOM_PONG'),
        quit: jest.fn().mockResolvedValue('CUSTOM_OK'),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      const customModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: 'REDIS',
            useValue: customRedis,
          },
        ],
      }).overrideProvider('REDIS').useValue(customRedis).compile();

      const extendedService = customModule.get<ExtendedHealthService>(ExtendedHealthService);
      expect(extendedService).toBeDefined();

      // Verify custom Redis client is injected
      const redisClient = (extendedService as any).redisClient;
      expect(redisClient).toBe(customRedis);

      await customModule.close();
    });

    it('should handle provider resolution failures gracefully', async () => {
      const faultyModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation(() => {
                throw new Error('Config service error');
              }),
            },
          },
        ],
      }).compile();

      const healthService = faultyModule.get<HealthCheckService>(HealthCheckService);
      expect(healthService).toBeDefined();

      // Should handle config errors gracefully during health checks
      const result = await healthService.checkHealth();
      expect(result).toBeDefined();
      expect(result.status).toBe('unhealthy'); // Likely due to config failures

      await faultyModule.close();
    });
  });

  describe('Service Interaction Edge Cases', () => {
    it('should handle ExtendedHealthService calling HealthCheckService with errors', async () => {
      jest.spyOn(healthCheckService, 'checkHealth').mockRejectedValue(new Error('Basic health check failed'));

      try {
        await extendedHealthService.performStartupCheck();
      } catch (error) {
        expect(error.message).toBe('Basic health check failed');
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Startup check failed', {
        error: 'Basic health check failed',
      });
    });

    it('should verify service method signatures and return types', async () => {
      // Verify HealthCheckService methods
      expect(typeof healthCheckService.checkHealth).toBe('function');

      // Verify ExtendedHealthService methods
      expect(typeof extendedHealthService.getFullHealthStatus).toBe('function');
      expect(typeof extendedHealthService.getConfigHealthStatus).toBe('function');
      expect(typeof extendedHealthService.getDependenciesHealthStatus).toBe('function');
      expect(typeof extendedHealthService.performStartupCheck).toBe('function');

      // Test return types
      const configHealth = await extendedHealthService.getConfigHealthStatus();
      expect(configHealth).toHaveProperty('isValid');
      expect(configHealth).toHaveProperty('errors');
      expect(configHealth).toHaveProperty('warnings');
      expect(configHealth).toHaveProperty('validatedAt');

      const depsHealth = await extendedHealthService.getDependenciesHealthStatus();
      expect(depsHealth).toHaveProperty('mongodb');
      expect(depsHealth).toHaveProperty('redis');
      expect(depsHealth).toHaveProperty('externalServices');
    });

    it('should handle service instantiation with different configurations', async () => {
      const configs = [
        { MONGODB_URI: 'mongodb://test1:27017/db1', REDIS_URL: 'redis://test1:6379' },
        { MONGODB_URI: 'mongodb://test2:27017/db2', REDIS_URL: 'redis://test2:6379' },
        { MONGODB_URI: undefined, REDIS_URL: undefined },
      ];

      for (const config of configs) {
        const testModule = await Test.createTestingModule({
          imports: [HealthModule],
          providers: [
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockImplementation((key: string) => config[key]),
              },
            },
            {
              provide: 'REDIS',
              useValue: {
                connect: jest.fn().mockResolvedValue(undefined),
                ping: jest.fn().mockResolvedValue('PONG'),
                quit: jest.fn().mockResolvedValue('OK'),
              },
            },
          ],
        }).compile();

        const testHealthService = testModule.get<HealthCheckService>(HealthCheckService);
        const testExtendedService = testModule.get<ExtendedHealthService>(ExtendedHealthService);

        expect(testHealthService).toBeDefined();
        expect(testExtendedService).toBeDefined();

        await testModule.close();
      }
    });
  });

  describe('Module Metadata and Exports', () => {
    it('should properly export all required services', () => {
      // Verify services are exported and accessible
      expect(healthCheckService).toBeInstanceOf(HealthCheckService);
      expect(extendedHealthService).toBeInstanceOf(ExtendedHealthService);

      // Verify services can be retrieved by token
      const retrievedHealthService = module.get(HealthCheckService);
      const retrievedExtendedService = module.get(ExtendedHealthService);

      expect(retrievedHealthService).toBe(healthCheckService);
      expect(retrievedExtendedService).toBe(extendedHealthService);
    });

    it('should handle module re-exports correctly', async () => {
      // Test that services exported by HealthModule can be imported by other modules
      const ConsumerModule = class {
        constructor(
          private readonly healthCheck: HealthCheckService,
          private readonly extendedHealth: ExtendedHealthService,
        ) {}
      };

      const consumerModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: 'CONSUMER',
            useFactory: (healthCheck: HealthCheckService, extendedHealth: ExtendedHealthService) => {
              return new ConsumerModule(healthCheck, extendedHealth);
            },
            inject: [HealthCheckService, ExtendedHealthService],
          },
        ],
      }).compile();

      const consumer = consumerModule.get('CONSUMER');
      expect(consumer).toBeInstanceOf(ConsumerModule);

      await consumerModule.close();
    });

    it('should maintain service singleton scope', async () => {
      // Get services multiple times and verify they are the same instance
      const healthService1 = module.get<HealthCheckService>(HealthCheckService);
      const healthService2 = module.get<HealthCheckService>(HealthCheckService);
      const extendedService1 = module.get<ExtendedHealthService>(ExtendedHealthService);
      const extendedService2 = module.get<ExtendedHealthService>(ExtendedHealthService);

      expect(healthService1).toBe(healthService2);
      expect(extendedService1).toBe(extendedService2);
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should properly clean up resources on module destruction', async () => {
      const tempModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                  case 'MONGODB_URI':
                    return 'mongodb://localhost:27017/temp';
                  case 'REDIS_URL':
                    return 'redis://localhost:6379';
                  default:
                    return undefined;
                }
              }),
            },
          },
          {
            provide: 'REDIS',
            useValue: {
              connect: jest.fn().mockResolvedValue(undefined),
              ping: jest.fn().mockResolvedValue('PONG'),
              quit: jest.fn().mockResolvedValue('OK'),
              disconnect: jest.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();

      const tempHealthService = tempModule.get<HealthCheckService>(HealthCheckService);
      const tempExtendedService = tempModule.get<ExtendedHealthService>(ExtendedHealthService);

      expect(tempHealthService).toBeDefined();
      expect(tempExtendedService).toBeDefined();

      // Cleanup should not throw errors
      await expect(tempModule.close()).resolves.not.toThrow();
    });

    it('should handle cleanup with pending operations', async () => {
      const slowModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                  case 'MONGODB_URI':
                    return 'mongodb://localhost:27017/slow';
                  case 'REDIS_URL':
                    return 'redis://localhost:6379';
                  default:
                    return undefined;
                }
              }),
            },
          },
        ],
      }).compile();

      const slowExtendedService = slowModule.get<ExtendedHealthService>(ExtendedHealthService);

      // Start a slow operation
      const slowOperation = slowExtendedService.getFullHealthStatus();

      // Close module while operation is pending
      const cleanup = slowModule.close();

      // Both should complete without issues
      await Promise.all([slowOperation, cleanup]);

      expect(true).toBe(true); // Test passes if no exceptions are thrown
    });
  });
});