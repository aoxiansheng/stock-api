import { Test, TestingModule } from '@nestjs/testing';
import { MetricsHealthService } from '../../../src/metrics/services/metrics-health.service';

describe('MetricsHealthService Security', () => {
  let metricsHealthService: MetricsHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsHealthService],
    }).compile();

    metricsHealthService = module.get<MetricsHealthService>(MetricsHealthService);
  });

  it('should be defined', () => {
    expect(metricsHealthService).toBeDefined();
  });
});
