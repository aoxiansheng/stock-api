import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitInterface } from '../../../src/auth/interfaces/rate-limit.interface';

describe('RateLimitInterface Security', () => {
  let rateLimitInterface: RateLimitInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitInterface],
    }).compile();

    rateLimitInterface = module.get<RateLimitInterface>(RateLimitInterface);
  });

  it('should be defined', () => {
    expect(rateLimitInterface).toBeDefined();
  });
});
