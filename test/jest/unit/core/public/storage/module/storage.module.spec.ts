import { Test, TestingModule } from '@nestjs/testing';
import { StorageModule } from '../../../src/core/public/storage/module/storage.module';

describe('StorageModule', () => {
  let storageModule: StorageModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageModule],
    }).compile();

    storageModule = module.get<StorageModule>(StorageModule);
  });

  it('should be defined', () => {
    expect(storageModule).toBeDefined();
  });
});
