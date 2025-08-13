import { Test, TestingModule } from '@nestjs/testing';
import { FlexibleMappingRuleDto } from '../../../src/core/public/data-mapper/dto/flexible-mapping-rule.dto';

describe('FlexibleMappingRuleDto Integration', () => {
  let flexibleMappingRuleDto: FlexibleMappingRuleDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlexibleMappingRuleDto],
    }).compile();

    flexibleMappingRuleDto = module.get<FlexibleMappingRuleDto>(FlexibleMappingRuleDto);
  });

  it('should be defined', () => {
    expect(flexibleMappingRuleDto).toBeDefined();
  });
});
