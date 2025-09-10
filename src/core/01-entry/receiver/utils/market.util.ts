import { Market } from "../../../shared/constants/market.constants";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";

/**
 * 市场相关通用工具函数
 */
export class MarketUtils {
  /**
   * 从单个股票代码推断出其所属的市场。
   * 使用统一的符号验证逻辑
   * @param symbol 股票代码
   * @returns 市场代码 (HK, US, SZ, SH) 或 undefined
   */
  public static getMarketFromSymbol(symbol: string): Market | undefined {
    // 委托给统一的符号验证工具类
    return SymbolValidationUtils.getMarketFromSymbol(symbol);
  }

  /**
   * 从一组股票代码中推断出主要市场。
   * @param symbols 股票代码列表
   * @returns 出现频率最高的市场代码或 undefined
   */
  public static inferMarketFromSymbols(symbols: string[]): Market | undefined {
    if (!symbols || symbols.length === 0) return undefined;

    const marketStats = new Map<Market, number>();

    symbols.forEach((symbol) => {
      const market = this.getMarketFromSymbol(symbol);
      if (market) {
        marketStats.set(market, (marketStats.get(market) || 0) + 1);
      }
    });

    if (marketStats.size === 0) return undefined;

    let maxCount = 0;
    let dominantMarket: Market | undefined = undefined;

    marketStats.forEach((count, market) => {
      if (count > maxCount) {
        maxCount = count;
        dominantMarket = market;
      }
    });

    return dominantMarket;
  }
}
