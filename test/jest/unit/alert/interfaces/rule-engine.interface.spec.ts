import { Test, TestingModule } from '@nestjs/testing';
import { RuleEngineInterface } from '../../../src/alert/interfaces/rule-engine.interface';

describe('RuleEngineInterface', () => {
  let ruleEngineInterface: RuleEngineInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleEngineInterface],
    }).compile();

    ruleEngineInterface = module.get<RuleEngineInterface>(RuleEngineInterface);
  });

  it('should be defined', () => {
    expect(ruleEngineInterface).toBeDefined();
  });
});
