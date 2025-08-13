import { Test, TestingModule } from '@nestjs/testing';
import { TransformPreviewDto } from '../../../src/core/public/transformer/dto/transform-preview.dto';

describe('TransformPreviewDto Integration', () => {
  let transformPreviewDto: TransformPreviewDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformPreviewDto],
    }).compile();

    transformPreviewDto = module.get<TransformPreviewDto>(TransformPreviewDto);
  });

  it('should be defined', () => {
    expect(transformPreviewDto).toBeDefined();
  });
});
