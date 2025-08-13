import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitFilter } from '../../../src/auth/filters/rate-limit.filter';

describe('RateLimitFilter Integration', () => {
  let rateLimitFilter: RateLimitFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitFilter],
    }).compile();

    rateLimitFilter = module.get<RateLimitFilter>(RateLimitFilter);
  });

  it('should be defined', () => {
    expect(rateLimitFilter).toBeDefined();
  });
});
