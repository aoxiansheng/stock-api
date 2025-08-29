import { 
  SYMBOL_FORMAT_PATTERNS, 
  MARKET_TYPES, 
  PERFORMANCE_CONFIG, 
  MarketType 
} from '../constants/symbol-transformer.constants';

/**
 * 符号格式工具类
 * 优化性能：使用预编译正则表达式和缓存机制
 */
export class SymbolFormatUtils {
  // 格式验证结果缓存（LRU机制，防止内存泄漏）
  private static readonly formatCache = new Map<string, boolean>();
  private static readonly marketCache = new Map<string, MarketType>();
  private static readonly maxCacheSize = 1000;

  /**
   * 判断是否为标准格式（使用预编译正则）
   * @param symbol 符号
   * @returns 是否为标准格式
   */
  static isStandardFormat(symbol: string): boolean {
    // 输入验证（防DoS攻击）
    if (!symbol || symbol.length > PERFORMANCE_CONFIG.MAX_SYMBOL_LENGTH) {
      return false;
    }

    // 缓存查找
    if (this.formatCache.has(symbol)) {
      return this.formatCache.get(symbol)!;
    }

    // 使用预编译正则表达式
    const isStandard = SYMBOL_FORMAT_PATTERNS.CN_STOCK.test(symbol) || 
                      SYMBOL_FORMAT_PATTERNS.US_STOCK.test(symbol);

    // 更新缓存（LRU策略）
    this.updateCache(this.formatCache, symbol, isStandard);
    
    return isStandard;
  }

  /**
   * 推断市场类型（优化版本）
   * @param symbols 符号数组
   * @returns 市场类型
   */
  static inferMarketFromSymbols(symbols: string[]): MarketType {
    if (!symbols || symbols.length === 0) {
      return MARKET_TYPES.UNKNOWN;
    }

    // 使用第一个有效符号推断
    const sample = symbols.find(s => s && s.length > 0 && s.length <= PERFORMANCE_CONFIG.MAX_SYMBOL_LENGTH);
    if (!sample) {
      return MARKET_TYPES.UNKNOWN;
    }

    // 缓存查找
    if (this.marketCache.has(sample)) {
      return this.marketCache.get(sample)!;
    }

    let market: MarketType;

    // 使用预编译正则表达式进行高效匹配
    if (SYMBOL_FORMAT_PATTERNS.CN_STOCK.test(sample)) {
      market = MARKET_TYPES.CN;
    } else if (SYMBOL_FORMAT_PATTERNS.US_STOCK.test(sample)) {
      market = MARKET_TYPES.US;
    } else if (SYMBOL_FORMAT_PATTERNS.HK_STOCK.test(sample)) {
      market = MARKET_TYPES.HK;
    } else if (SYMBOL_FORMAT_PATTERNS.SG_STOCK.test(sample)) {
      market = MARKET_TYPES.SG;
    } else {
      market = MARKET_TYPES.MIXED;
    }

    // 更新缓存
    this.updateCache(this.marketCache, sample, market);
    
    return market;
  }

  /**
   * 批量验证符号格式（性能优化版本）
   * @param symbols 符号数组
   * @returns 验证结果
   */
  static validateSymbolsFormat(symbols: string[]): {
    validSymbols: string[];
    invalidSymbols: string[];
    oversizedSymbols: string[];
  } {
    const validSymbols: string[] = [];
    const invalidSymbols: string[] = [];
    const oversizedSymbols: string[] = [];

    for (const symbol of symbols) {
      if (!symbol) {
        invalidSymbols.push(symbol);
        continue;
      }

      if (symbol.length > PERFORMANCE_CONFIG.MAX_SYMBOL_LENGTH) {
        oversizedSymbols.push(symbol);
        continue;
      }

      if (this.isValidSymbolFormat(symbol)) {
        validSymbols.push(symbol);
      } else {
        invalidSymbols.push(symbol);
      }
    }

    return { validSymbols, invalidSymbols, oversizedSymbols };
  }

  /**
   * 分离符号格式（优化内存分配）
   * @param symbols 符号数组
   * @returns 分离结果
   */
  static separateSymbolsByFormat(symbols: string[]): {
    symbolsToTransform: string[];
    standardSymbols: string[];
  } {
    // 预分配数组大小，减少内存重分配
    const symbolsToTransform: string[] = [];
    const standardSymbols: string[] = [];
    
    // 批量处理，减少函数调用开销
    for (const symbol of symbols) {
      if (this.isStandardFormat(symbol)) {
        standardSymbols.push(symbol);
      } else {
        symbolsToTransform.push(symbol);
      }
    }
    
    return { symbolsToTransform, standardSymbols };
  }

  /**
   * 清理缓存（防止内存泄漏）
   */
  static clearCaches(): void {
    this.formatCache.clear();
    this.marketCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    formatCacheSize: number;
    marketCacheSize: number;
    maxCacheSize: number;
  } {
    return {
      formatCacheSize: this.formatCache.size,
      marketCacheSize: this.marketCache.size,
      maxCacheSize: this.maxCacheSize,
    };
  }

  /**
   * 私有方法：检查符号格式有效性
   */
  private static isValidSymbolFormat(symbol: string): boolean {
    return SYMBOL_FORMAT_PATTERNS.CN_STOCK.test(symbol) ||
           SYMBOL_FORMAT_PATTERNS.US_STOCK.test(symbol) ||
           SYMBOL_FORMAT_PATTERNS.HK_STOCK.test(symbol) ||
           SYMBOL_FORMAT_PATTERNS.SG_STOCK.test(symbol) ||
           SYMBOL_FORMAT_PATTERNS.MARKET_SUFFIX.test(symbol);
  }

  /**
   * 私有方法：LRU缓存更新策略
   */
  private static updateCache<T>(cache: Map<string, T>, key: string, value: T): void {
    // 如果缓存已满，删除最旧的条目
    if (cache.size >= this.maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, value);
  }
}