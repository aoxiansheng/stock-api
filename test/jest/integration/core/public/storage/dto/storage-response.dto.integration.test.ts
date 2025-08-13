import { Test, TestingModule } from '@nestjs/testing';
import { StorageResponseDto } from '../../../src/core/public/storage/dto/storage-response.dto';

describe('StorageResponseDto Integration', () => {
  let storageResponseDto: StorageResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageResponseDto],
    }).compile();

    storageResponseDto = module.get<StorageResponseDto>(StorageResponseDto);
  });

  it('should be defined', () => {
    expect(storageResponseDto).toBeDefined();
  });
});
