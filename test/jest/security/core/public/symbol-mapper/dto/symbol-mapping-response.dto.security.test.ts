import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMappingResponseDto } from '../../../src/core/public/symbol-mapper/dto/symbol-mapping-response.dto';

describe('SymbolMappingResponseDto Security', () => {
  let symbolMappingResponseDto: SymbolMappingResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMappingResponseDto],
    }).compile();

    symbolMappingResponseDto = module.get<SymbolMappingResponseDto>(SymbolMappingResponseDto);
  });

  it('should be defined', () => {
    expect(symbolMappingResponseDto).toBeDefined();
  });
});
