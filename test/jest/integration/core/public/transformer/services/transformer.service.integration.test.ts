import { Test, TestingModule } from '@nestjs/testing';
import { TransformerService } from '../../../src/core/public/transformer/services/transformer.service';

describe('TransformerService Integration', () => {
  let transformerService: TransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformerService],
    }).compile();

    transformerService = module.get<TransformerService>(TransformerService);
  });

  it('should be defined', () => {
    expect(transformerService).toBeDefined();
  });
});
