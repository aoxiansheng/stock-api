import { Test, TestingModule } from '@nestjs/testing';
import { FlexibleMappingRuleService } from '../../../src/core/public/data-mapper/services/flexible-mapping-rule.service';

describe('FlexibleMappingRuleService Security', () => {
  let flexibleMappingRuleService: FlexibleMappingRuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlexibleMappingRuleService],
    }).compile();

    flexibleMappingRuleService = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
  });

  it('should be defined', () => {
    expect(flexibleMappingRuleService).toBeDefined();
  });
});
