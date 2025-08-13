import { Test, TestingModule } from '@nestjs/testing';
import { AuthConstants } from '../../../src/auth/constants/auth.constants';

describe('AuthConstants', () => {
  let authConstants: AuthConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthConstants],
    }).compile();

    authConstants = module.get<AuthConstants>(AuthConstants);
  });

  it('should be defined', () => {
    expect(authConstants).toBeDefined();
  });
});
