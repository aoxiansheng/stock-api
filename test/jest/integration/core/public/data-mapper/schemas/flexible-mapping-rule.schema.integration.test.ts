import { Test, TestingModule } from '@nestjs/testing';
import { FlexibleMappingRuleSchema } from '../../../src/core/public/data-mapper/schemas/flexible-mapping-rule.schema';

describe('FlexibleMappingRuleSchema Integration', () => {
  let flexibleMappingRuleSchema: FlexibleMappingRuleSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlexibleMappingRuleSchema],
    }).compile();

    flexibleMappingRuleSchema = module.get<FlexibleMappingRuleSchema>(FlexibleMappingRuleSchema);
  });

  it('should be defined', () => {
    expect(flexibleMappingRuleSchema).toBeDefined();
  });
});
