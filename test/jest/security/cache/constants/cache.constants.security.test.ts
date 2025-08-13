import { Test, TestingModule } from '@nestjs/testing';
import { CacheConstants } from '../../../src/cache/constants/cache.constants';

describe('CacheConstants Security', () => {
  let cacheConstants: CacheConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheConstants],
    }).compile();

    cacheConstants = module.get<CacheConstants>(CacheConstants);
  });

  it('should be defined', () => {
    expect(cacheConstants).toBeDefined();
  });
});
