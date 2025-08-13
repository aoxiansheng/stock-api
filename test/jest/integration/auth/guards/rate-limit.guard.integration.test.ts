import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard } from '../../../src/auth/guards/rate-limit.guard';

describe('RateLimitGuard Integration', () => {
  let rateLimitGuard: RateLimitGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitGuard],
    }).compile();

    rateLimitGuard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  it('should be defined', () => {
    expect(rateLimitGuard).toBeDefined();
  });
});
