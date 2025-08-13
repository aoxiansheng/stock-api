import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '../../../src/cache/module/cache.module';

describe('CacheModule Security', () => {
  let cacheModule: CacheModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheModule],
    }).compile();

    cacheModule = module.get<CacheModule>(CacheModule);
  });

  it('should be defined', () => {
    expect(cacheModule).toBeDefined();
  });
});
