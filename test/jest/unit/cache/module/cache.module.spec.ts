import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@cache/module/cache.module';
import { CacheService } from '@cache/services/cache.service';
import { CacheStatusController } from '@cache/controllers/cache-status.controller';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

// Mock PaginationService since it's not part of cache module
const mockPaginationService = {
  normalizePaginationQuery: jest.fn(),
  createPaginatedResponse: jest.fn(),
};

describe('CacheModule', () => {
  let module: TestingModule;
  let configService: ConfigService;
  let cacheService: CacheService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    pipeline: jest.fn(),
    scan: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    lrange: jest.fn(),
    sadd: jest.fn(),
    sismember: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),
    hincrby: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
    expire: jest.fn(),
    eval: jest.fn(),
    zcard: jest.fn(),
    zrange: jest.fn(),
    incr: jest.fn(),
  };

  const mockCacheConfig = {
    defaultTtl: 300,
    compressionThreshold: 1024,
    maxBatchSize: 100,
    lockTtl: 30,
    retryDelayMs: 100,
    slowOperationMs: 1000,
    strongTimelinessTtl: 5,
    realtimeTtl: 60,
    longTermTtl: 3600,
    monitoringTtl: 300,
    authTtl: 600,
    transformerTtl: 900,
    suggestionTtl: 1800,
    maxValueSizeMB: 10,
    compressionEnabled: true,
    maxItems: 10000,
    maxKeyLength: 255,
    maxCacheSize: 10000,
    lruSortBatchSize: 1000,
    smartCacheMaxBatch: 50,
    maxCacheSizeMB: 1024
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        CacheModule,
        ConfigModule.forRoot({
          load: [() => ({ cacheUnified: mockCacheConfig })],
          isGlobal: true,
        }),
      ],
      providers: [
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: 'PaginationService',
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide CacheService', () => {
      expect(cacheService).toBeDefined();
      expect(cacheService).toBeInstanceOf(CacheService);
    });

    it('should provide ConfigService', () => {
      expect(configService).toBeDefined();
      expect(configService).toBeInstanceOf(ConfigService);
    });

    it('should provide PaginationService', () => {
      const paginationService = module.get('PaginationService');
      expect(paginationService).toBeDefined();
      expect(paginationService).toBe(mockPaginationService);
    });

    it('should register CacheStatusController', () => {
      const controller = module.get<CacheStatusController>(CacheStatusController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CacheStatusController);
    });
  });

  describe('Configuration Provider', () => {
    it('should provide cacheUnified configuration', () => {
      const cacheUnified = module.get('cacheUnified');
      expect(cacheUnified).toBeDefined();
      expect(cacheUnified).toEqual(mockCacheConfig);
    });

    it('should have correct configuration structure', () => {
      const cacheUnified = module.get('cacheUnified');

      // TTL configurations
      expect(cacheUnified.defaultTtl).toBe(300);
      expect(cacheUnified.strongTimelinessTtl).toBe(5);
      expect(cacheUnified.realtimeTtl).toBe(60);
      expect(cacheUnified.longTermTtl).toBe(3600);
      expect(cacheUnified.monitoringTtl).toBe(300);
      expect(cacheUnified.authTtl).toBe(600);

      // Performance configurations
      expect(cacheUnified.compressionThreshold).toBe(1024);
      expect(cacheUnified.compressionEnabled).toBe(true);
      expect(cacheUnified.maxBatchSize).toBe(100);

      // Operational configurations
      expect(cacheUnified.slowOperationMs).toBe(1000);
      expect(cacheUnified.lockTtl).toBe(30);
      expect(cacheUnified.retryDelayMs).toBe(100);
    });

    it('should inject configuration into CacheService', () => {
      // Test that CacheService can access the configuration
      expect(cacheService.getClient()).toBe(mockRedis);

      // Test TTL methods that depend on configuration
      expect(cacheService.getTtlByTimeliness('strong')).toBe(5);
      expect(cacheService.getTtlByTimeliness('weak')).toBe(300);
      expect(cacheService.getTtlByTimeliness('long')).toBe(3600);
    });
  });

  describe('Module Dependencies', () => {
    it('should have correct imports', () => {
      // This is tested implicitly by successful module compilation
      expect(module).toBeDefined();
    });

    it('should export CacheService', () => {
      // CacheService should be available for injection in other modules
      const exportedCacheService = module.get<CacheService>(CacheService);
      expect(exportedCacheService).toBe(cacheService);
    });

    it('should export PaginationService', () => {
      const exportedPaginationService = module.get('PaginationService');
      expect(exportedPaginationService).toBeDefined();
    });

    it('should export cacheUnified configuration', () => {
      const exportedConfig = module.get('cacheUnified');
      expect(exportedConfig).toBeDefined();
      expect(exportedConfig).toEqual(mockCacheConfig);
    });
  });

  describe('Controller Registration', () => {
    it('should register CacheStatusController', () => {
      const controller = module.get<CacheStatusController>(CacheStatusController);
      expect(controller).toBeDefined();
    });
  });

  describe('Configuration Loading', () => {
    it('should load cache unified configuration from ConfigService', () => {
      const config = configService.get('cacheUnified');
      expect(config).toEqual(mockCacheConfig);
    });

    it('should use factory function for cacheUnified provider', () => {
      const cacheUnified = module.get('cacheUnified');
      const configFromService = configService.get('cacheUnified');
      expect(cacheUnified).toEqual(configFromService);
    });
  });

  describe('Service Integration', () => {
    it('should integrate CacheService with configuration', () => {
      // Test that CacheService uses the injected configuration
      expect(() => {
        cacheService.getTtlByTimeliness('monitoring');
      }).not.toThrow();

      expect(cacheService.getTtlByTimeliness('monitoring')).toBe(300);
    });

    it('should integrate CacheService with Redis client', () => {
      const client = cacheService.getClient();
      expect(client).toBe(mockRedis);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration gracefully', async () => {
      // Test module creation without configuration should fail appropriately
      await expect(
        Test.createTestingModule({
          imports: [CacheModule],
          providers: [
            {
              provide: 'default_IORedisModuleConnectionToken',
              useValue: mockRedis,
            },
            {
              provide: EventEmitter2,
              useValue: { emit: jest.fn() },
            },
          ],
        }).compile()
      ).rejects.toThrow();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize without errors', () => {
      expect(module).toBeDefined();
      expect(cacheService).toBeDefined();
    });

    it('should close gracefully', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });
  });
});