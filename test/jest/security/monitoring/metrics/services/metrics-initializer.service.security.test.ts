import { Test, TestingModule } from '@nestjs/testing';
import { MetricsInitializerService } from '../../../src/monitoring/metrics/services/metrics-initializer.service';

describe('MetricsInitializerService Security', () => {
  let metricsInitializerService: MetricsInitializerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsInitializerService],
    }).compile();

    metricsInitializerService = module.get<MetricsInitializerService>(MetricsInitializerService);
  });

  it('should be defined', () => {
    expect(metricsInitializerService).toBeDefined();
  });
});
