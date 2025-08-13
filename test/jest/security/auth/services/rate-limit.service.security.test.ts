import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from '../../../src/auth/services/rate-limit.service';

describe('RateLimitService Security', () => {
  let rateLimitService: RateLimitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitService],
    }).compile();

    rateLimitService = module.get<RateLimitService>(RateLimitService);
  });

  it('should be defined', () => {
    expect(rateLimitService).toBeDefined();
  });
});
