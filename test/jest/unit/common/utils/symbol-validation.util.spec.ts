import { Market } from '@core/shared/constants/market.constants';
import {
  MarketDetectOptions,
  SymbolValidationUtils,
} from '@common/utils/symbol-validation.util';

describe('SymbolValidationUtils 市场推断扩展', () => {
  describe('getMarketFromSymbol', () => {
    it('应该识别 .HKG 后缀为香港市场', () => {
      expect(SymbolValidationUtils.getMarketFromSymbol('00700.HKG')).toBe(Market.HK);
    });

    it('应该识别 .NASDAQ 后缀为美国市场', () => {
      expect(SymbolValidationUtils.getMarketFromSymbol('AAPL.NASDAQ')).toBe(Market.US);
    });

    it('未识别时应返回指定的 fallback 市场', () => {
      const options: MarketDetectOptions = { fallback: Market.US };
      expect(SymbolValidationUtils.getMarketFromSymbol('UNKNOWN', options)).toBe(Market.US);
    });
  });

  describe('inferMarketLabel', () => {
    it('collapseChina 为 true 时应返回 CN 标签', () => {
      const label = SymbolValidationUtils.inferMarketLabel('600000.SH', { collapseChina: true });
      expect(label).toBe('CN');
    });

    it('SGX 后缀应返回 SG 标签', () => {
      expect(SymbolValidationUtils.inferMarketLabel('AAPL.SGX')).toBe('SG');
    });

    it('无法识别时返回 fallback 标签', () => {
      const label = SymbolValidationUtils.inferMarketLabel('???', { fallback: Market.US });
      expect(label).toBe(Market.US);
    });

    it('包含加密货币关键词时应返回 CRYPTO', () => {
      expect(SymbolValidationUtils.inferMarketLabel('BTCUSDT')).toBe(Market.CRYPTO);
    });
  });

  describe('isExtendedMarketSymbol', () => {
    it('SGX 符号属于扩展市场', () => {
      expect(SymbolValidationUtils.isExtendedMarketSymbol('AAPL.SGX')).toBe(true);
    });

    it('常规美股符号不属于扩展市场', () => {
      expect(SymbolValidationUtils.isExtendedMarketSymbol('AAPL.US')).toBe(false);
    });
  });

  describe('其他市场校验', () => {
    it('应识别 SGX 符号为有效的其他市场格式', () => {
      expect(SymbolValidationUtils.isValidOtherMarketSymbol('AAPL.SGX')).toBe(true);
    });
  });
});
