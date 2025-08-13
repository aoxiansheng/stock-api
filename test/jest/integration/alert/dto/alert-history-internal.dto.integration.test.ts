import { Test, TestingModule } from '@nestjs/testing';
import { AlertHistoryInternalDto } from '../../../src/alert/dto/alert-history-internal.dto';

describe('AlertHistoryInternalDto Integration', () => {
  let alertHistoryInternalDto: AlertHistoryInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertHistoryInternalDto],
    }).compile();

    alertHistoryInternalDto = module.get<AlertHistoryInternalDto>(AlertHistoryInternalDto);
  });

  it('should be defined', () => {
    expect(alertHistoryInternalDto).toBeDefined();
  });
});
