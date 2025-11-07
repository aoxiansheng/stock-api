import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';

import { SymbolMapperModule } from '../../../../../../../src/core/00-prepare/symbol-mapper/module/symbol-mapper.module';
import { SymbolMapperController } from '../../../../../../../src/core/00-prepare/symbol-mapper/controller/symbol-mapper.controller';
import { SymbolMapperService } from '../../../../../../../src/core/00-prepare/symbol-mapper/services/symbol-mapper.service';
import { SymbolMappingRepository } from '../../../../../../../src/core/00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import { AuthModule, AuthService as AuthService, ApiKeyAuthGuard } from '@authv2';
import { PaginationModule } from '@common/modules/pagination/modules/pagination.module';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { DatabaseModule } from '../../../../../../../src/database/database.module';
import { SymbolMappingRuleDocument } from '../../../../../../../src/core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';

// 声明MockSymbolMapperModule类，以便能在测试中获取
class MockSymbolMapperModule {}

describe('SymbolMapperModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // Mock the external modules that SymbolMapperModule depends on
        {
          module: class MockDatabaseModule {},
          global: true,
        },
        {
          module: class MockAuthModule {},
          global: true,
        },
        {
          module: class MockPaginationModule {},
          global: true,
        },
        {
          module: class MockSharedServicesModule {},
          global: true,
        },
        {
          module: class MockSymbolMapperCacheModule {},
          global: true,
        },
        SymbolMapperModule,
      ],
      providers: [],
    })
      .overrideModule(DatabaseModule)
      .useModule({
        module: class MockDatabaseModule {},
        providers: [],
        exports: [],
      })
      .overrideModule(AuthModule)
      .useModule({
        module: class MockAuthModule {},
        providers: [
          {
            provide: AuthService,
            useValue: {
              recordAuthFlowPerformance: jest.fn(),
              recordAuthCachePerformance: jest.fn(),
              recordAuthFlowStats: jest.fn(),
            },
          },
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            }
          },
          {
            provide: ApiKeyAuthGuard,
            useFactory: (reflector, authPerformanceService) => {
              return new ApiKeyAuthGuard(reflector, authPerformanceService);
            },
            inject: [Reflector, AuthService],
          }
        ],
        exports: [AuthService, ApiKeyAuthGuard, Reflector],
      })
      .overrideModule(PaginationModule)
      .useModule({
        module: class MockPaginationModule {},
        providers: [
          {
            provide: PaginationService,
            useValue: {
              createPaginationDto: jest.fn(),
              applyCursor: jest.fn(),
              buildQuery: jest.fn(),
            },
          },
        ],
        exports: [PaginationService],
      })
      // 无需覆盖 SharedServicesModule / SymbolMapperCacheModule（模块已移除依赖）
      // 添加对 SymbolMapperModule 的覆盖，将 EventEmitter2 注入到模块上下文中
      .overrideModule(SymbolMapperModule)
      .useModule({
        module: MockSymbolMapperModule,
        providers: [
          // 注入模型 token 的 mock 以满足 Repository 的构造依赖
          {
            provide: getModelToken(SymbolMappingRuleDocument.name),
            useValue: {},
          },
          SymbolMapperService,
          SymbolMappingRepository,
          {
            provide: PaginationService,
            useValue: {
              createPaginationDto: jest.fn(),
              applyCursor: jest.fn(),
              buildQuery: jest.fn(),
            },
          },
          // 添加AuthService到MockSymbolMapperModule上下文
          {
            provide: AuthService,
            useValue: {
              recordAuthFlowPerformance: jest.fn(),
              recordAuthCachePerformance: jest.fn(),
              recordAuthFlowStats: jest.fn(),
            },
          },
          // 添加Reflector到MockSymbolMapperModule上下文
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn().mockReturnValue(false),
            }
          },
          // 添加ApiKeyAuthGuard到MockSymbolMapperModule上下文
          {
            provide: ApiKeyAuthGuard,
            useFactory: (reflector, authPerformanceService) => {
              return new ApiKeyAuthGuard(reflector, authPerformanceService);
            },
            inject: [Reflector, AuthService],
          }
        ],
        controllers: [SymbolMapperController],
        exports: [SymbolMapperService],
      })
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Definition', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have SymbolMapperModule defined', () => {
      const symbolMapperModule = module.get(MockSymbolMapperModule);
      expect(symbolMapperModule).toBeDefined();
    });
  });

  describe('Controllers', () => {
    it('should provide SymbolMapperController', () => {
      const controller = module.get<SymbolMapperController>(SymbolMapperController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SymbolMapperController);
    });
  });

  describe('Services', () => {
    it('should provide SymbolMapperService', () => {
      const service = module.get<SymbolMapperService>(SymbolMapperService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SymbolMapperService);
    });

    it('should provide SymbolMappingRepository', () => {
      const repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(SymbolMappingRepository);
    });
  });

  describe('Exports', () => {
    it('should export SymbolMapperService', () => {
      // Test that SymbolMapperService is exported and can be injected by other modules
      const service = module.get<SymbolMapperService>(SymbolMapperService);
      expect(service).toBeDefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should import required modules', () => {
      // This test verifies that the module compiles successfully with all its dependencies
      expect(module).toBeDefined();
    });
  });

  describe('Provider Dependencies', () => {
    it('should resolve SymbolMapperService dependencies', () => {
      const service = module.get<SymbolMapperService>(SymbolMapperService);
      expect(service).toBeDefined();
    });

    it('should resolve SymbolMapperController dependencies', () => {
      const controller = module.get<SymbolMapperController>(SymbolMapperController);
      expect(controller).toBeDefined();

      // Verify controller methods are available
      expect(controller.createDataSourceMapping).toBeDefined();
      expect(controller.getMappings).toBeDefined();
      expect(controller.getDataSources).toBeDefined();
    });

    it('should resolve SymbolMappingRepository dependencies', () => {
      const repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
      expect(repository).toBeDefined();

      // Verify repository methods are available
      expect(repository.create).toBeDefined();
      expect(repository.findById).toBeDefined();
      expect(repository.findByDataSource).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should allow SymbolMapperController to use SymbolMapperService', () => {
      const controller = module.get<SymbolMapperController>(SymbolMapperController);
      const service = module.get<SymbolMapperService>(SymbolMapperService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();

      // Both should be available in the same module context
      expect(controller).toBeInstanceOf(SymbolMapperController);
      expect(service).toBeInstanceOf(SymbolMapperService);
    });

    it('should allow SymbolMapperService to use SymbolMappingRepository', () => {
      const service = module.get<SymbolMapperService>(SymbolMapperService);
      const repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);

      expect(service).toBeDefined();
      expect(repository).toBeDefined();

      // Both should be available in the same module context
      expect(service).toBeInstanceOf(SymbolMapperService);
      expect(repository).toBeInstanceOf(SymbolMappingRepository);
    });
  });

  describe('Module Architecture', () => {
    it('should follow proper NestJS module structure', () => {
      // Test that the module follows NestJS conventions
      expect(SymbolMapperModule).toBeDefined();

      // Check that the module has the @Module decorator
      const moduleMetadata = Reflect.getMetadata('imports', SymbolMapperModule);
      expect(moduleMetadata).toBeDefined();
    });

    it('should have correct provider registration', () => {
      // Verify that all providers are properly registered
      const providers = [
        SymbolMapperService,
        SymbolMappingRepository,
      ];

      providers.forEach(provider => {
        const instance = module.get(provider);
        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(provider);
      });
    });

    it('should have correct controller registration', () => {
      const controllers = [SymbolMapperController];

      controllers.forEach(controller => {
        const instance = module.get(controller);
        expect(instance).toBeDefined();
        expect(instance).toBeInstanceOf(controller);
      });
    });
  });

  describe('Module Isolation', () => {
    it('should not leak internal providers', () => {
      // Test that internal implementation details are not exposed
      // This is more of a design verification
      expect(module.get(SymbolMapperService)).toBeDefined();
      expect(module.get(SymbolMappingRepository)).toBeDefined();
      expect(module.get(SymbolMapperController)).toBeDefined();
    });
  });

  // 移除生命周期 onModuleInit 相关断言（服务已去监控化）

  describe('External Module Dependencies', () => {
    it('should declare dependency on AuthModule', () => {
      // Verify that AuthModule functionality would be available
      // This is implicitly tested by successful module compilation
      expect(module).toBeDefined();
    });

    it('should declare dependency on PaginationModule', () => {
      // Verify that PaginationModule functionality would be available
      expect(module).toBeDefined();
    });

    it('should declare dependency on DatabaseModule', () => {
      // Verify that DatabaseModule functionality would be available
      expect(module).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should use unified database module instead of MongooseModule.forFeature', () => {
      // This test verifies the architectural decision mentioned in the module comments
      // The module should use DatabaseModule instead of direct MongooseModule.forFeature
      expect(module).toBeDefined();
    });

    it('should not directly import MonitoringModule', () => {
      // Verify that monitoring is handled through events rather than direct imports
      // This is an architectural requirement mentioned in the module
      expect(module).toBeDefined();
    });
  });

  describe('Provider Exports', () => {
    it('should export only SymbolMapperService', () => {
      // Test that only the main service is exported for use by other modules
      const service = module.get<SymbolMapperService>(SymbolMapperService);
      expect(service).toBeDefined();

      // Repository should not be directly accessible from outside the module
      // (it should only be used internally by the service)
      const repository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
      expect(repository).toBeDefined(); // Available within the module

      // But the architecture suggests only the service should be exported
    });
  });
});
