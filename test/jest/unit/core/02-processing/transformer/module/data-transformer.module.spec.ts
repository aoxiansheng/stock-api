import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { TransformerModule } from '../../../../../../../src/core/02-processing/transformer/module/data-transformer.module';
import { DataTransformerService } from '../../../../../../../src/core/02-processing/transformer/services/data-transformer.service';
import { DataTransformerController } from '../../../../../../../src/core/02-processing/transformer/controller/data-transformer.controller';

describe('TransformerModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockAuthModule = {
      module: class MockAuthModule {},
      providers: [],
      exports: [],
    };

    const mockDataMapperModule = {
      module: class MockDataMapperModule {},
      providers: [],
      exports: [],
    };

    const mockMonitoringModule = {
      module: class MockMonitoringModule {},
      providers: [],
      exports: [],
    };

    module = await Test.createTestingModule({
      imports: [
        TransformerModule,
        EventEmitterModule.forRoot(),
      ],
    })
      .overrideModule(require('../../../../../../../src/auth/module/auth.module').AuthModule)
      .useModule(mockAuthModule.module)
      .overrideModule(require('../../../../../../../src/core/00-prepare/data-mapper/module/data-mapper.module').DataMapperModule)
      .useModule(mockDataMapperModule.module)
      .overrideModule(require('../../../../../../../src/monitoring/monitoring.module').MonitoringModule)
      .useModule(mockMonitoringModule.module)
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

    it('should compile without errors', async () => {
      expect(module).toBeDefined();
      expect(module.get).toBeDefined();
    });
  });

  describe('Module Dependencies', () => {
    it('should import required modules', () => {
      const moduleMetadata = Reflect.getMetadata('imports', TransformerModule);

      expect(moduleMetadata).toBeDefined();
      expect(moduleMetadata.length).toBeGreaterThan(0);
    });

    it('should include EventEmitterModule for event-driven monitoring', async () => {
      const eventEmitter = module.get('EventEmitter2', { strict: false });
      expect(eventEmitter).toBeDefined();
    });
  });

  describe('Module Providers', () => {
    it('should provide DataTransformerService', async () => {
      const service = module.get<DataTransformerService>(DataTransformerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataTransformerService);
    });

    it('should export DataTransformerService', () => {
      const moduleMetadata = Reflect.getMetadata('exports', TransformerModule);
      expect(moduleMetadata).toContain(DataTransformerService);
    });
  });

  describe('Module Controllers', () => {
    it('should provide DataTransformerController', async () => {
      const controller = module.get<DataTransformerController>(DataTransformerController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(DataTransformerController);
    });

    it('should register controllers correctly', () => {
      const moduleMetadata = Reflect.getMetadata('controllers', TransformerModule);
      expect(moduleMetadata).toContain(DataTransformerController);
    });
  });

  describe('Module Configuration', () => {
    it('should have proper module structure', () => {
      const imports = Reflect.getMetadata('imports', TransformerModule);
      const controllers = Reflect.getMetadata('controllers', TransformerModule);
      const providers = Reflect.getMetadata('providers', TransformerModule);
      const exports = Reflect.getMetadata('exports', TransformerModule);

      expect(imports).toBeDefined();
      expect(controllers).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();

      expect(imports.length).toBeGreaterThanOrEqual(4); // AuthModule, DataMapperModule, EventEmitterModule, MonitoringModule
      expect(controllers.length).toBe(1); // DataTransformerController
      expect(providers.length).toBe(1); // DataTransformerService
      expect(exports.length).toBe(1); // DataTransformerService
    });

    it('should be a NestJS module', () => {
      const moduleMetadata = Reflect.getMetadata('__module:metadata', TransformerModule);
      expect(moduleMetadata).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    it('should inject dependencies correctly in DataTransformerService', async () => {
      const service = module.get<DataTransformerService>(DataTransformerService);
      expect(service).toBeDefined();

      // Test that service has required dependencies
      expect(service).toHaveProperty('transform');
      expect(service).toHaveProperty('batchTransform');
    });
  });

  describe('Controller Dependencies', () => {
    it('should inject DataTransformerService into DataTransformerController', async () => {
      const controller = module.get<DataTransformerController>(DataTransformerController);
      expect(controller).toBeDefined();

      // Test that controller has required dependencies
      expect(controller).toHaveProperty('transform');
      expect(controller).toHaveProperty('batchTransform');
    });
  });

  describe('Module Integration', () => {
    it('should work with mocked dependencies', async () => {
      const service = module.get<DataTransformerService>(DataTransformerService);
      const controller = module.get<DataTransformerController>(DataTransformerController);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();
    });

    it('should support event-driven architecture', async () => {
      const eventEmitter = module.get('EventEmitter2', { strict: false });
      expect(eventEmitter).toBeDefined();
      expect(typeof eventEmitter.emit).toBe('function');
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      const service = module.get<DataTransformerService>(DataTransformerService);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('DataTransformerService');
    });

    it('should clean up resources on close', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });
  });
});
