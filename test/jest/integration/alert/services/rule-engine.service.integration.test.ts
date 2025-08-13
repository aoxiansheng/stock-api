import { Test, TestingModule } from '@nestjs/testing';
import { RuleEngineService } from '../../../src/alert/services/rule-engine.service';

describe('RuleEngineService Integration', () => {
  let ruleEngineService: RuleEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleEngineService],
    }).compile();

    ruleEngineService = module.get<RuleEngineService>(RuleEngineService);
  });

  it('should be defined', () => {
    expect(ruleEngineService).toBeDefined();
  });
});
