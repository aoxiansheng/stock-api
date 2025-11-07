import { TestingModule, Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TestInfrastructureModule } from '../modules/test-infrastructure.module';
import { TestCacheModule } from '../modules/test-cache.module';
// import { TestAuthModule } from '../modules/test-auth.module'; // 已删除 - auth 迁移到 authv2
import { TestDatabaseModule } from '../modules/test-database.module';

/**
 * 单元测试设置工具类
 * 提供标准化的测试模块创建和配置方法
 */
export class UnitTestSetup {
  /**
   * 创建基础测试模块（包含基础设施）
   */
  static async createBasicTestModule(moduleConfig: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
    exports?: any[];
  }): Promise<TestingModule> {
    const { imports = [], providers = [], controllers = [], exports = [] } = moduleConfig;

    return await Test.createTestingModule({
      imports: [
        TestInfrastructureModule,  // 自动包含基础配置
        ...imports,
      ],
      providers: [
        ...providers,
      ],
      controllers: [
        ...controllers,
      ],
      exports: [
        ...exports,
      ],
    }).compile();
  }

  /**
   * 创建缓存相关测试模块
   */
  static async createCacheTestModule(moduleConfig: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
    exports?: any[];
  }): Promise<TestingModule> {
    const { imports = [], providers = [], controllers = [], exports = [] } = moduleConfig;

    return await Test.createTestingModule({
      imports: [
        TestCacheModule,  // 包含Redis Mock和缓存配置
        ...imports,
      ],
      providers: [
        ...providers,
      ],
      controllers: [
        ...controllers,
      ],
      exports: [
        ...exports,
      ],
    }).compile();
  }

  /**
   * 创建认证相关测试模块
   * @deprecated auth 已迁移到 authv2，此方法已禁用
   */
  // static async createAuthTestModule(moduleConfig: {
  //   imports?: any[];
  //   providers?: any[];
  //   controllers?: any[];
  //   exports?: any[];
  // }): Promise<TestingModule> {
  //   const { imports = [], providers = [], controllers = [], exports = [] } = moduleConfig;

  //   return await Test.createTestingModule({
  //     imports: [
  //       TestAuthModule,  // 包含认证相关的所有Mock和配置
  //       ...imports,
  //     ],
  //     providers: [
  //       ...providers,
  //     ],
  //     controllers: [
  //       ...controllers,
  //     ],
  //     exports: [
  //       ...exports,
  //     ],
  //   }).compile();
  // }

  /**
   * 创建基础测试模块（带模块覆盖功能）
   */
  static async createBasicTestModuleWithOverrides(moduleConfig: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
    exports?: any[];
    overrides?: Array<{
      module: any;
      override: any;
    }>;
  }): Promise<TestingModule> {
    const { imports = [], providers = [], controllers = [], exports = [], overrides = [] } = moduleConfig;

    const testModule = Test.createTestingModule({
      imports: [
        TestInfrastructureModule,  // 基础配置
        ...imports,
      ],
      providers: [
        ...providers,
      ],
      controllers: [
        ...controllers,
      ],
      exports: [
        ...exports,
      ],
    });

    // 应用模块覆盖
    overrides.forEach(({ module, override }) => {
      testModule.overrideModule(module).useModule(override);
    });

    return await testModule.compile();
  }

  /**
   * 创建数据库相关测试模块
   */
  static async createDatabaseTestModule(moduleConfig: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
    exports?: any[];
  }): Promise<TestingModule> {
    const { imports = [], providers = [], controllers = [], exports = [] } = moduleConfig;

    return await Test.createTestingModule({
      imports: [
        TestDatabaseModule,  // 包含MongoDB Mock
        ...imports,
      ],
      providers: [
        ...providers,
      ],
      controllers: [
        ...controllers,
      ],
      exports: [
        ...exports,
      ],
    }).compile();
  }

  /**
   * 创建完整测试模块（包含所有基础设施）
   */
  static async createFullTestModule(moduleConfig: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
    exports?: any[];
  }): Promise<TestingModule> {
    const { imports = [], providers = [], controllers = [], exports = [] } = moduleConfig;

    return await Test.createTestingModule({
      imports: [
        TestInfrastructureModule,
        TestCacheModule,
        TestDatabaseModule,
        ...imports,
      ],
      providers: [
        ...providers,
      ],
      controllers: [
        ...controllers,
      ],
      exports: [
        ...exports,
      ],
    }).compile();
  }

  /**
   * 创建模拟服务提供者
   */
  static createMockProvider<T>(
    token: string | symbol | any,
    mockImplementation: Partial<T>
  ) {
    return {
      provide: token,
      useValue: mockImplementation,
    };
  }

  /**
   * 创建模拟配置提供者
   */
  static createMockConfigProvider(configKey: string, configValue: any) {
    return {
      provide: configKey,
      useValue: configValue,
    };
  }

  /**
   * 创建模拟工厂提供者
   */
  static createMockFactoryProvider<T>(
    token: string | symbol | any,
    factory: (...args: any[]) => T,
    inject: any[] = []
  ) {
    return {
      provide: token,
      useFactory: factory,
      inject,
    };
  }

  /**
   * 覆盖现有提供者
   */
  static overrideProvider<T>(
    testingModuleBuilder: any,
    token: string | symbol | any,
    mockImplementation: Partial<T>
  ) {
    return testingModuleBuilder.overrideProvider(token).useValue(mockImplementation);
  }

  /**
   * 覆盖Guard
   */
  static overrideGuard(
    testingModuleBuilder: any,
    guardClass: any,
    mockImplementation: any = { canActivate: jest.fn().mockReturnValue(true) }
  ) {
    return testingModuleBuilder.overrideGuard(guardClass).useValue(mockImplementation);
  }

  /**
   * 覆盖Interceptor
   */
  static overrideInterceptor(
    testingModuleBuilder: any,
    interceptorClass: any,
    mockImplementation: any = { intercept: jest.fn().mockImplementation((context, next) => next.handle()) }
  ) {
    return testingModuleBuilder.overrideInterceptor(interceptorClass).useValue(mockImplementation);
  }

  /**
   * 覆盖Filter
   */
  static overrideFilter(
    testingModuleBuilder: any,
    filterClass: any,
    mockImplementation: any = { catch: jest.fn() }
  ) {
    return testingModuleBuilder.overrideFilter(filterClass).useValue(mockImplementation);
  }

  /**
   * 获取配置服务
   */
  static getConfigService(module: TestingModule): ConfigService {
    return module.get<ConfigService>(ConfigService);
  }

  /**
   * 获取服务实例
   */
  static getService<T>(module: TestingModule, token: string | symbol | any): T {
    return module.get<T>(token);
  }

  /**
   * 验证模块编译
   */
  static validateModuleCompilation(module: TestingModule): void {
    expect(module).toBeDefined();
    expect(module).toBeInstanceOf(Object);
  }

  /**
   * 验证服务注入
   */
  static async validateServiceInjection<T>(
    module: TestingModule,
    token: string | symbol | any,
    expectedClass?: any
  ): Promise<T> {
    let service: T;
    try {
      service = module.get<T>(token);
    } catch (error) {
      // 如果是作用域提供者，尝试使用 resolve()
      if (error.message?.includes('scoped provider')) {
        service = await module.resolve<T>(token);
      } else {
        throw error;
      }
    }

    expect(service).toBeDefined();

    if (expectedClass) {
      expect(service).toBeInstanceOf(expectedClass);
    }

    return service;
  }

  /**
   * 清理测试环境
   */
  static async cleanupModule(module: TestingModule): Promise<void> {
    if (module) {
      await module.close();
    }
  }

  /**
   * 创建测试执行上下文
   */
  static async createTestContext(
    createModuleFn: () => Promise<TestingModule>
  ) {
    let module: TestingModule;

    const setup = async () => {
      module = await createModuleFn();
    };

    const cleanup = async () => {
      if (module) {
        await module.close();
      }
    };

    const getModule = () => module;

    return {
      setup,
      cleanup,
      getModule,
      getService: async <T>(token: string | symbol | any) => {
        try {
          return module.get<T>(token);
        } catch (error) {
          // 如果是作用域提供者，尝试使用 resolve()
          if (error.message?.includes('scoped provider')) {
            return await module.resolve<T>(token);
          }
          throw error;
        }
      },
      validateService: async <T>(token: string | symbol | any, expectedClass?: any) =>
        await UnitTestSetup.validateServiceInjection<T>(module, token, expectedClass),
    };
  }
}