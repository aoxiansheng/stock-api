import { Test, TestingModule } from '@nestjs/testing';
import { TransformerController } from '../../../src/core/public/transformer/controller/transformer.controller';

describe('TransformerController Security', () => {
  let transformerController: TransformerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformerController],
    }).compile();

    transformerController = module.get<TransformerController>(TransformerController);
  });

  it('should be defined', () => {
    expect(transformerController).toBeDefined();
  });
});
