import { Test, TestingModule } from '@nestjs/testing';
import { AlertConstants } from '../../../src/alert/constants/alert.constants';

describe('AlertConstants Integration', () => {
  let alertConstants: AlertConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertConstants],
    }).compile();

    alertConstants = module.get<AlertConstants>(AlertConstants);
  });

  it('should be defined', () => {
    expect(alertConstants).toBeDefined();
  });
});
