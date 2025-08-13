import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from '../../../src/core/public/storage/controller/storage.controller';

describe('StorageController Integration', () => {
  let storageController: StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageController],
    }).compile();

    storageController = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(storageController).toBeDefined();
  });
});
