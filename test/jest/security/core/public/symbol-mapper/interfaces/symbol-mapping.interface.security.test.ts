import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMappingInterface } from '../../../src/core/public/symbol-mapper/interfaces/symbol-mapping.interface';

describe('SymbolMappingInterface Security', () => {
  let symbolMappingInterface: SymbolMappingInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMappingInterface],
    }).compile();

    symbolMappingInterface = module.get<SymbolMappingInterface>(SymbolMappingInterface);
  });

  it('should be defined', () => {
    expect(symbolMappingInterface).toBeDefined();
  });
});
