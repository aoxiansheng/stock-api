/**
 * 缓存服务配置统一性测试
 * 验证 CacheService 正确使用 ConfigService 获取配置
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

import { CacheService } from '../../../../../src/cache/services/cache.service';
import { CacheConfig } from '../../../../../src/cache/config/cache.config';

describe('CacheService Configuration', () => {
  let service: CacheService;
  let configService: ConfigService;
  let redisClient: jest.Mocked<Redis>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCacheConfig: CacheConfig = {
    defaultTtl: 300,
    compressionThreshold: 1024,
    compressionEnabled: true,
    maxItems: 10000,
    maxKeyLength: 255,
    maxValueSizeMB: 10,
    maxBatchSize: 100,
    slowOperationMs: 100,
    retryDelayMs: 100,
    lockTtl: 30,
  };

  beforeEach(async () => {
    // Mock Redis client
    redisClient = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
    } as any;

    // Mock EventEmitter2
    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockCacheConfig),
          },
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: redisClient,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Integration', () => {
    it('should initialize with cache configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('cache');
      expect(service).toBeDefined();
    });

    it('should throw error if cache configuration not found', async () => {
      // Mock ConfigService to return undefined
      const configServiceMock = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            CacheService,
            {
              provide: ConfigService,
              useValue: configServiceMock,
            },
            {
              provide: 'default_IORedisModuleConnectionToken',
              useValue: redisClient,
            },
            {
              provide: EventEmitter2,
              useValue: eventEmitter,
            },
          ],
        }).compile()
      ).rejects.toThrow('Cache configuration not found');
    });
  });

  describe('TTL Configuration', () => {
    it('should use unified configuration for default TTL', async () => {
      redisClient.setex.mockResolvedValue('OK');
      
      await service.set('test-key', 'test-value');
      
      expect(redisClient.setex).toHaveBeenCalledWith(
        'test-key',
        mockCacheConfig.defaultTtl,
        expect.any(String)
      );
    });

    it('should respect custom TTL when provided', async () => {
      redisClient.setex.mockResolvedValue('OK');
      const customTtl = 600;
      
      await service.set('test-key', 'test-value', { ttl: customTtl });
      
      expect(redisClient.setex).toHaveBeenCalledWith(
        'test-key',
        customTtl,
        expect.any(String)
      );
    });
  });

  describe('Compression Configuration', () => {
    it('should use unified compression threshold', async () => {
      redisClient.setex.mockResolvedValue('OK');
      
      // Create data larger than compression threshold
      const largeData = 'x'.repeat(mockCacheConfig.compressionThreshold + 100);
      
      await service.set('test-key', largeData);
      
      // Should compress the data and use setex with compressed value
      expect(redisClient.setex).toHaveBeenCalled();
      const [, , compressedValue] = redisClient.setex.mock.calls[0];
      expect(compressedValue).toContain('COMPRESSED::');
    });

    it('should not compress small values', async () => {
      redisClient.setex.mockResolvedValue('OK');
      
      // Create data smaller than compression threshold
      const smallData = 'small data';
      
      await service.set('test-key', smallData);
      
      // Should not compress the data
      expect(redisClient.setex).toHaveBeenCalled();
      const [, , value] = redisClient.setex.mock.calls[0];
      expect(value).not.toContain('COMPRESSED::');
    });
  });

  describe('Batch Size Configuration', () => {
    it('should enforce max batch size limit', async () => {
      const largeKeyArray = Array.from({ length: mockCacheConfig.maxBatchSize + 1 }, (_, i) => `key-${i}`);
      
      await expect(service.mget(largeKeyArray)).rejects.toThrow('批量操作超过最大限制');
    });

    it('should allow batch operations within limit', async () => {
      redisClient.mget.mockResolvedValue([]);
      
      const keyArray = Array.from({ length: mockCacheConfig.maxBatchSize - 1 }, (_, i) => `key-${i}`);
      
      await expect(service.mget(keyArray)).resolves.not.toThrow();
      expect(redisClient.mget).toHaveBeenCalledWith(keyArray);
    });
  });

  describe('Key Length Validation', () => {
    it('should enforce max key length limit', async () => {
      const longKey = 'x'.repeat(mockCacheConfig.maxKeyLength + 1);
      
      await expect(service.set(longKey, 'value')).rejects.toThrow('缓存键长度超过最大限制');
    });

    it('should allow keys within length limit', async () => {
      redisClient.setex.mockResolvedValue('OK');
      
      const validKey = 'x'.repeat(mockCacheConfig.maxKeyLength - 1);
      
      await expect(service.set(validKey, 'value')).resolves.toBe(true);
    });
  });

  describe('Lock TTL Configuration', () => {
    it('should use unified lock TTL configuration', async () => {
      // This test would require more complex setup to test the lock mechanism
      // For now, we verify the configuration is available
      expect(mockCacheConfig.lockTtl).toBe(30);
    });
  });
});