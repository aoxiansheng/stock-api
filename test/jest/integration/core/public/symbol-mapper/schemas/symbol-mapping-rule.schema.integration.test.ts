import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMappingRuleSchema } from '../../../src/core/public/symbol-mapper/schemas/symbol-mapping-rule.schema';

describe('SymbolMappingRuleSchema Integration', () => {
  let symbolMappingRuleSchema: SymbolMappingRuleSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMappingRuleSchema],
    }).compile();

    symbolMappingRuleSchema = module.get<SymbolMappingRuleSchema>(SymbolMappingRuleSchema);
  });

  it('should be defined', () => {
    expect(symbolMappingRuleSchema).toBeDefined();
  });
});
