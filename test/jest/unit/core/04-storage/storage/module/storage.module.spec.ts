import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { StorageModule } from '@core/04-storage/storage/module/storage.module';
import { StorageService } from '@core/04-storage/storage/services/storage.service';
import { StoredData } from '@core/04-storage/storage/schemas/storage.schema';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';

// To keep the test isolated, we must prevent the real modules from being loaded.
// We replace them with simple mock classes.
import { DatabaseModule } from '../../../../../../../src/database/database.module';
import { AuthModule } from '@authv2';
import { PaginationModule } from '../../../../../../../src/common/modules/pagination/modules/pagination.module';
// import { MonitoringModule } from '../../../../../../../src/monitoring/monitoring.module';

class MockModule {}

describe('StorageModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StorageModule],
      // We add mock providers for the services that StorageService depends on.
      // This solves the "can't resolve dependencies" error.
      providers: [
        {
          provide: PaginationService,
          useValue: {}, // An empty object is enough to satisfy the dependency injection.
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() }, // Mock with a spy for emit method.
        },
      ],
    })
      // We must override the modules that StorageModule imports to avoid
      // loading their real implementations and all their dependencies (like database connections).
      .overrideModule(DatabaseModule)
      .useModule(MockModule)
      .overrideModule(AuthModule)
      .useModule(MockModule)
      .overrideModule(PaginationModule)
      .useModule(MockModule)
      // .overrideModule(MonitoringModule) // 已删除 monitoring 模块
      // .useModule(MockModule)
      // Finally, we provide a mock for the Mongoose model required by StorageRepository.
      .overrideProvider(getModelToken(StoredData.name))
      .useValue({})
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should compile the module successfully', () => {
    // If beforeEach completes without throwing an error, the module has compiled.
    expect(module).toBeDefined();
  });

  it('should resolve the StorageService', () => {
    // This test verifies that StorageService is available in the module's container
    // and that its dependencies have been correctly injected.
    const service = module.get<StorageService>(StorageService);
    expect(service).toBeDefined();
  });
});
