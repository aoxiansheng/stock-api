import { Test, TestingModule } from '@nestjs/testing';
import { AlertingService } from '../../../src/alert/services/alerting.service';

describe('AlertingService Security', () => {
  let alertingService: AlertingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertingService],
    }).compile();

    alertingService = module.get<AlertingService>(AlertingService);
  });

  it('should be defined', () => {
    expect(alertingService).toBeDefined();
  });
});
