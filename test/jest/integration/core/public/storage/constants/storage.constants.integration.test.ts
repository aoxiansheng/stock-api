import { Test, TestingModule } from '@nestjs/testing';
import { StorageConstants } from '../../../src/core/public/storage/constants/storage.constants';

describe('StorageConstants Integration', () => {
  let storageConstants: StorageConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageConstants],
    }).compile();

    storageConstants = module.get<StorageConstants>(StorageConstants);
  });

  it('should be defined', () => {
    expect(storageConstants).toBeDefined();
  });
});
