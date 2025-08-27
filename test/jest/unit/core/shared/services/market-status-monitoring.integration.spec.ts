/**
 * MarketStatusService监控集成测试
 * 验证监控数据流是否正确
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MarketStatusService } from '../../../../../../src/core/shared/services/market-status.service';
import { CollectorService } from '../../../../../../src/monitoring/collector/collector.service';
import { Market } from '../../../../../../src/common/constants/market.constants';

describe('MarketStatusService Monitoring Integration', () => {
  let service: MarketStatusService;
  let mockCollectorService: jest.Mocked<CollectorService>;
  
  beforeEach(async () => {
    const mockCollector = {
      recordRequest: jest.fn(),
      recordCacheOperation: jest.fn(),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketStatusService,
        { provide: CollectorService, useValue: mockCollector },
      ],
    }).compile();
    
    service = module.get<MarketStatusService>(MarketStatusService);
    mockCollectorService = module.get(CollectorService);
  });
  
  it('should record cache hit metrics on successful cache lookup', async () => {
    // 首次调用会触发缓存未命中
    await service.getMarketStatus(Market.HK);
    
    // 等待setImmediate回调执行
    await new Promise(resolve => setImmediate(resolve));
    
    // 第二次调用应该触发缓存命中
    await service.getMarketStatus(Market.HK);
    
    // 再次等待setImmediate回调执行
    await new Promise(resolve => setImmediate(resolve));
    
    // 验证缓存操作被记录（至少被调用过）
    expect(mockCollectorService.recordCacheOperation).toHaveBeenCalled();
  });
  
  it('should record batch processing metrics', async () => {
    const markets = [Market.HK, Market.US, Market.SH];
    
    await service.getBatchMarketStatus(markets);
    
    // 等待setImmediate回调执行
    await new Promise(resolve => setImmediate(resolve));
    
    // 验证批量操作监控被记录
    expect(mockCollectorService.recordRequest).toHaveBeenCalled();
  });
  
  it('should handle monitoring failures gracefully', async () => {
    // 模拟监控服务失败
    mockCollectorService.recordCacheOperation.mockImplementation(() => {
      throw new Error('Monitoring service unavailable');
    });
    
    // 业务功能应该继续正常工作
    const result = await service.getMarketStatus(Market.HK);
    expect(result).toBeDefined();
    expect(result.market).toBe(Market.HK);
  });
});