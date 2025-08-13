import { Test, TestingModule } from '@nestjs/testing';
import { ValidationDto } from '../../../src/core/restapi/receiver/dto/validation.dto';

describe('ValidationDto Security', () => {
  let validationDto: ValidationDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationDto],
    }).compile();

    validationDto = module.get<ValidationDto>(ValidationDto);
  });

  it('should be defined', () => {
    expect(validationDto).toBeDefined();
  });
});
