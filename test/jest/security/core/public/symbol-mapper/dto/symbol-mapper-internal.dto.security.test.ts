import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperInternalDto } from '../../../src/core/public/symbol-mapper/dto/symbol-mapper-internal.dto';

describe('SymbolMapperInternalDto Security', () => {
  let symbolMapperInternalDto: SymbolMapperInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMapperInternalDto],
    }).compile();

    symbolMapperInternalDto = module.get<SymbolMapperInternalDto>(SymbolMapperInternalDto);
  });

  it('should be defined', () => {
    expect(symbolMapperInternalDto).toBeDefined();
  });
});
