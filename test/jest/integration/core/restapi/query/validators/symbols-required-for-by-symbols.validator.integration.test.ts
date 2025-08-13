import { Test, TestingModule } from '@nestjs/testing';
import { SymbolsRequiredForBySymbolsValidator } from '../../../src/core/restapi/query/validators/symbols-required-for-by-symbols.validator';

describe('SymbolsRequiredForBySymbolsValidator Integration', () => {
  let symbolsRequiredForBySymbolsValidator: SymbolsRequiredForBySymbolsValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolsRequiredForBySymbolsValidator],
    }).compile();

    symbolsRequiredForBySymbolsValidator = module.get<SymbolsRequiredForBySymbolsValidator>(SymbolsRequiredForBySymbolsValidator);
  });

  it('should be defined', () => {
    expect(symbolsRequiredForBySymbolsValidator).toBeDefined();
  });
});
