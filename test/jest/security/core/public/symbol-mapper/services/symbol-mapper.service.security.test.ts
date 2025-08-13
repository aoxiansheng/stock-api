import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperService } from '../../../src/core/public/symbol-mapper/services/symbol-mapper.service';

describe('SymbolMapperService Security', () => {
  let symbolMapperService: SymbolMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMapperService],
    }).compile();

    symbolMapperService = module.get<SymbolMapperService>(SymbolMapperService);
  });

  it('should be defined', () => {
    expect(symbolMapperService).toBeDefined();
  });
});
