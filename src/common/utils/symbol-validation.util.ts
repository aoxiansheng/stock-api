import { CONSTANTS } from "@common/constants";
import { REFERENCE_DATA } from "@common/constants/domain";
import { Market } from "../../core/shared/constants/market.constants";
import {
  MARKET_RECOGNITION_RULES,
  RECEIVER_VALIDATION_RULES,
} from "../../core/01-entry/receiver/constants/validation.constants";

/**
 * 统一的股票代码验证工具类
 * 集中管理所有股票代码验证逻辑，避免重复代码
 */
export interface MarketDetectOptions {
  /** 是否将深沪合并为 CN 标签 */
  collapseChina?: boolean;
  /** 未识别时的回退市场 */
  fallback?: (typeof Market)[keyof typeof Market];
}

export class SymbolValidationUtils {
  /**
   * 验证股票代码格式是否有效
   * @param symbol 股票代码
   * @returns 是否有效
   */
  private static readonly SUFFIX_GROUPS = {
    HK: [".HK", ".HKG"],
    US: [".US", ".NASDAQ", ".NYSE"],
    SZ: [".SZ"],
    SH: [".SH"],
    SG: [".SG", ".SGX"],
  } as const;

  private static readonly US_SPECIAL_SYMBOLS: readonly string[] = [
    "SPY",
    "QQQ",
    "IWM",
    "VTI",
    "VOO",
  ];

  private static readonly CRYPTO_KEYWORDS = [
    "USDT",
    "USDC",
    "BTC",
    "ETH",
    "SOL",
  ] as const;

  private static endsWithAny(symbol: string, suffixes: readonly string[]): boolean {
    return suffixes.some((suffix) => symbol.endsWith(suffix));
  }

  private static stripSuffix(symbol: string, suffix: string): string {
    return symbol.slice(0, symbol.length - suffix.length);
  }

  private static formatMarketLabel(
    market: (typeof Market)[keyof typeof Market] | undefined,
    collapseChina?: boolean,
  ): string | undefined {
    if (!market) return undefined;
    if (collapseChina && (market === Market.SZ || market === Market.SH || market === Market.CN)) {
      return Market.CN;
    }
    return market;
  }

  private static isCryptoSymbol(symbol: string): boolean {
    return this.CRYPTO_KEYWORDS.some((keyword) => symbol.includes(keyword));
  }

