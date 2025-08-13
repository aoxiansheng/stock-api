import { Test, TestingModule } from '@nestjs/testing';
import { AuthSubjectFactory } from '../../../src/auth/subjects/auth-subject.factory';

describe('AuthSubjectFactory Security', () => {
  let authSubjectFactory: AuthSubjectFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthSubjectFactory],
    }).compile();

    authSubjectFactory = module.get<AuthSubjectFactory>(AuthSubjectFactory);
  });

  it('should be defined', () => {
    expect(authSubjectFactory).toBeDefined();
  });
});
