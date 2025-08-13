import { Test, TestingModule } from '@nestjs/testing';
import { StorageRepository } from '../../../src/core/public/storage/repositories/storage.repository';

describe('StorageRepository Integration', () => {
  let storageRepository: StorageRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageRepository],
    }).compile();

    storageRepository = module.get<StorageRepository>(StorageRepository);
  });

  it('should be defined', () => {
    expect(storageRepository).toBeDefined();
  });
});
