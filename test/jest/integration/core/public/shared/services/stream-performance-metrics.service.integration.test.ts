import { Test, TestingModule } from '@nestjs/testing';
import { StreamPerformanceMetricsService } from '../../../src/core/public/shared/services/stream-performance-metrics.service';

describe('StreamPerformanceMetricsService Integration', () => {
  let streamPerformanceMetricsService: StreamPerformanceMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamPerformanceMetricsService],
    }).compile();

    streamPerformanceMetricsService = module.get<StreamPerformanceMetricsService>(StreamPerformanceMetricsService);
  });

  it('should be defined', () => {
    expect(streamPerformanceMetricsService).toBeDefined();
  });
});
