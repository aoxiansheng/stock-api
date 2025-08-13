import { Test, TestingModule } from '@nestjs/testing';
import { GetStockQuote } from '../../../src/providers/longport/capabilities/get-stock-quote';

describe('GetStockQuote Security', () => {
  let getStockQuote: GetStockQuote;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetStockQuote],
    }).compile();

    getStockQuote = module.get<GetStockQuote>(GetStockQuote);
  });

  it('should be defined', () => {
    expect(getStockQuote).toBeDefined();
  });
});
