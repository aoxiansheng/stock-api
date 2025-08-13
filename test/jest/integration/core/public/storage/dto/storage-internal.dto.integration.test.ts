import { Test, TestingModule } from '@nestjs/testing';
import { StorageInternalDto } from '../../../src/core/public/storage/dto/storage-internal.dto';

describe('StorageInternalDto Integration', () => {
  let storageInternalDto: StorageInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageInternalDto],
    }).compile();

    storageInternalDto = module.get<StorageInternalDto>(StorageInternalDto);
  });

  it('should be defined', () => {
    expect(storageInternalDto).toBeDefined();
  });
});
