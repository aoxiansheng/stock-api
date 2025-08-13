import { Test, TestingModule } from '@nestjs/testing';
import { ApikeyDto } from '../../../src/auth/dto/apikey.dto';

describe('ApikeyDto Security', () => {
  let apikeyDto: ApikeyDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApikeyDto],
    }).compile();

    apikeyDto = module.get<ApikeyDto>(ApikeyDto);
  });

  it('should be defined', () => {
    expect(apikeyDto).toBeDefined();
  });
});
