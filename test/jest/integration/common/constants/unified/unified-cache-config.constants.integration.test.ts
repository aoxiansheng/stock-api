import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedCacheConfigConstants } from '../../../src/common/constants/unified/unified-cache-config.constants';

describe('UnifiedCacheConfigConstants Integration', () => {
  let unifiedCacheConfigConstants: UnifiedCacheConfigConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnifiedCacheConfigConstants],
    }).compile();

    unifiedCacheConfigConstants = module.get<UnifiedCacheConfigConstants>(UnifiedCacheConfigConstants);
  });

  it('should be defined', () => {
    expect(unifiedCacheConfigConstants).toBeDefined();
  });
});
