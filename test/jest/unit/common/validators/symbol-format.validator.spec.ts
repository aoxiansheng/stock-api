import { Test, TestingModule } from '@nestjs/testing';
import { SymbolFormatValidator } from '../../../src/common/validators/symbol-format.validator';

describe('SymbolFormatValidator', () => {
  let symbolFormatValidator: SymbolFormatValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolFormatValidator],
    }).compile();

    symbolFormatValidator = module.get<SymbolFormatValidator>(SymbolFormatValidator);
  });

  it('should be defined', () => {
    expect(symbolFormatValidator).toBeDefined();
  });
});
