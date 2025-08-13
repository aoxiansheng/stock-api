import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitConstants } from '../../../src/common/constants/rate-limit.constants';

describe('RateLimitConstants', () => {
  let rateLimitConstants: RateLimitConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitConstants],
    }).compile();

    rateLimitConstants = module.get<RateLimitConstants>(RateLimitConstants);
  });

  it('should be defined', () => {
    expect(rateLimitConstants).toBeDefined();
  });
});
