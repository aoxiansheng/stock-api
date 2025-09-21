import { Market } from '@core/shared/constants/market.constants';
import {
  MarketInferenceCacheOptions,
  MarketInferenceMetricsAdapter,
} from '@common/modules/market-inference/interfaces/market-inference.interfaces';
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';

describe('MarketInferenceService', () => {
  let metrics: jest.Mocked<MarketInferenceMetricsAdapter>;
  let service: MarketInferenceService;

  beforeEach(() => {
    metrics = {
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
    };
    service = new MarketInferenceService(metrics);
  });

  const enableCache = (options?: MarketInferenceCacheOptions) => {
    service.configureCache(options ?? { max: 10, ttl: 1000 });
  };

  it('空符号应返回 fallback 市场', () => {
    const result = service.inferMarket('', { fallback: Market.SH });
    expect(result).toBe(Market.SH);
  });

  it('应根据符号判断市场并缓存结果', () => {
    enableCache({ max: 16, ttl: 1000 });

    const first = service.inferMarket('00700.HKG');
    const second = service.inferMarket('00700.HKG');

    expect(first).toBe(Market.HK);
    expect(second).toBe(Market.HK);
    expect(metrics.recordCacheMiss).toHaveBeenCalledTimes(1);
    expect(metrics.recordCacheHit).toHaveBeenCalledTimes(1);
  });

  it('未启用缓存时不应记录命中统计', () => {
    service.configureCache(undefined);

    service.inferMarket('AAPL.NASDAQ');

    expect(metrics.recordCacheMiss).not.toHaveBeenCalled();
    expect(metrics.recordCacheHit).not.toHaveBeenCalled();
  });

  it('应返回 collapseChina 标签', () => {
    const label = service.inferMarketLabel('600000.SH', { collapseChina: true });
    expect(label).toBe('CN');
  });

  it('批量推断应复用单个推断方法', () => {
    const markets = service.inferMarkets(['00700.HK', 'AAPL.US']);
    expect(markets).toEqual([Market.HK, Market.US]);

    const labels = service.inferMarketLabels(['600000.SH', 'BTCUSDT'], {
      collapseChina: true,
      fallback: Market.US,
    });
    expect(labels).toEqual(['CN', Market.CRYPTO]);
  });
  it('应返回出现频次最高的市场', () => {
    const market = service.inferDominantMarket(['00700.HK', 'AAPL.US', 'AAPL.NASDAQ']);
    expect(market).toBe(Market.US);

    const fallbackMarket = service.inferDominantMarket([], { fallback: Market.HK });
    expect(fallbackMarket).toBe(Market.HK);
  });

  it('关闭缓存后应清空统计信息', () => {
    enableCache({ max: 4, ttl: 1000 });
    service.inferMarket('AAPL.NYSE');

    const enabledStats = service.getCacheStats();
    expect(enabledStats.enabled).toBe(true);
    expect(enabledStats.size).toBe(1);

    service.configureCache(undefined);
    const disabledStats = service.getCacheStats();
    expect(disabledStats.enabled).toBe(false);
    expect(disabledStats.size).toBe(0);
  });
});
