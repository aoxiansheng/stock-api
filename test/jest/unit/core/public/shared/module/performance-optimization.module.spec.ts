import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceOptimizationModule } from '../../../src/core/public/shared/module/performance-optimization.module';

describe('PerformanceOptimizationModule', () => {
  let performanceOptimizationModule: PerformanceOptimizationModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceOptimizationModule],
    }).compile();

    performanceOptimizationModule = module.get<PerformanceOptimizationModule>(PerformanceOptimizationModule);
  });

  it('should be defined', () => {
    expect(performanceOptimizationModule).toBeDefined();
  });
});