  public static isValidSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== "string") {
      return false;
    }

    const trimmedSymbol = symbol.trim();

    // 检查长度
    if (
      trimmedSymbol.length < RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH ||
      trimmedSymbol.length > RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH
    ) {
      return false;
    }

    // 检查基本字符格式
    if (!RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN.test(trimmedSymbol)) {
      return false;
    }

    // 检查具体市场格式
    return this.isValidMarketFormat(trimmedSymbol);
  }

  /**
   * 验证股票代码是否符合特定市场格式
   * @param symbol 股票代码
   * @returns 是否符合市场格式
   */
  public static isValidMarketFormat(symbol: string): boolean {
    if (!symbol) return false;

    const upperSymbol = symbol.toUpperCase();

    // HK 市场: 5位数字(00700) 或 .HK 后缀(700.HK)
    if (this.isValidHKSymbol(upperSymbol)) {
      return true;
    }

    // US 市场: 1-5位字母(AAPL) 或 .US 后缀(AAPL.US)，支持点号(如BRK.A)
    if (this.isValidUSSymbol(upperSymbol)) {
      return true;
    }

    // SZ 市场: 00/30开头6位数字(000001) 或 .SZ 后缀(000001.SZ)
    if (this.isValidSZSymbol(upperSymbol)) {
      return true;
    }

    // SH 市场: 60/68开头6位数字(600000) 或 .SH 后缀(600000.SH)
    if (this.isValidSHSymbol(upperSymbol)) {
      return true;
    }

    // 其他市场格式（如新加坡、台湾、日本等）
    if (this.isValidOtherMarketSymbol(upperSymbol)) {
      return true;
    }

    return false;
  }

  /**
   * 验证香港市场股票代码格式
   */
  public static isValidHKSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    for (const suffix of this.SUFFIX_GROUPS.HK) {
      if (upperSymbol.endsWith(suffix)) {
        const prefix = this.stripSuffix(upperSymbol, suffix);

        if (prefix === "HSI") {
          return true;
        }

        return /^\d{1,5}$/.test(prefix);
      }
    }

    if (/^\d{5}$/.test(upperSymbol)) {
      return true;
    }

    if (/^\d{4}$/.test(upperSymbol)) {
      return true;
    }

    return false;
  }

  /**
   * 验证美国市场股票代码格式
   */
  public static isValidUSSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    const basePattern = /^[A-Z]{1,5}(\.[A-Z])?$/;

    for (const suffix of this.SUFFIX_GROUPS.US) {
      if (upperSymbol.endsWith(suffix)) {
        const prefix = this.stripSuffix(upperSymbol, suffix);
        if (
          this.US_SPECIAL_SYMBOLS.includes(prefix) ||
          basePattern.test(prefix)
        ) {
          return true;
        }
        return false;
      }
    }

    if (this.US_SPECIAL_SYMBOLS.includes(upperSymbol)) {
      return true;
    }

    return basePattern.test(upperSymbol);
  }

  /**
   * 验证深圳市场股票代码格式
   */
  public static isValidSZSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    // .SZ 后缀格式：000001.SZ
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.MARKETS.SZ.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .SZ
      return (
        MARKET_RECOGNITION_RULES.MARKETS.SZ.PREFIX_PATTERNS.some((p) =>
          prefix.startsWith(p),
        ) && /^\d{6}$/.test(prefix)
      );
    }

    // 纯数字格式：000001, 300001
    return MARKET_RECOGNITION_RULES.MARKETS.SZ.PREFIX_PATTERNS.some(
      (prefix) => symbol.startsWith(prefix) && /^\d{6}$/.test(symbol),
    );
  }

  /**
   * 验证上海市场股票代码格式
   */
  public static isValidSHSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    // .SH 后缀格式：600000.SH
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.MARKETS.SH.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .SH
      return (
        MARKET_RECOGNITION_RULES.MARKETS.SH.PREFIX_PATTERNS.some((p) =>
          prefix.startsWith(p),
        ) && /^\d{6}$/.test(prefix)
      );
    }

    // 纯数字格式：600000, 688001
    return MARKET_RECOGNITION_RULES.MARKETS.SH.PREFIX_PATTERNS.some(
      (prefix) => symbol.startsWith(prefix) && /^\d{6}$/.test(symbol),
    );
  }

  /**
   * 验证其他市场股票代码格式
   */
  public static isValidOtherMarketSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    // 支持新加坡、台湾、日本等市场：ABC.SG、DEF.SGX、GHI.JP
    return /^[A-Z0-9]{1,10}\.(SG|SGX|TW|JP|KR|AU|CA)$/.test(upperSymbol);
  }

  /**
   * 从股票代码推断市场
   * 按照优先级顺序进行市场判断，避免格式冲突
   */
  public static getMarketFromSymbol(
    symbol: string,
    options: MarketDetectOptions = {},
  ): (typeof Market)[keyof typeof Market] | undefined {
    const normalized = this.normalizeSymbol(symbol);

    if (!normalized) {
      return options.fallback;
    }

    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.HK)) {
      return Market.HK;
    }
    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.US)) {
      return Market.US;
    }
    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.SZ)) {
      return Market.SZ;
    }
    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.SH)) {
      return Market.SH;
    }

    if (/^(00|30)\d{4}$/.test(normalized)) {
      return Market.SZ;
    }
    if (/^(60|68)\d{4}$/.test(normalized)) {
      return Market.SH;
    }

    if (this.isValidUSSymbol(normalized)) {
      return Market.US;
    }

    if (/^\d{4,5}$/.test(normalized)) {
      return Market.HK;
    }

    return options.fallback;
  }

  /**
   * 批量验证股票代码
   * @param symbols 股票代码数组
   * @returns 验证结果对象：{ valid: string[], invalid: string[] }
   */
  public static inferMarketLabel(
    symbol: string,
    options: MarketDetectOptions = {},
  ): string {
    const normalized = this.normalizeSymbol(symbol);
    const collapseChina = options.collapseChina;

    if (!normalized) {
      return (
        this.formatMarketLabel(options.fallback, collapseChina) ?? 'UNKNOWN'
      );
    }

    const detectedMarket = this.getMarketFromSymbol(normalized, {
      ...options,
      fallback: undefined,
    });

    const detectedLabel = this.formatMarketLabel(detectedMarket, collapseChina);
    if (detectedLabel) {
      return detectedLabel;
    }

    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.SG)) {
      return 'SG';
    }

    if (this.isCryptoSymbol(normalized)) {
      return Market.CRYPTO;
    }

    return (
      this.formatMarketLabel(options.fallback, collapseChina) ?? 'UNKNOWN'
    );
  }

  public static isExtendedMarketSymbol(symbol: string): boolean {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) {
      return false;
    }

    if (this.endsWithAny(normalized, this.SUFFIX_GROUPS.SG)) {
      return true;
    }

    return this.isCryptoSymbol(normalized);
  }

  public static validateSymbols(symbols: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    symbols.forEach((symbol) => {
      if (this.isValidSymbol(symbol)) {
        valid.push(symbol);
      } else {
        invalid.push(symbol);
      }
    });

    return { valid, invalid };
  }

  /**
   * 标准化股票代码格式
   * @param symbol 原始股票代码
   * @returns 标准化后的股票代码
   */
  public static normalizeSymbol(symbol: string): string {
    if (!symbol) return symbol;

    return symbol.trim().toUpperCase();
  }

  /**
   * 检查股票代码列表是否超过数量限制
   * @param symbols 股票代码数组
   * @param maxCount 最大数量限制（默认使用系统配置）
   * @returns 是否超过限制
   */
  public static isSymbolCountExceeded(
    symbols: string[],
    maxCount?: number,
  ): boolean {
    const limit = maxCount || RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT;
    return symbols.length > limit;
  }

  /**
   * 获取支持的股票代码格式示例
   */
  public static getSupportedFormatExamples(): Record<string, string[]> {
    return {
      HK: [
        REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        "00700.HK",
        "09618.HK",
        "HSI.HK",
        "00700",
        "09618",
        "9988",
      ],
      US: ["AAPL.US", "AAPL", "SPY.US", "SPY", "BRK.A", "BRK.A.US"],
      SZ: ["000001.SZ", "000001", "300001.SZ", "300001"],
      SH: ["600000.SH", "600000", "688001.SH", "688001"],
      Others: ["D05.SG", "TSM.TW", "7203.JP"],
    };
  }
}
