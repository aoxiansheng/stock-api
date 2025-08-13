import { Test, TestingModule } from '@nestjs/testing';
import { StorageRequestDto } from '../../../src/core/public/storage/dto/storage-request.dto';

describe('StorageRequestDto Security', () => {
  let storageRequestDto: StorageRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageRequestDto],
    }).compile();

    storageRequestDto = module.get<StorageRequestDto>(StorageRequestDto);
  });

  it('should be defined', () => {
    expect(storageRequestDto).toBeDefined();
  });
});
