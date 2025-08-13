import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMetricsRepository } from '../../../src/metrics/repositories/performance-metrics.repository';

describe('PerformanceMetricsRepository Integration', () => {
  let performanceMetricsRepository: PerformanceMetricsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMetricsRepository],
    }).compile();

    performanceMetricsRepository = module.get<PerformanceMetricsRepository>(PerformanceMetricsRepository);
  });

  it('should be defined', () => {
    expect(performanceMetricsRepository).toBeDefined();
  });
});
