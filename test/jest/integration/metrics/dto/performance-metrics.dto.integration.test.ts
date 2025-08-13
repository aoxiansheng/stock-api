import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMetricsDto } from '../../../src/metrics/dto/performance-metrics.dto';

describe('PerformanceMetricsDto Integration', () => {
  let performanceMetricsDto: PerformanceMetricsDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMetricsDto],
    }).compile();

    performanceMetricsDto = module.get<PerformanceMetricsDto>(PerformanceMetricsDto);
  });

  it('should be defined', () => {
    expect(performanceMetricsDto).toBeDefined();
  });
});
