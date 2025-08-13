import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMappingQueryDto } from '../../../src/core/public/symbol-mapper/dto/symbol-mapping-query.dto';

describe('SymbolMappingQueryDto Security', () => {
  let symbolMappingQueryDto: SymbolMappingQueryDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMappingQueryDto],
    }).compile();

    symbolMappingQueryDto = module.get<SymbolMappingQueryDto>(SymbolMappingQueryDto);
  });

  it('should be defined', () => {
    expect(symbolMappingQueryDto).toBeDefined();
  });
});
