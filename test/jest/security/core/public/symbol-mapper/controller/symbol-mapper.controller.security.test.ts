import { Test, TestingModule } from '@nestjs/testing';
import { SymbolMapperController } from '../../../src/core/public/symbol-mapper/controller/symbol-mapper.controller';

describe('SymbolMapperController Security', () => {
  let symbolMapperController: SymbolMapperController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolMapperController],
    }).compile();

    symbolMapperController = module.get<SymbolMapperController>(SymbolMapperController);
  });

  it('should be defined', () => {
    expect(symbolMapperController).toBeDefined();
  });
});
