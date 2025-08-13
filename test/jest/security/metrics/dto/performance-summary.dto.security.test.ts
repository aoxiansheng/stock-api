import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceSummaryDto } from '../../../src/metrics/dto/performance-summary.dto';

describe('PerformanceSummaryDto Security', () => {
  let performanceSummaryDto: PerformanceSummaryDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceSummaryDto],
    }).compile();

    performanceSummaryDto = module.get<PerformanceSummaryDto>(PerformanceSummaryDto);
  });

  it('should be defined', () => {
    expect(performanceSummaryDto).toBeDefined();
  });
});
