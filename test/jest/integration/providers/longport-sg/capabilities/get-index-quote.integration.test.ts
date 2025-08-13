import { Test, TestingModule } from '@nestjs/testing';
import { GetIndexQuote } from '../../../src/providers/longport-sg/capabilities/get-index-quote';

describe('GetIndexQuote Integration', () => {
  let getIndexQuote: GetIndexQuote;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetIndexQuote],
    }).compile();

    getIndexQuote = module.get<GetIndexQuote>(GetIndexQuote);
  });

  it('should be defined', () => {
    expect(getIndexQuote).toBeDefined();
  });
});
