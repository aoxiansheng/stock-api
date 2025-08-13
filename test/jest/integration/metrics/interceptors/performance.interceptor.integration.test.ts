import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceInterceptor } from '../../../src/metrics/interceptors/performance.interceptor';

describe('PerformanceInterceptor Integration', () => {
  let performanceInterceptor: PerformanceInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceInterceptor],
    }).compile();

    performanceInterceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
  });

  it('should be defined', () => {
    expect(performanceInterceptor).toBeDefined();
  });
});
