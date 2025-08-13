import { Test, TestingModule } from '@nestjs/testing';
import { StorageQueryDto } from '../../../src/core/public/storage/dto/storage-query.dto';

describe('StorageQueryDto Security', () => {
  let storageQueryDto: StorageQueryDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageQueryDto],
    }).compile();

    storageQueryDto = module.get<StorageQueryDto>(StorageQueryDto);
  });

  it('should be defined', () => {
    expect(storageQueryDto).toBeDefined();
  });
});
