import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyStrategy } from '../../../src/auth/strategies/apikey.strategy';

describe('ApikeyStrategy Integration', () => {
  let apikeyStrategy: ApikeyStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyStrategy],
    }).compile();

    apikeyStrategy = module.get<ApikeyStrategy>(ApikeyStrategy);
  });

  it('should be defined', () => {
    expect(apikeyStrategy).toBeDefined();
  });
});
