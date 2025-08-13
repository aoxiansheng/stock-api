import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitorService } from '../../../src/metrics/services/performance-monitor.service';

describe('PerformanceMonitorService Integration', () => {
  let performanceMonitorService: PerformanceMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMonitorService],
    }).compile();

    performanceMonitorService = module.get<PerformanceMonitorService>(PerformanceMonitorService);
  });

  it('should be defined', () => {
    expect(performanceMonitorService).toBeDefined();
  });
});
