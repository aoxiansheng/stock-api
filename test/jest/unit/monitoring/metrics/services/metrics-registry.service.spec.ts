import { Test, TestingModule } from '@nestjs/testing';
import { MetricsRegistryService } from '../../../src/monitoring/metrics/services/metrics-registry.service';

describe('MetricsRegistryService', () => {
  let metricsRegistryService: MetricsRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsRegistryService],
    }).compile();

    metricsRegistryService = module.get<MetricsRegistryService>(MetricsRegistryService);
  });

  it('should be defined', () => {
    expect(metricsRegistryService).toBeDefined();
  });
});
