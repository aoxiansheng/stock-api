import { Test, TestingModule } from '@nestjs/testing';
import { TransformerConstants } from '../../../src/core/public/transformer/constants/transformer.constants';

describe('TransformerConstants Security', () => {
  let transformerConstants: TransformerConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformerConstants],
    }).compile();

    transformerConstants = module.get<TransformerConstants>(TransformerConstants);
  });

  it('should be defined', () => {
    expect(transformerConstants).toBeDefined();
  });
});
