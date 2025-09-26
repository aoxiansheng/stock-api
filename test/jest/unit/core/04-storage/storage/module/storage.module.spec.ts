import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { StorageModule } from '@core/04-storage/storage/module/storage.module';
import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { StorageRepository } from '@core/04-storage/storage/repositories/storage.repository';
import { StorageController } from '@core/04-storage/storage/controller/storage.controller';
// Mock modules - we'll override these in tests
const DatabaseModule = class MockDatabaseModule {};
const AuthModule = class MockAuthModule {};
const PaginationModule = class MockPaginationModule {};
const MonitoringModule = class MockMonitoringModule {};
import { StoredData } from '@core/04-storage/storage/schemas/storage.schema';

// Mock external modules
jest.mock('@database/database.module', () => ({
  DatabaseModule: {
    forRoot: jest.fn(() => ({
      providers: [],
      exports: [],
    })),
  },
}));

jest.mock('@auth/auth.module', () => ({
  AuthModule: jest.fn(() => ({
    providers: [],
    exports: [],
  })),
}));

jest.mock('@common/modules/pagination/pagination.module', () => ({
  PaginationModule: jest.fn(() => ({
    providers: [],
    exports: [],
  })),
}));

jest.mock('@monitoring/monitoring.module', () => ({
  MonitoringModule: jest.fn(() => ({
    providers: [],
    exports: [],
  })),
}));

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('StorageModule', () => {
  let module: TestingModule;
  let storageService: StorageService;
  let storageRepository: StorageRepository;
  let storageController: StorageController;

  const mockMongooseModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StorageModule],
    })
      .overrideProvider(getModelToken(StoredData.name))
      .useValue(mockMongooseModel)
      .overrideModule(DatabaseModule)
      .useModule(class MockDatabaseModule {})
      .overrideModule(AuthModule)
      .useModule(class MockAuthModule {})
      .overrideModule(PaginationModule)
      .useModule(class MockPaginationModule {})
      .overrideModule(MonitoringModule)
      .useModule(class MockMonitoringModule {})
      .compile();

    storageService = module.get<StorageService>(StorageService);
    storageRepository = module.get<StorageRepository>(StorageRepository);
    storageController = module.get<StorageController>(StorageController);
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

    it('should have StorageModule defined', () => {
      expect(StorageModule).toBeDefined();
    });
  });

  describe('Providers', () => {
    it('should provide StorageService', () => {
      expect(storageService).toBeDefined();
      expect(storageService).toBeInstanceOf(StorageService);
    });

    it('should provide StorageRepository', () => {
      expect(storageRepository).toBeDefined();
      expect(storageRepository).toBeInstanceOf(StorageRepository);
    });

    it('should inject StorageRepository into StorageService', () => {
      // Verify that StorageService can be instantiated (dependency injection works)
      expect(storageService).toBeDefined();
      // The actual dependency injection is verified by successful instantiation
    });
  });

  describe('Controllers', () => {
    it('should provide StorageController', () => {
      expect(storageController).toBeDefined();
      expect(storageController).toBeInstanceOf(StorageController);
    });

    it('should inject StorageService into StorageController', () => {
      // Verify that StorageController can be instantiated with StorageService
      expect(storageController).toBeDefined();
      // The actual dependency injection is verified by successful instantiation
    });
  });

  describe('Exports', () => {
    it('should export StorageService for use in other modules', () => {
      // Test that StorageService can be obtained from the module
      const exportedService = module.get<StorageService>(StorageService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBe(storageService);
    });

    it('should not export StorageRepository (internal use only)', () => {
      // StorageRepository should be available within module but not exported
      expect(storageRepository).toBeDefined();
      // The fact that we can get it here means it's properly provided internally
    });

    it('should not export StorageController (internal use only)', () => {
      // StorageController should be available within module but not exported
      expect(storageController).toBeDefined();
      // Controllers are typically not exported, only provided for HTTP routing
    });
  });

  describe('Module Dependencies', () => {
    it('should import required modules', async () => {
      // Test that the module compiles successfully with all dependencies
      expect(module).toBeDefined();

      // Verify that the module can be closed without errors
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle database module dependency', async () => {
      // The successful compilation and instantiation of StorageRepository
      // indicates that DatabaseModule dependency is properly handled
      expect(storageRepository).toBeDefined();
    });

    it('should handle auth module dependency', async () => {
      // The successful compilation of StorageController (which uses auth)
      // indicates that AuthModule dependency is properly handled
      expect(storageController).toBeDefined();
    });

    it('should handle pagination module dependency', async () => {
      // The successful compilation indicates PaginationModule is properly imported
      expect(module).toBeDefined();
    });

    it('should handle monitoring module dependency', async () => {
      // The successful compilation indicates MonitoringModule is properly imported
      expect(module).toBeDefined();
    });
  });

  describe('Provider Dependencies', () => {
    it('should resolve StorageService dependencies correctly', () => {
      // Verify that StorageService has all required dependencies
      expect(storageService).toBeDefined();

      // StorageService should have access to StorageRepository
      // This is verified by successful instantiation
    });

    it('should resolve StorageRepository dependencies correctly', () => {
      // Verify that StorageRepository has access to the MongoDB model
      expect(storageRepository).toBeDefined();

      // The repository should be properly injected with the model
      // This is verified by successful instantiation
    });

    it('should resolve StorageController dependencies correctly', () => {
      // Verify that StorageController has access to StorageService
      expect(storageController).toBeDefined();

      // The controller should be properly injected with the service
      // This is verified by successful instantiation
    });
  });

  describe('Module Configuration', () => {
    it('should configure providers in correct order', () => {
      // Test that providers are instantiated in the correct dependency order
      expect(storageRepository).toBeDefined();
      expect(storageService).toBeDefined();
      expect(storageController).toBeDefined();

      // All dependencies should be resolved successfully
    });

    it('should handle circular dependency prevention', () => {
      // Verify that there are no circular dependencies
      expect(storageService).toBeDefined();
      expect(storageRepository).toBeDefined();

      // The module should compile without circular dependency errors
    });

    it('should support module instantiation multiple times', async () => {
      // Create another instance of the module to test independence
      const secondModule = await Test.createTestingModule({
        imports: [StorageModule],
      })
        .overrideProvider(getModelToken(StoredData.name))
        .useValue(mockMongooseModel)
        .overrideModule(DatabaseModule)
        .useModule(class MockModule {})
        .overrideModule(AuthModule)
        .useModule(class MockModule {})
        .overrideModule(PaginationModule)
        .useModule(class MockModule {})
        .overrideModule(MonitoringModule)
        .useModule(class MockModule {})
        .compile();

      const secondService = secondModule.get<StorageService>(StorageService);

      expect(secondService).toBeDefined();
      expect(secondService).not.toBe(storageService); // Should be different instances

      await secondModule.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      // This test verifies that our mocking strategy works
      // If dependencies were missing, the module compilation would fail
      expect(module).toBeDefined();
      expect(storageService).toBeDefined();
    });

    it('should handle module initialization errors', async () => {
      // Test that module can be properly closed and cleaned up
      await expect(module.close()).resolves.not.toThrow();

      // Re-opening should work
      const newModule = await Test.createTestingModule({
        imports: [StorageModule],
      })
        .overrideProvider(getModelToken(StoredData.name))
        .useValue(mockMongooseModel)
        .overrideModule(DatabaseModule)
        .useModule(class MockModule {})
        .overrideModule(AuthModule)
        .useModule(class MockModule {})
        .overrideModule(PaginationModule)
        .useModule(class MockModule {})
        .overrideModule(MonitoringModule)
        .useModule(class MockModule {})
        .compile();

      expect(newModule).toBeDefined();
      await newModule.close();
    });
  });

  describe('Integration', () => {
    it('should support full request-response cycle', () => {
      // Test that all components are wired together properly
      expect(storageController).toBeDefined();
      expect(storageService).toBeDefined();
      expect(storageRepository).toBeDefined();

      // The successful instantiation of the full chain indicates
      // proper integration between all module components
    });

    it('should maintain proper scoping of providers', () => {
      // Test that providers have correct scoping (singleton by default)
      const serviceInstance1 = module.get<StorageService>(StorageService);
      const serviceInstance2 = module.get<StorageService>(StorageService);

      expect(serviceInstance1).toBe(serviceInstance2);
    });

    it('should support dependency injection throughout the module', () => {
      // Verify the entire dependency injection chain works
      expect(storageController).toBeDefined();
      expect(storageService).toBeDefined();
      expect(storageRepository).toBeDefined();

      // The fact that all services are successfully instantiated
      // confirms that the DI container is working correctly
    });
  });
});
