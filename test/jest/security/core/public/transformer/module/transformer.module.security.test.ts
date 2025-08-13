import { Test, TestingModule } from '@nestjs/testing';
import { TransformerModule } from '../../../src/core/public/transformer/module/transformer.module';

describe('TransformerModule Security', () => {
  let transformerModule: TransformerModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformerModule],
    }).compile();

    transformerModule = module.get<TransformerModule>(TransformerModule);
  });

  it('should be defined', () => {
    expect(transformerModule).toBeDefined();
  });
});
