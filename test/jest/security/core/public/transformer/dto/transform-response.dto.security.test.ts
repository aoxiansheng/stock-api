import { Test, TestingModule } from '@nestjs/testing';
import { TransformResponseDto } from '../../../src/core/public/transformer/dto/transform-response.dto';

describe('TransformResponseDto Security', () => {
  let transformResponseDto: TransformResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformResponseDto],
    }).compile();

    transformResponseDto = module.get<TransformResponseDto>(TransformResponseDto);
  });

  it('should be defined', () => {
    expect(transformResponseDto).toBeDefined();
  });
});
