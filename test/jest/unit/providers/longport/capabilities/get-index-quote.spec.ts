/* eslint-disable @typescript-eslint/no-unused-vars */
import { getIndexQuote } from '../../../../../../src/providers/longport/capabilities/get-index-quote';
import { MARKETS } from '../../../../../../src/common/constants/market.constants';

describe('getIndexQuote', () => {
  const mockQuoteContext = {
    quote: jest.fn(),
  };

  const mockContextService = {
    getQuoteContext: jest.fn().mockResolvedValue(mockQuoteContext),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct _name, _description, and supported markets/formats', () => {
    expect(getIndexQuote.name).toBe('get-index-quote');
    expect(getIndexQuote.description).toBe('获取指数实时报价数据');
    expect(getIndexQuote._supportedMarkets).toEqual([MARKETS._HK, MARKETS._SZ, MARKETS.SH]);
    expect(getIndexQuote._supportedSymbolFormats).toEqual(['HSI.HI', '000001.SH', '399001.SZ']);
    expect(getIndexQuote._rateLimit).toEqual({
      requestsPerSecond: 10,
      requestsPerDay: 5000,
    });
  });

  it('should successfully fetch and format index quotes', async () => {
    const symbols = ['HSI.HI', '000001.SH'];
    const mockLongportQuotes = [
      {
        symbol: 'HSI.HI',
        lastDone: 25000,
        prevClose: 24900,
        open: 24950,
        high: 25100,
        low: 24800,
        volume: 1000000,
        turnover: 25000000000,
        timestamp: 1678886400,
        tradeStatus: 'TRADING',
      },
      {
        symbol: '000001.SH',
        lastDone: 3200,
        prevClose: 3190,
        open: 3195,
        high: 3210,
        low: 3180,
        volume: 5000000,
        turnover: 16000000000,
        timestamp: 1678886400,
        tradeStatus: 'TRADING',
      },
    ];

    mockQuoteContext.quote.mockResolvedValue(mockLongportQuotes);

    const result = await getIndexQuote.execute({
      symbols,
      contextService: mockContextService,
    });

    expect(mockContextService.getQuoteContext).toHaveBeenCalledTimes(1);
    expect(mockQuoteContext.quote).toHaveBeenCalledWith(symbols);
    expect(result).toEqual({
      secu_quote: [
        {
          symbol: 'HSI.HI',
          lastdone: 25000,
          prevclose: 24900,
          open: 24950,
          high: 25100,
          low: 24800,
          volume: 1000000,
          turnover: 25000000000,
          timestamp: 1678886400,
          tradestatus: 'TRADING',
        },
        {
          symbol: '000001.SH',
          last_done: 3200,
          prev_close: 3190,
          open: 3195,
          high: 3210,
          low: 3180,
          volume: 5000000,
          turnover: 16000000000,
          timestamp: 1678886400,
          trade_status: 'TRADING',
        },
      ],
    });
  });

  it('should throw an error if contextService is not provided', async () => {
    const symbols = ['HSI.HI'];
    await expect(getIndexQuote.execute({ symbols })).rejects.toThrow(
      'LongportContextService 未提供',
    );
  });

  it('should throw an error if getQuoteContext fails', async () => {
    const symbols = ['HSI.HI'];
    mockContextService.getQuoteContext.mockRejectedValue(new Error('Quote API error'));

    await expect(
      getIndexQuote.execute({ symbols, contextService: mockContextService }),
    ).rejects.toThrow('LongPort 获取指数报价失败: Quote API error');
  });

  it('should throw an error if quote call fails', async () => {
    const symbols = ['HSI.HI'];
    mockQuoteContext.quote.mockRejectedValue(new Error('Quote API error'));

    await expect(
      getIndexQuote.execute({ symbols, contextService: mockContextService }),
    ).rejects.toThrow('LongPort 获取指数报价失败: Quote API error');
  });
});
