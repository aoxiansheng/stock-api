import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';

describe('JwtStrategy Integration', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });
});
