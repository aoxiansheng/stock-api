import { Test, TestingModule } from '@nestjs/testing';
import { JwtUserSubject } from '../../../src/auth/subjects/jwt-user.subject';

describe('JwtUserSubject Security', () => {
  let jwtUserSubject: JwtUserSubject;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtUserSubject],
    }).compile();

    jwtUserSubject = module.get<JwtUserSubject>(JwtUserSubject);
  });

  it('should be defined', () => {
    expect(jwtUserSubject).toBeDefined();
  });
});
