import { Test, TestingModule } from '@nestjs/testing';
import { MarketConstants } from '../../../src/common/constants/market.constants';

describe('MarketConstants Security', () => {
  let marketConstants: MarketConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketConstants],
    }).compile();

    marketConstants = module.get<MarketConstants>(MarketConstants);
  });

  it('should be defined', () => {
    expect(marketConstants).toBeDefined();
  });
});
