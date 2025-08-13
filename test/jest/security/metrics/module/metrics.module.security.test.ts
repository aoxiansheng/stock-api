import { Test, TestingModule } from '@nestjs/testing';
import { MetricsModule } from '../../../src/metrics/module/metrics.module';

describe('MetricsModule Security', () => {
  let metricsModule: MetricsModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsModule],
    }).compile();

    metricsModule = module.get<MetricsModule>(MetricsModule);
  });

  it('should be defined', () => {
    expect(metricsModule).toBeDefined();
  });
});
