import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceConstants } from '../../../src/common/constants/unified/performance.constants';

describe('PerformanceConstants Integration', () => {
  let performanceConstants: PerformanceConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceConstants],
    }).compile();

    performanceConstants = module.get<PerformanceConstants>(PerformanceConstants);
  });

  it('should be defined', () => {
    expect(performanceConstants).toBeDefined();
  });
});
