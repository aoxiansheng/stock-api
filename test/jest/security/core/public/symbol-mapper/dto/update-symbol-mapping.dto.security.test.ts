import { Test, TestingModule } from '@nestjs/testing';
import { UpdateSymbolMappingDto } from '../../../src/core/public/symbol-mapper/dto/update-symbol-mapping.dto';

describe('UpdateSymbolMappingDto Security', () => {
  let updateSymbolMappingDto: UpdateSymbolMappingDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateSymbolMappingDto],
    }).compile();

    updateSymbolMappingDto = module.get<UpdateSymbolMappingDto>(UpdateSymbolMappingDto);
  });

  it('should be defined', () => {
    expect(updateSymbolMappingDto).toBeDefined();
  });
});
