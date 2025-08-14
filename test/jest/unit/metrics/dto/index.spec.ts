import * as MetricsDtoIndex from '../../../../../src/metrics/dto/index';
import { PerformanceMetricsDto } from '../../../../../src/metrics/dto/performance-metrics.dto';
import { PerformanceSummaryDto } from '../../../../../src/metrics/dto/performance-summary.dto';

describe('Metrics DTO Index', () => {
  it('should export PerformanceMetricsDto', () => {
    expect(MetricsDtoIndex.PerformanceMetricsDto).toBeDefined();
    expect(MetricsDtoIndex.PerformanceMetricsDto).toBe(PerformanceMetricsDto);
  });

  it('should export PerformanceSummaryDto', () => {
    expect(MetricsDtoIndex.PerformanceSummaryDto).toBeDefined();
    expect(MetricsDtoIndex.PerformanceSummaryDto).toBe(PerformanceSummaryDto);
  });

  it('should export all expected DTOs', () => {
    const expectedExports = ['PerformanceMetricsDto', 'PerformanceSummaryDto'];
    
    expectedExports.forEach(exportName => {
      expect(MetricsDtoIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(MetricsDtoIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });
});
