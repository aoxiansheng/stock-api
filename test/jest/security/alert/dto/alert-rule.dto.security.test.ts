import { Test, TestingModule } from '@nestjs/testing';
import { AlertRuleDto } from '../../../src/alert/dto/alert-rule.dto';

describe('AlertRuleDto Security', () => {
  let alertRuleDto: AlertRuleDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertRuleDto],
    }).compile();

    alertRuleDto = module.get<AlertRuleDto>(AlertRuleDto);
  });

  it('should be defined', () => {
    expect(alertRuleDto).toBeDefined();
  });
});
