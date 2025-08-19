/* eslint-disable @typescript-eslint/no-unused-vars */

import { MarketUtils } from '../../../../../../../src/core/01-entry/receiver/utils/market.util';
import { Market } from '../../../../../../../src/common/constants/market.constants';

describe('MarketUtils', () => {

  describe('getMarketFromSymbol', () => {
    // 香港市场测试
    it('应能正确识别香港市场股票', () => {
      expect(MarketUtils.getMarketFromSymbol('700.HK')).toBe(Market.HK);
      expect(MarketUtils.getMarketFromSymbol('00700')).toBe(Market.HK);
      expect(MarketUtils.getMarketFromSymbol('9988.hk')).toBe(Market.HK); // 测试小写
    });

    // 美国市场测试
    it('应能正确识别美国市场股票', () => {
      expect(MarketUtils.getMarketFromSymbol('AAPL.US')).toBe(Market.US);
      expect(MarketUtils.getMarketFromSymbol('GOOGL')).toBe(Market.US);
      expect(MarketUtils.getMarketFromSymbol('TSLA')).toBe(Market.US);
    });

    // 深圳市场测试
    it('应能正确识别深圳市场股票', () => {
      expect(MarketUtils.getMarketFromSymbol('000001.SZ')).toBe(Market.SZ);
      expect(MarketUtils.getMarketFromSymbol('300750')).toBe(Market.SZ);
    });

    // 上海市场测试
    it('应能正确识别上海市场股票', () => {
      expect(MarketUtils.getMarketFromSymbol('600519.SH')).toBe(Market.SH);
      expect(MarketUtils.getMarketFromSymbol('688981')).toBe(Market.SH);
    });

    // 无效或无法识别的符号
    it('对于无法识别的符号应返回 undefined', () => {
      expect(MarketUtils.getMarketFromSymbol('UNKNOWN123')).toBeUndefined();
      expect(MarketUtils.getMarketFromSymbol('1234567')).toBeUndefined(); // 数字过多
    });

    // 边缘情况测试
    it('对于空或无效输入应返回 undefined', () => {
      expect(MarketUtils.getMarketFromSymbol('')).toBeUndefined();
      expect(MarketUtils.getMarketFromSymbol(null)).toBeUndefined();
      expect(MarketUtils.getMarketFromSymbol(undefined)).toBeUndefined();
    });
  });

  describe('inferMarketFromSymbols', () => {
    it('应能从列表中推断出主导市场', () => {
      const symbols = ['AAPL.US', 'GOOGL', '700.HK'];
      expect(MarketUtils.inferMarketFromSymbols(symbols)).toBe(Market.US);
    });

    it('当市场数量相同时，应返回其中一个', () => {
        const symbols = ['AAPL.US', '700.HK'];
        const result = MarketUtils.inferMarketFromSymbols(symbols);
        // 结果可能是 US 或 HK，取决于 Map 迭代的顺序，只要有返回即可
        expect([Market.US, Market.HK]).toContain(result);
      });

    it('对于空列表应返回 undefined', () => {
      expect(MarketUtils.inferMarketFromSymbols([])).toBeUndefined();
    });

    it('对于无法识别符号的列表应返回 undefined', () => {
      const symbols = ['UNKNOWN1', 'UNKNOWN2'];
      expect(MarketUtils.inferMarketFromSymbols(symbols)).toBeUndefined();
    });
  });

});
