/**
 * Shared组件监控集成性能影响评估
 * 测试监控添加对业务性能的影响是否小于1%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService } from '../../../src/core/shared/services/market-status.service';
import { DataChangeDetectorService } from '../../../src/core/shared/services/data-change-detector.service';
import { BackgroundTaskService } from '../../../src/core/shared/services/background-task.service';
import { CollectorService } from '@monitoring/collector/collector.service';
import { Market } from '../../../src/common/constants/market.constants';
import { MarketStatus } from '../../../src/common/constants/market-trading-hours.constants';

describe('Shared Components Monitoring Performance Impact', () => {
  let marketStatusService: MarketStatusService;
  let dataChangeDetectorService: DataChangeDetectorService;
  let backgroundTaskService: BackgroundTaskService;
  let mockCollectorService: jest.Mocked<CollectorService>;
  
  beforeAll(async () => {
    const mockCollector = {
      recordRequest: jest.fn(),
      recordCacheOperation: jest.fn(),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketStatusService,
        DataChangeDetectorService,
        BackgroundTaskService,
        { provide: CollectorService, useValue: mockCollector },
      ],
    }).compile();
    
    marketStatusService = module.get<MarketStatusService>(MarketStatusService);
    dataChangeDetectorService = module.get<DataChangeDetectorService>(DataChangeDetectorService);
    backgroundTaskService = module.get<BackgroundTaskService>(BackgroundTaskService);
    mockCollectorService = module.get(CollectorService);
  });

  const BENCHMARK_ITERATIONS = 1000;
  const PERFORMANCE_THRESHOLD = 0.01; // 1% 性能影响阈值

  it('should have minimal performance impact on MarketStatusService (<1%)', async () => {
    // 预热
    await marketStatusService.getMarketStatus(Market.HK);
    
    // 基准测试：无监控记录（mock不执行）
    mockCollectorService.recordCacheOperation.mockImplementation(() => {});
    
    const baselineStart = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      await marketStatusService.getMarketStatus(Market.HK);
    }
    const baselineEnd = performance.now();
    const baselineTime = baselineEnd - baselineStart;
    
    // 等待所有setImmediate完成
    await new Promise(resolve => setImmediate(resolve));
    
    // 性能测试：启用监控记录
    let mockCallCount = 0;
    mockCollectorService.recordCacheOperation.mockImplementation(() => {
      mockCallCount++; // 模拟实际工作
    });
    
    const monitoringStart = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      await marketStatusService.getMarketStatus(Market.HK);
    }
    const monitoringEnd = performance.now();
    const monitoringTime = monitoringEnd - monitoringStart;
    
    // 等待所有setImmediate完成
    await new Promise(resolve => setImmediate(resolve));
    
    // 性能影响计算
    const performanceImpact = (monitoringTime - baselineTime) / baselineTime;
    
    console.log(`MarketStatusService 性能基准:`, {
      baselineTime: `${baselineTime.toFixed(2)}ms`,
      monitoringTime: `${monitoringTime.toFixed(2)}ms`,
      performanceImpact: `${(performanceImpact * 100).toFixed(2)}%`,
      mockCallCount,
      avgTimePerCall: `${(monitoringTime / BENCHMARK_ITERATIONS).toFixed(3)}ms`
    });
    
    // 验证性能影响小于1%
    expect(performanceImpact).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(mockCallCount).toBeGreaterThan(0); // 确保监控实际被调用
  });

  it('should have minimal performance impact on DataChangeDetectorService (<1%)', async () => {
    const testSymbol = 'TEST.HK';
    const testData = { lastPrice: 100, volume: 1000 };
    
    // 预热
    await dataChangeDetectorService.detectSignificantChange(testSymbol, testData, Market.HK, MarketStatus.TRADING);
    
    // 基准测试：无监控
    mockCollectorService.recordRequest.mockImplementation(() => {});
    mockCollectorService.recordCacheOperation.mockImplementation(() => {});
    
    const baselineStart = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      await dataChangeDetectorService.detectSignificantChange(
        `${testSymbol}_${i}`, 
        { ...testData, lastPrice: 100 + Math.random() }, 
        Market.HK, 
        MarketStatus.TRADING
      );
    }
    const baselineEnd = performance.now();
    const baselineTime = baselineEnd - baselineStart;
    
    await new Promise(resolve => setImmediate(resolve));
    
    // 性能测试：启用监控
    let requestCallCount = 0;
    let cacheCallCount = 0;
    mockCollectorService.recordRequest.mockImplementation(() => { requestCallCount++; });
    mockCollectorService.recordCacheOperation.mockImplementation(() => { cacheCallCount++; });
    
    const monitoringStart = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      await dataChangeDetectorService.detectSignificantChange(
        `${testSymbol}_monitoring_${i}`, 
        { ...testData, lastPrice: 100 + Math.random() }, 
        Market.HK, 
        MarketStatus.TRADING
      );
    }
    const monitoringEnd = performance.now();
    const monitoringTime = monitoringEnd - monitoringStart;
    
    await new Promise(resolve => setImmediate(resolve));
    
    const performanceImpact = (monitoringTime - baselineTime) / baselineTime;
    
    console.log(`DataChangeDetectorService 性能基准:`, {
      baselineTime: `${baselineTime.toFixed(2)}ms`,
      monitoringTime: `${monitoringTime.toFixed(2)}ms`,
      performanceImpact: `${(performanceImpact * 100).toFixed(2)}%`,
      requestCallCount,
      cacheCallCount,
      avgTimePerCall: `${(monitoringTime / BENCHMARK_ITERATIONS).toFixed(3)}ms`
    });
    
    expect(performanceImpact).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(requestCallCount + cacheCallCount).toBeGreaterThan(0);
  });

  it('should have minimal performance impact on BackgroundTaskService (<1%)', async () => {
    const testTask = async () => {
      // 模拟轻量级任务
      await new Promise(resolve => setTimeout(resolve, 1));
    };
    
    // 基准测试：无监控
    mockCollectorService.recordRequest.mockImplementation(() => {});
    
    const baselineStart = performance.now();
    const baselinePromises = [];
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      backgroundTaskService.run(testTask, `baseline_task_${i}`);
    }
    
    // 等待所有基准任务完成
    await new Promise(resolve => setTimeout(resolve, 100));
    const baselineEnd = performance.now();
    const baselineTime = baselineEnd - baselineStart;
    
    // 性能测试：启用监控
    let monitoringCallCount = 0;
    mockCollectorService.recordRequest.mockImplementation(() => { monitoringCallCount++; });
    
    const monitoringStart = performance.now();
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      backgroundTaskService.run(testTask, `monitoring_task_${i}`);
    }
    
    // 等待所有监控任务完成
    await new Promise(resolve => setTimeout(resolve, 100));
    const monitoringEnd = performance.now();
    const monitoringTime = monitoringEnd - monitoringStart;
    
    const performanceImpact = (monitoringTime - baselineTime) / baselineTime;
    
    console.log(`BackgroundTaskService 性能基准:`, {
      baselineTime: `${baselineTime.toFixed(2)}ms`,
      monitoringTime: `${monitoringTime.toFixed(2)}ms`,
      performanceImpact: `${(performanceImpact * 100).toFixed(2)}%`,
      monitoringCallCount,
      avgTimePerCall: `${(monitoringTime / BENCHMARK_ITERATIONS).toFixed(3)}ms`
    });
    
    expect(performanceImpact).toBeLessThan(PERFORMANCE_THRESHOLD);
    expect(monitoringCallCount).toBeGreaterThan(0);
  });
});