import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitoringDecorator } from '../../../src/common/core/decorators/performance-monitoring.decorator';

describe('PerformanceMonitoringDecorator Security', () => {
  let performanceMonitoringDecorator: PerformanceMonitoringDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceMonitoringDecorator],
    }).compile();

    performanceMonitoringDecorator = module.get<PerformanceMonitoringDecorator>(PerformanceMonitoringDecorator);
  });

  it('should be defined', () => {
    expect(performanceMonitoringDecorator).toBeDefined();
  });
});
