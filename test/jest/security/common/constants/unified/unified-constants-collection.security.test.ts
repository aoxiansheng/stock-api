import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedConstantsCollection } from '../../../src/common/constants/unified/unified-constants-collection';

describe('UnifiedConstantsCollection Security', () => {
  let unifiedConstantsCollection: UnifiedConstantsCollection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnifiedConstantsCollection],
    }).compile();

    unifiedConstantsCollection = module.get<UnifiedConstantsCollection>(UnifiedConstantsCollection);
  });

  it('should be defined', () => {
    expect(unifiedConstantsCollection).toBeDefined();
  });
});
