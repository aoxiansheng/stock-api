import { Test, TestingModule } from '@nestjs/testing';
import { MetricsHelper } from '../../../src/monitoring/metrics/metrics-helper';

describe('MetricsHelper Security', () => {
  let metricsHelper: MetricsHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsHelper],
    }).compile();

    metricsHelper = module.get<MetricsHelper>(MetricsHelper);
  });

  it('should be defined', () => {
    expect(metricsHelper).toBeDefined();
  });
});
