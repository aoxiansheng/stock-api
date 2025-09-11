import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApplicationService } from '../../../../../../src/app/core/services/application.service';
import { LifecycleService } from '../../../../../../src/app/core/services/lifecycle.service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let lifecycleService: LifecycleService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: LifecycleService,
          useValue: {
            registerShutdownHooks: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                APP_NAME: 'test-app',
                APP_VERSION: '1.0.0',
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    lifecycleService = module.get<LifecycleService>(LifecycleService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('基本功能', () => {
    it('应该能够实例化', () => {
      expect(service).toBeDefined();
    });

    it('应该依赖于 LifecycleService 和 ConfigService', () => {
      expect(lifecycleService).toBeDefined();
      expect(configService).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('应该成功执行初始化流程', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(lifecycleService.registerShutdownHooks).toHaveBeenCalled();
    });

    it('应该在初始化时注册关闭钩子', async () => {
      await service.initialize();
      expect(lifecycleService.registerShutdownHooks).toHaveBeenCalledTimes(1);
    });
  });

  describe('onApplicationBootstrap()', () => {
    it('应该成功执行启动完成回调', async () => {
      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });

    it('应该能够多次调用启动完成回调', async () => {
      await service.onApplicationBootstrap();
      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  describe('getApplicationInfo()', () => {
    it('应该返回应用基本信息', () => {
      const info = service.getApplicationInfo();
      
      expect(info).toBeDefined();
      expect(info.name).toBe('test-app');
      expect(info.version).toBe('1.0.0');
      expect(info.environment).toBe('test');
      expect(typeof info.uptime).toBe('number');
    });

    it('应该使用默认值当配置不存在时', () => {
      (configService.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
        return defaultValue;
      });

      const info = service.getApplicationInfo();
      
      expect(info.name).toBe('smart-stock-data');
      expect(info.version).toBe('1.0.0');
      expect(info.environment).toBe('development');
    });
  });

  describe('完整生命周期测试', () => {
    it('应该按顺序执行完整的应用生命周期', async () => {
      // 1. 初始化
      await service.initialize();
      expect(lifecycleService.registerShutdownHooks).toHaveBeenCalled();

      // 2. 启动完成
      await service.onApplicationBootstrap();

      // 3. 获取应用信息
      const info = service.getApplicationInfo();
      expect(info).toBeDefined();
      expect(info.name).toBe('test-app');
    });
  });

  describe('异常处理', () => {
    it('应该处理生命周期服务初始化失败', async () => {
      (lifecycleService.registerShutdownHooks as jest.Mock).mockRejectedValue(
        new Error('LifecycleService initialization failed')
      );

      await expect(service.initialize()).rejects.toThrow('LifecycleService initialization failed');
    });
  });
});