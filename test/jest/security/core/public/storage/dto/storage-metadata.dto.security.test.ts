import { Test, TestingModule } from '@nestjs/testing';
import { StorageMetadataDto } from '../../../src/core/public/storage/dto/storage-metadata.dto';

describe('StorageMetadataDto Security', () => {
  let storageMetadataDto: StorageMetadataDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageMetadataDto],
    }).compile();

    storageMetadataDto = module.get<StorageMetadataDto>(StorageMetadataDto);
  });

  it('should be defined', () => {
    expect(storageMetadataDto).toBeDefined();
  });
});
