import { Test, TestingModule } from '@nestjs/testing';
import { CreateSymbolMappingDto } from '../../../src/core/public/symbol-mapper/dto/create-symbol-mapping.dto';

describe('CreateSymbolMappingDto Integration', () => {
  let createSymbolMappingDto: CreateSymbolMappingDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateSymbolMappingDto],
    }).compile();

    createSymbolMappingDto = module.get<CreateSymbolMappingDto>(CreateSymbolMappingDto);
  });

  it('should be defined', () => {
    expect(createSymbolMappingDto).toBeDefined();
  });
});
