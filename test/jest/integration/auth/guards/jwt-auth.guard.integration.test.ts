import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard Integration', () => {
  let jwtAuthGuard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(jwtAuthGuard).toBeDefined();
  });
});
