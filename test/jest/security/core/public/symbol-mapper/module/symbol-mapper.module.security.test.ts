import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperModule } from '../../../src/core/public/symbol-mapper/module/symbol-mapper.module';

describe('SymbolMapperModule Security', () => {
  let symbolMapperModule: SymbolMapperModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMapperModule],
    }).compile();

    symbolMapperModule = module.get<SymbolMapperModule>(SymbolMapperModule);
  });

  it('should be defined', () => {
    expect(symbolMapperModule).toBeDefined();
  });
});
