import { Test, TestingModule } from '@nestjs/testing';
import { AlertHistoryService } from '../../../src/alert/services/alert-history.service';

describe('AlertHistoryService Integration', () => {
  let alertHistoryService: AlertHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertHistoryService],
    }).compile();

    alertHistoryService = module.get<AlertHistoryService>(AlertHistoryService);
  });

  it('should be defined', () => {
    expect(alertHistoryService).toBeDefined();
  });
});
