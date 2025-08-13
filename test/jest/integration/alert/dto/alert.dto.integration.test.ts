import { Test, TestingModule } from '@nestjs/testing';
import { AlertDto } from '../../../src/alert/dto/alert.dto';

describe('AlertDto Integration', () => {
  let alertDto: AlertDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertDto],
    }).compile();

    alertDto = module.get<AlertDto>(AlertDto);
  });

  it('should be defined', () => {
    expect(alertDto).toBeDefined();
  });
});
