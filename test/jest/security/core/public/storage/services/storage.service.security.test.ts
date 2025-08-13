import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../../src/core/public/storage/services/storage.service';

describe('StorageService Security', () => {
  let storageService: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    storageService = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(storageService).toBeDefined();
  });
});
