import { Test, TestingModule } from '@nestjs/testing';
import { AlertRuleRepository } from '../../../src/alert/repositories/alert-rule.repository';

describe('AlertRuleRepository Security', () => {
  let alertRuleRepository: AlertRuleRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertRuleRepository],
    }).compile();

    alertRuleRepository = module.get<AlertRuleRepository>(AlertRuleRepository);
  });

  it('should be defined', () => {
    expect(alertRuleRepository).toBeDefined();
  });
});
