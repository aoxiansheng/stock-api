import { Market } from '@common/constants/market.constants';
import { MARKET_RECOGNITION_RULES, RECEIVER_VALIDATION_RULES } from '../../core/receiver/constants/receiver.constants';

/**
 * 统一的股票代码验证工具类
 * 集中管理所有股票代码验证逻辑，避免重复代码
 */
export class SymbolValidationUtils {
  
  /**
   * 验证股票代码格式是否有效
   * @param symbol 股票代码
   * @returns 是否有效
   */
  public static isValidSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') {
      return false;
    }

    const trimmedSymbol = symbol.trim();
    
    // 检查长度
    if (trimmedSymbol.length < RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH || 
        trimmedSymbol.length > RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH) {
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
    
    // .HK 后缀格式：700.HK, 00700.HK, 09618.HK（支持1-5位数字，包含前导零）
    // 特殊支持：HSI.HK（恒生指数）
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.HK_PATTERNS.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .HK
      
      // 特殊处理指数代码
      if (prefix === 'HSI') {
        return true; // 恒生指数
      }
      
      return /^\d{1,5}$/.test(prefix); // 1-5位数字，支持前导零
    }

    // 纯数字格式：香港市场通常是5位数字格式
    if (/^\d{5}$/.test(symbol)) {
      return true; // 5位数字格式认为是香港市场（包括00700, 09618等）
    }

    // 4位数字格式也可能是香港市场（如1234）
    if (/^\d{4}$/.test(symbol)) {
      return true;
    }

    return false;
  }

  /**
   * 验证美国市场股票代码格式
   */
  public static isValidUSSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // .US 后缀格式：AAPL.US, BRK.A.US, SPY.US
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.US_PATTERNS.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .US
      
      // 特殊处理ETF和指数代码
      if (['SPY', 'QQQ', 'IWM', 'VTI', 'VOO'].includes(prefix)) {
        return true; // 常见ETF代码
      }
      
      return /^[A-Z]{1,5}(\.[A-Z])?$/.test(prefix); // 支持 BRK.A 格式
    }

    // 纯字母格式：AAPL, BRK.A, SPY
    // 特殊处理ETF和指数代码
    if (['SPY', 'QQQ', 'IWM', 'VTI', 'VOO'].includes(upperSymbol)) {
      return true; // 常见ETF代码
    }
    
    return /^[A-Z]{1,5}(\.[A-Z])?$/.test(upperSymbol);
  }

  /**
   * 验证深圳市场股票代码格式
   */
  public static isValidSZSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // .SZ 后缀格式：000001.SZ
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.SZ_PATTERNS.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .SZ
      return MARKET_RECOGNITION_RULES.SZ_PATTERNS.PREFIX_PATTERNS.some(p => prefix.startsWith(p)) && 
             /^\d{6}$/.test(prefix);
    }

    // 纯数字格式：000001, 300001
    return MARKET_RECOGNITION_RULES.SZ_PATTERNS.PREFIX_PATTERNS.some(prefix => 
      symbol.startsWith(prefix) && /^\d{6}$/.test(symbol)
    );
  }

  /**
   * 验证上海市场股票代码格式
   */
  public static isValidSHSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // .SH 后缀格式：600000.SH
    if (upperSymbol.endsWith(MARKET_RECOGNITION_RULES.SH_PATTERNS.SUFFIX)) {
      const prefix = upperSymbol.slice(0, -3); // 去掉 .SH
      return MARKET_RECOGNITION_RULES.SH_PATTERNS.PREFIX_PATTERNS.some(p => prefix.startsWith(p)) && 
             /^\d{6}$/.test(prefix);
    }

    // 纯数字格式：600000, 688001
    return MARKET_RECOGNITION_RULES.SH_PATTERNS.PREFIX_PATTERNS.some(prefix => 
      symbol.startsWith(prefix) && /^\d{6}$/.test(symbol)
    );
  }

  /**
   * 验证其他市场股票代码格式
   */
  public static isValidOtherMarketSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    
    // 支持新加坡、台湾、日本等市场：ABC.SG, DEF.TW, GHI.JP
    return /^[A-Z0-9]{1,10}\.(SG|TW|JP|KR|AU|CA)$/.test(upperSymbol);
  }

  /**
   * 从股票代码推断市场
   * 按照优先级顺序进行市场判断，避免格式冲突
   */
  public static getMarketFromSymbol(symbol: string): Market | undefined {
    if (!symbol) return undefined;

    const upperSymbol = symbol.toUpperCase().trim();

    // 1. 先检查有明确后缀的格式
    if (upperSymbol.endsWith('.HK')) {
      return Market.HK;
    }
    if (upperSymbol.endsWith('.US')) {
      return Market.US;
    }
    if (upperSymbol.endsWith('.SZ')) {
      return Market.SZ;
    }
    if (upperSymbol.endsWith('.SH')) {
      return Market.SH;
    }

    // 2. 检查中国市场的特定前缀（6位数字，特定开头）
    // 深圳：00、30开头的6位数字
    if (/^(00|30)\d{4}$/.test(upperSymbol)) {
      return Market.SZ;
    }
    // 上海：60、68开头的6位数字  
    if (/^(60|68)\d{4}$/.test(upperSymbol)) {
      return Market.SH;
    }

    // 3. 检查美国市场的字母格式
    if (this.isValidUSSymbol(upperSymbol)) {
      return Market.US;
    }

    // 4. 检查香港市场（4-5位数字格式，包括00700, 09618等）
    if (/^\d{4,5}$/.test(upperSymbol)) {
      return Market.HK;
    }

    return undefined;
  }

  /**
   * 批量验证股票代码
   * @param symbols 股票代码数组
   * @returns 验证结果对象：{ valid: string[], invalid: string[] }
   */
  public static validateSymbols(symbols: string[]): { valid: string[], invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    symbols.forEach(symbol => {
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
  public static isSymbolCountExceeded(symbols: string[], maxCount?: number): boolean {
    const limit = maxCount || RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT;
    return symbols.length > limit;
  }

  /**
   * 获取支持的股票代码格式示例
   */
  public static getSupportedFormatExamples(): Record<string, string[]> {
    return {
      HK: ['700.HK', '00700.HK', '09618.HK', 'HSI.HK', '00700', '09618', '9988'],
      US: ['AAPL.US', 'AAPL', 'SPY.US', 'SPY', 'BRK.A', 'BRK.A.US'],
      SZ: ['000001.SZ', '000001', '300001.SZ', '300001'],
      SH: ['600000.SH', '600000', '688001.SH', '688001'],
      Others: ['D05.SG', 'TSM.TW', '7203.JP']
    };
  }
}