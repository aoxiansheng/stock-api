import { Test, TestingModule } from '@nestjs/testing';
import { AlertingConstants } from '../../../src/alert/constants/alerting.constants';

describe('AlertingConstants Security', () => {
  let alertingConstants: AlertingConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertingConstants],
    }).compile();

    alertingConstants = module.get<AlertingConstants>(AlertingConstants);
  });

  it('should be defined', () => {
    expect(alertingConstants).toBeDefined();
  });
});
