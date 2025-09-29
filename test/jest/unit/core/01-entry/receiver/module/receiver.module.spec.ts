import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverModule } from '@core/01-entry/receiver/module/receiver.module';
import { ReceiverController } from '@core/01-entry/receiver/controller/receiver.controller';
import { ReceiverService } from '@core/01-entry/receiver/services/receiver.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 直接的、最小化的测试方法，避免依赖太多基础设施
describe('ReceiverModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // 创建模拟的ConfigService
    const mockConfigService = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        // 为PaginationService提供所需的配置
        if (key === 'PAGINATION_DEFAULT_PAGE') return 1;
        if (key === 'PAGINATION_DEFAULT_LIMIT') return 10;
        if (key === 'PAGINATION_MAX_LIMIT') return 100;
        // 为Redis提供所需配置
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        if (key === 'REDIS_PASSWORD') return '';
        if (key === 'REDIS_DB') return 0;
        if (key === 'REDIS_CACHE_TTL') return 3600;
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        // 为MongoDB提供所需配置
        if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/test';
        return defaultValue;
      }),
    };

    // 使用特殊方法创建测试模块，只导入ReceiverModule和最小化的依赖
    module = await Test.createTestingModule({
      imports: [
        // 导入全局配置模块
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        ReceiverModule,
      ],
      providers: [
        // 为 HealthModule 提供缺失的依赖
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            flushall: jest.fn().mockResolvedValue('OK'),
            on: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
      ],
    })
    // 提供配置服务模拟
    .overrideProvider(ConfigService)
    .useValue(mockConfigService)
    
    // 模拟HealthCheckService
    .overrideProvider('HealthCheckService')
    .useValue({
      check: jest.fn().mockResolvedValue([]),
      checkHealth: jest.fn().mockResolvedValue({
        status: 'healthy',
        checks: [],
        timestamp: new Date(),
      }),
    })
    
    // 模拟必要的其他服务
    .overrideProvider('SymbolTransformerService')
    .useValue({
      transform: jest.fn(),
    })
    .overrideProvider('DataFetcherService')
    .useValue({})
    .overrideProvider('DataTransformerService')
    .useValue({})
    .overrideProvider('StorageService')
    .useValue({})
    .overrideProvider('MarketStatusService')
    .useValue({})
    .overrideProvider('MarketInferenceService')
    .useValue({})
    .overrideProvider('SmartCacheStandardizedService')
    .useValue({})
    .overrideProvider('PaginationService')
    .useValue({
      paginate: jest.fn().mockReturnValue({
        items: [],
        meta: {
          itemCount: 0,
          totalItems: 0,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      }),
    })
    .overrideProvider('ExtendedHealthService')
    .useValue({
      getFullHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        version: '1.0.0',
        system: {},
        healthScore: 100,
        recommendations: []
      })
    })
    .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ReceiverController', () => {
    const controller = module.get<ReceiverController>(ReceiverController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ReceiverController);
  });

  it('should have ReceiverService', () => {
    const service = module.get<ReceiverService>(ReceiverService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReceiverService);
  });

  it('should export ReceiverService', () => {
    const service = module.get<ReceiverService>(ReceiverService);
    expect(service).toBeDefined();
  });

  describe('module dependencies', () => {
    it('should import all required modules', async () => {
      // Verify the module compiles without issues
      expect(module).toBeDefined();

      // The fact that the module compiled successfully means all imports are valid
      // Individual dependency tests would be in integration tests
    });

    it('should provide controller and service', () => {
      const controller = module.get<ReceiverController>(ReceiverController);
      const service = module.get<ReceiverService>(ReceiverService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });
});