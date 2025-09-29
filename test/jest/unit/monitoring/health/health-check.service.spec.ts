/**
 * HealthCheckService Unit Tests
 * 测试基础健康检查服务的完整功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService } from '@monitoring/health/health-check.service';
import { createLogger } from '@common/logging/index';
import mongoose from 'mongoose';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('@common/logging/index');
jest.mock('mongoose');
jest.mock('ioredis');

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      // Mock successful MongoDB connection
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      // Mock successful Redis connection
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks).toHaveLength(3);
      expect(result.timestamp).toBeInstanceOf(Date);

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      const redisCheck = result.checks.find(check => check.name === 'redis');
      const memoryCheck = result.checks.find(check => check.name === 'memory');

      expect(mongoCheck.status).toBe('healthy');
      expect(redisCheck.status).toBe('healthy');
      expect(memoryCheck.status).toBe('healthy');
    });

    it('should return unhealthy status when MongoDB check fails', async () => {
      // Mock failed MongoDB connection
      (mongoose.createConnection as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Mock successful Redis connection
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks).toHaveLength(3);

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      expect(mongoCheck.status).toBe('unhealthy');
      expect(mongoCheck.message).toContain('MongoDB连接失败');
      expect(mongoCheck.duration).toBeGreaterThan(0);
    });

    it('should return unhealthy status when Redis check fails', async () => {
      // Mock successful MongoDB connection
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      // Mock failed Redis connection
      const mockRedis = {
        connect: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        ping: jest.fn(),
        quit: jest.fn(),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');

      const redisCheck = result.checks.find(check => check.name === 'redis');
      expect(redisCheck.status).toBe('unhealthy');
      expect(redisCheck.message).toContain('Redis连接失败');
      expect(redisCheck.duration).toBeGreaterThan(0);
    });

    it('should include performance metrics in response times', async () => {
      // Mock connections with delays to test timing
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockImplementation(() =>
              new Promise(resolve => setTimeout(resolve, 10))
            ),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      const mockRedis = {
        connect: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 5))
        ),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      const redisCheck = result.checks.find(check => check.name === 'redis');

      expect(mongoCheck.duration).toBeGreaterThanOrEqual(10);
      expect(redisCheck.duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('MongoDB Health Check', () => {
    it('should handle MongoDB connection success', async () => {
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      const result = await (service as any).checkMongoDB();

      expect(result.name).toBe('mongodb');
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('MongoDB连接正常');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle MongoDB connection failure', async () => {
      (mongoose.createConnection as jest.Mock).mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      const result = await (service as any).checkMongoDB();

      expect(result.name).toBe('mongodb');
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('MongoDB连接失败: Connection timeout');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle MongoDB ping failure', async () => {
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockRejectedValue(new Error('Ping failed')),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      const result = await (service as any).checkMongoDB();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('MongoDB连接失败: Ping failed');
    });
  });

  describe('Redis Health Check', () => {
    it('should handle Redis connection success', async () => {
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockReturnValue('redis://localhost:6379');

      const result = await (service as any).checkRedis();

      expect(result.name).toBe('redis');
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Redis连接正常');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockRedis.connect).toHaveBeenCalled();
      expect(mockRedis.ping).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle Redis connection failure', async () => {
      const mockRedis = {
        connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
        ping: jest.fn(),
        quit: jest.fn(),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockReturnValue('redis://localhost:6379');

      const result = await (service as any).checkRedis();

      expect(result.name).toBe('redis');
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Redis连接失败: Connection refused');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle Redis ping failure', async () => {
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockRejectedValue(new Error('Ping timeout')),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockReturnValue('redis://localhost:6379');

      const result = await (service as any).checkRedis();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Redis连接失败: Ping timeout');
    });

    it('should configure Redis client with correct options', async () => {
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockReturnValue('redis://localhost:6379');

      await (service as any).checkRedis();

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', {
        retryStrategy: expect.any(Function),
        lazyConnect: true,
      });

      // Test retry strategy returns null (no retry)
      const redisConfig = (Redis as unknown as jest.Mock).mock.calls[0][1];
      expect(redisConfig.retryStrategy()).toBeNull();
    });
  });

  describe('Memory Health Check', () => {
    it('should return healthy status for normal memory usage', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.name).toBe('memory');
      expect(result.status).toBe('healthy');
      expect(result.message).toContain('内存使用: 50MB / 100MB (50%)');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status for high memory usage', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 95 * 1024 * 1024, // 95MB
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.name).toBe('memory');
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('内存使用: 95MB / 100MB (95%)');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return healthy status at exactly 90% memory usage', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 90 * 1024 * 1024, // 90MB
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.status).toBe('healthy');
      expect(result.message).toContain('90%');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status above 90% memory usage', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 91 * 1024 * 1024, // 91MB
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('91%');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle memory values correctly', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 1536 * 1024 * 1024, // 1.5GB
        heapTotal: 2048 * 1024 * 1024, // 2GB
      });

      const result = (service as any).checkMemory();

      expect(result.message).toContain('内存使用: 1536MB / 2048MB (75%)');

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration service returning undefined', async () => {
      configService.get.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      const redisCheck = result.checks.find(check => check.name === 'redis');

      expect(mongoCheck.status).toBe('unhealthy');
      expect(redisCheck.status).toBe('unhealthy');
    });

    it('should gracefully handle unexpected errors in health checks', async () => {
      // Mock unexpected error in MongoDB check
      (mongoose.createConnection as jest.Mock).mockImplementation(() => {
        throw new TypeError('Unexpected error');
      });

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      expect(mongoCheck.status).toBe('unhealthy');
      expect(mongoCheck.message).toContain('Unexpected error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform all checks in parallel', async () => {
      const startTime = Date.now();

      // Mock connections with artificial delays
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockImplementation(() =>
              new Promise(resolve => setTimeout(resolve, 100))
            ),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      const mockRedis = {
        connect: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 100))
        ),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      await service.checkHealth();

      const totalTime = Date.now() - startTime;
      // Should complete in less than 200ms if running in parallel,
      // would take 300ms+ if sequential
      expect(totalTime).toBeLessThan(200);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Mock MongoDB success but Redis failure
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      const mockRedis = {
        connect: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
        ping: jest.fn(),
        quit: jest.fn(),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');

      const mongoCheck = result.checks.find(check => check.name === 'mongodb');
      const redisCheck = result.checks.find(check => check.name === 'redis');
      const memoryCheck = result.checks.find(check => check.name === 'memory');

      expect(mongoCheck.status).toBe('healthy');
      expect(redisCheck.status).toBe('unhealthy');
      expect(memoryCheck.status).toBe('healthy');
    });

    it('should include timestamp and maintain consistency', async () => {
      const beforeTime = new Date();

      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      const result = await service.checkHealth();
      const afterTime = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent health checks', async () => {
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockImplementation((key: string) => {
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      });

      // Run multiple health checks concurrently
      const promises = Array.from({ length: 3 }, () => service.checkHealth());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('healthy');
        expect(result.checks).toHaveLength(3);
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle connection cleanup failure gracefully', async () => {
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      // Should still report healthy if ping succeeds, even if cleanup fails
      const result = await (service as any).checkMongoDB();
      expect(result.status).toBe('healthy');
    });

    it('should handle Redis quit failure gracefully', async () => {
      const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn().mockRejectedValue(new Error('Quit failed')),
      };
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis as any);

      configService.get.mockReturnValue('redis://localhost:6379');

      // Should still report healthy if ping succeeds, even if quit fails
      const result = await (service as any).checkRedis();
      expect(result.status).toBe('healthy');
    });

    it('should handle asPromise method failure', async () => {
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockResolvedValue({}),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockImplementation(() => {
          throw new Error('asPromise failed');
        }),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      const result = await (service as any).checkMongoDB();
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('MongoDB连接失败: asPromise failed');
    });

    it('should measure accurate duration for slow operations', async () => {
      const delay = 50;
      const mockConnection = {
        db: {
          admin: jest.fn(() => ({
            ping: jest.fn().mockImplementation(() =>
              new Promise(resolve => setTimeout(resolve, delay))
            ),
          })),
        },
        close: jest.fn().mockResolvedValue(undefined),
        asPromise: jest.fn().mockReturnThis(),
      };
      (mongoose.createConnection as jest.Mock).mockReturnValue(mockConnection);

      configService.get.mockReturnValue('mongodb://localhost:27017/test');

      const result = await (service as any).checkMongoDB();

      expect(result.duration).toBeGreaterThanOrEqual(delay);
      expect(result.duration).toBeLessThan(delay + 100); // Allow some variance
    });

    it('should handle extremely high memory usage correctly', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 99 * 1024 * 1024, // 99MB
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('99%');

      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle zero memory usage edge case', () => {
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        rss: 0,
        external: 0,
        arrayBuffers: 0,
        heapUsed: 0,
        heapTotal: 100 * 1024 * 1024, // 100MB
      });

      const result = (service as any).checkMemory();

      expect(result.status).toBe('healthy');
      expect(result.message).toContain('0%');

      process.memoryUsage = originalMemoryUsage;
    });
  });
});
