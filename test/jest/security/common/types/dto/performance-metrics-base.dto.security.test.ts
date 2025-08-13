import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMetricsBaseDto } from '../../../src/common/types/dto/performance-metrics-base.dto';

describe('PerformanceMetricsBaseDto Security', () => {
  let performanceMetricsBaseDto: PerformanceMetricsBaseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMetricsBaseDto],
    }).compile();

    performanceMetricsBaseDto = module.get<PerformanceMetricsBaseDto>(PerformanceMetricsBaseDto);
  });

  it('should be defined', () => {
    expect(performanceMetricsBaseDto).toBeDefined();
  });
});
