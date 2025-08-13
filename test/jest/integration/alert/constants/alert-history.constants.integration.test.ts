import { Test, TestingModule } from '@nestjs/testing';
import { AlertHistoryConstants } from '../../../src/alert/constants/alert-history.constants';

describe('AlertHistoryConstants Integration', () => {
  let alertHistoryConstants: AlertHistoryConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertHistoryConstants],
    }).compile();

    alertHistoryConstants = module.get<AlertHistoryConstants>(AlertHistoryConstants);
  });

  it('should be defined', () => {
    expect(alertHistoryConstants).toBeDefined();
  });
});
