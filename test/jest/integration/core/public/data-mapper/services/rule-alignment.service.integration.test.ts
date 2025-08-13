import { Test, TestingModule } from '@nestjs/testing';
import { RuleAlignmentService } from '../../../src/core/public/data-mapper/services/rule-alignment.service';

describe('RuleAlignmentService Integration', () => {
  let ruleAlignmentService: RuleAlignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleAlignmentService],
    }).compile();

    ruleAlignmentService = module.get<RuleAlignmentService>(RuleAlignmentService);
  });

  it('should be defined', () => {
    expect(ruleAlignmentService).toBeDefined();
  });
});
