import { Test, TestingModule } from '@nestjs/testing';
import { SymbolValidationUtil } from '../../../src/common/utils/symbol-validation.util';

describe('SymbolValidationUtil Security', () => {
  let symbolValidationUtil: SymbolValidationUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolValidationUtil],
    }).compile();

    symbolValidationUtil = module.get<SymbolValidationUtil>(SymbolValidationUtil);
  });

  it('should be defined', () => {
    expect(symbolValidationUtil).toBeDefined();
  });
});
