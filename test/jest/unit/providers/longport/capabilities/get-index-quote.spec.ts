import { getIndexQuote } from '../../../../../../src/providers/longport/capabilities/get-index-quote';

describe('getIndexQuote Capability', () => {
  // 测试当 contextService 未提供时的情况
  it('should throw an error if contextService is not provided', async () => {
    // 调用 execute 方法，期望捕获到错误
    await expect(getIndexQuote.execute({ symbols: ['HSI.HI'] })).rejects.toThrow(
      'LongportContextService 未提供',
    );
  });

  // 测试当 contextService.getQuoteContext 抛出错误时的情况
  it('should throw an error if getQuoteContext fails', async () => {
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockRejectedValue(new Error('Failed to get context')),
    };
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getIndexQuote.execute({ symbols: ['HSI.HI'], contextService: mockContextService }),
    ).rejects.toThrow('LongPort 获取指数报价失败: Failed to get context');
  });

  // 测试当 ctx.quote 抛出错误时的情况
  it('should throw an error if quote fails', async () => {
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      quote: jest.fn().mockRejectedValue(new Error('Failed to get quote')),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };
    // 调用 execute 方法，期望捕获到错误
    await expect(
      getIndexQuote.execute({ symbols: ['HSI.HI'], contextService: mockContextService }),
    ).rejects.toThrow('LongPort 获取指数报价失败: Failed to get quote');
  });

  // 测试成功获取报价时的情况
  it('should return quotes successfully', async () => {
    // 创建一个模拟的报价数据
    const mockQuotes = [
      {
        symbol: 'HSI.HI',
        lastDone: 20000,
        prevClose: 19900,
        open: 19950,
        high: 20100,
        low: 19800,
        volume: 1000000,
        turnover: 20000000000,
        timestamp: new Date(),
        tradeStatus: 'TRADING',
      },
    ];
    // 创建一个模拟的 quote context
    const mockQuoteContext = {
      quote: jest.fn().mockResolvedValue(mockQuotes),
    };
    // 创建一个模拟的 contextService
    const mockContextService = {
      getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
    };

    // 调用 execute 方法
    const result = await getIndexQuote.execute({ symbols: ['HSI.HI'], contextService: mockContextService });

    // 断言返回的结果是否正确
    expect(result.secu_quote).toHaveLength(1);
    expect(result.secu_quote[0].symbol).toBe('HSI.HI');
  });
});