import { Test, TestingModule } from '@nestjs/testing';
import { StreamStockQuote } from '../../../src/providers/longport/capabilities/stream-stock-quote';

describe('StreamStockQuote Integration', () => {
  let streamStockQuote: StreamStockQuote;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamStockQuote],
    }).compile();

    streamStockQuote = module.get<StreamStockQuote>(StreamStockQuote);
  });

  it('should be defined', () => {
    expect(streamStockQuote).toBeDefined();
  });
});
