import { Test, TestingModule } from '@nestjs/testing';
import { MappingRuleCacheService } from '../../../src/core/public/data-mapper/services/mapping-rule-cache.service';

describe('MappingRuleCacheService Security', () => {
  let mappingRuleCacheService: MappingRuleCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MappingRuleCacheService],
    }).compile();

    mappingRuleCacheService = module.get<MappingRuleCacheService>(MappingRuleCacheService);
  });

  it('should be defined', () => {
    expect(mappingRuleCacheService).toBeDefined();
  });
});
