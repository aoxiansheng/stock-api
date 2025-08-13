import { Test, TestingModule } from '@nestjs/testing';
import { MarketUtil } from '../../../src/core/restapi/receiver/utils/market.util';

describe('MarketUtil Integration', () => {
  let marketUtil: MarketUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketUtil],
    }).compile();

    marketUtil = module.get<MarketUtil>(MarketUtil);
  });

  it('should be defined', () => {
    expect(marketUtil).toBeDefined();
  });
});
