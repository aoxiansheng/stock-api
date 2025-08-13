import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMessagesConstants } from '../../../src/common/constants/error-messages.constants';

describe('ErrorMessagesConstants Security', () => {
  let errorMessagesConstants: ErrorMessagesConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorMessagesConstants],
    }).compile();

    errorMessagesConstants = module.get<ErrorMessagesConstants>(ErrorMessagesConstants);
  });

  it('should be defined', () => {
    expect(errorMessagesConstants).toBeDefined();
  });
});
