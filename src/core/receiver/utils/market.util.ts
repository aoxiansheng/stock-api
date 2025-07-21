import { Market } from "@common/constants/market.constants";

import { MARKET_RECOGNITION_RULES } from "../constants/receiver.constants";

/**
 * 市场相关通用工具函数
 */
export class MarketUtils {
  /**
   * 从单个股票代码推断出其所属的市场。
   * @param symbol 股票代码
   * @returns 市场代码 (HK, US, SZ, SH) 或 undefined
   */
  public static getMarketFromSymbol(symbol: string): Market | undefined {
    if (!symbol) return undefined;

    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场
    if (
      upperSymbol.includes(MARKET_RECOGNITION_RULES.HK_PATTERNS.SUFFIX) ||
      MARKET_RECOGNITION_RULES.HK_PATTERNS.NUMERIC_PATTERN.test(upperSymbol)
    ) {
      return Market.HK;
    }

    // 美国市场 (应在A股市场之前判断，因为纯字母代码是美股的典型特征)
    if (MARKET_RECOGNITION_RULES.US_PATTERNS.ALPHA_PATTERN.test(upperSymbol)) {
        return Market.US;
    }

    // 深圳市场
    if (
      upperSymbol.includes(MARKET_RECOGNITION_RULES.SZ_PATTERNS.SUFFIX) ||
      MARKET_RECOGNITION_RULES.SZ_PATTERNS.PREFIX_PATTERNS.some(prefix => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }

    // 上海市场
    if (
      upperSymbol.includes(MARKET_RECOGNITION_RULES.SH_PATTERNS.SUFFIX) ||
      MARKET_RECOGNITION_RULES.SH_PATTERNS.PREFIX_PATTERNS.some(prefix => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }
    
    // 如果没有明确的后缀，但代码符合美股特征，则识别为美股
    if (upperSymbol.includes(MARKET_RECOGNITION_RULES.US_PATTERNS.SUFFIX)) {
        return Market.US;
    }

    return undefined;
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