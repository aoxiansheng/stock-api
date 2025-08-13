import { Test, TestingModule } from '@nestjs/testing';
import { AlertTypes } from '../../../src/alert/types/alert.types';

describe('AlertTypes Security', () => {
  let alertTypes: AlertTypes;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertTypes],
    }).compile();

    alertTypes = module.get<AlertTypes>(AlertTypes);
  });

  it('should be defined', () => {
    expect(alertTypes).toBeDefined();
  });
});
