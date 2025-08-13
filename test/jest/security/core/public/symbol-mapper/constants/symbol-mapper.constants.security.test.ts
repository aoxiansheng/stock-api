import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperConstants } from '../../../src/core/public/symbol-mapper/constants/symbol-mapper.constants';

describe('SymbolMapperConstants Security', () => {
  let symbolMapperConstants: SymbolMapperConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMapperConstants],
    }).compile();

    symbolMapperConstants = module.get<SymbolMapperConstants>(SymbolMapperConstants);
  });

  it('should be defined', () => {
    expect(symbolMapperConstants).toBeDefined();
  });
});
