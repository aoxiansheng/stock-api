import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMetricsInterface } from '../../../src/metrics/interfaces/performance-metrics.interface';

describe('PerformanceMetricsInterface Security', () => {
  let performanceMetricsInterface: PerformanceMetricsInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMetricsInterface],
    }).compile();

    performanceMetricsInterface = module.get<PerformanceMetricsInterface>(PerformanceMetricsInterface);
  });

  it('should be defined', () => {
    expect(performanceMetricsInterface).toBeDefined();
  });
});
