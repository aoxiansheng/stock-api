import { Test, TestingModule } from '@nestjs/testing';
import { MetricsPerformanceConstants } from '../../../src/metrics/constants/metrics-performance.constants';

describe('MetricsPerformanceConstants Security', () => {
  let metricsPerformanceConstants: MetricsPerformanceConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsPerformanceConstants],
    }).compile();

    metricsPerformanceConstants = module.get<MetricsPerformanceConstants>(MetricsPerformanceConstants);
  });

  it('should be defined', () => {
    expect(metricsPerformanceConstants).toBeDefined();
  });
});
