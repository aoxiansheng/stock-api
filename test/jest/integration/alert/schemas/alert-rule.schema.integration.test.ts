import { Test, TestingModule } from '@nestjs/testing';
import { AlertRuleSchema } from '../../../src/alert/schemas/alert-rule.schema';

describe('AlertRuleSchema Integration', () => {
  let alertRuleSchema: AlertRuleSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertRuleSchema],
    }).compile();

    alertRuleSchema = module.get<AlertRuleSchema>(AlertRuleSchema);
  });

  it('should be defined', () => {
    expect(alertRuleSchema).toBeDefined();
  });
});
