import { Test, TestingModule } from '@nestjs/testing';
import { MarketTradingHoursConstants } from '../../../src/common/constants/market-trading-hours.constants';

describe('MarketTradingHoursConstants Security', () => {
  let marketTradingHoursConstants: MarketTradingHoursConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketTradingHoursConstants],
    }).compile();

    marketTradingHoursConstants = module.get<MarketTradingHoursConstants>(MarketTradingHoursConstants);
  });

  it('should be defined', () => {
    expect(marketTradingHoursConstants).toBeDefined();
  });
});
