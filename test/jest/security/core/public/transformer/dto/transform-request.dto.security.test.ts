import { Test, TestingModule } from '@nestjs/testing';
import { TransformRequestDto } from '../../../src/core/public/transformer/dto/transform-request.dto';

describe('TransformRequestDto Security', () => {
  let transformRequestDto: TransformRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformRequestDto],
    }).compile();

    transformRequestDto = module.get<TransformRequestDto>(TransformRequestDto);
  });

  it('should be defined', () => {
    expect(transformRequestDto).toBeDefined();
  });
});
