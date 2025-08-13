import { Test, TestingModule } from '@nestjs/testing';
import { CacheInternalDto } from '../../../src/cache/dto/cache-internal.dto';

describe('CacheInternalDto Integration', () => {
  let cacheInternalDto: CacheInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheInternalDto],
    }).compile();

    cacheInternalDto = module.get<CacheInternalDto>(CacheInternalDto);
  });

  it('should be defined', () => {
    expect(cacheInternalDto).toBeDefined();
  });
});
