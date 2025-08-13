import { Test, TestingModule } from '@nestjs/testing';
import { TransformInterfacesDto } from '../../../src/core/public/transformer/dto/transform-interfaces.dto';

describe('TransformInterfacesDto Security', () => {
  let transformInterfacesDto: TransformInterfacesDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterfacesDto],
    }).compile();

    transformInterfacesDto = module.get<TransformInterfacesDto>(TransformInterfacesDto);
  });

  it('should be defined', () => {
    expect(transformInterfacesDto).toBeDefined();
  });
});
