import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../../src/cache/services/cache.service';

describe('CacheService Security', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(cacheService).toBeDefined();
  });
});
