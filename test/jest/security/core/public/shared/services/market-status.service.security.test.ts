import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService } from '../../../src/core/public/shared/services/market-status.service';

describe('MarketStatusService Security', () => {
  let marketStatusService: MarketStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketStatusService],
    }).compile();

    marketStatusService = module.get<MarketStatusService>(MarketStatusService);
  });

  it('should be defined', () => {
    expect(marketStatusService).toBeDefined();
  });
});
