import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMappingRepository } from '../../../src/core/public/symbol-mapper/repositories/symbol-mapping.repository';

describe('SymbolMappingRepository Integration', () => {
  let symbolMappingRepository: SymbolMappingRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMappingRepository],
    }).compile();

    symbolMappingRepository = module.get<SymbolMappingRepository>(SymbolMappingRepository);
  });

  it('should be defined', () => {
    expect(symbolMappingRepository).toBeDefined();
  });
});
