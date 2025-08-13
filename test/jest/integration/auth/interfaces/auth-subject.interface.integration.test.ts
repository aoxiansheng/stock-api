import { Test, TestingModule } from '@nestjs/testing';
import { AuthSubjectInterface } from '../../../src/auth/interfaces/auth-subject.interface';

describe('AuthSubjectInterface Integration', () => {
  let authSubjectInterface: AuthSubjectInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthSubjectInterface],
    }).compile();

    authSubjectInterface = module.get<AuthSubjectInterface>(AuthSubjectInterface);
  });

  it('should be defined', () => {
    expect(authSubjectInterface).toBeDefined();
  });
});
