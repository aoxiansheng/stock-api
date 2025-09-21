import { CACHE_KEY_PREFIXES } from "../constants/cache.constants";
import { CACHE_CONFIG } from "../constants/cache-config.constants";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * 缓存键生成工具类
 */
export class CacheKeyUtils {
  /**
   * 生成缓存键
   * @param prefix 键前缀
   * @param parts 键组成部分
   * @returns 完整的缓存键
   */
  static generateCacheKey(prefix: string, ...parts: string[]): string {
    const validParts = parts.filter(Boolean);
    const key = `${prefix}:${validParts.join(":")}`;

    // 验证键长度
    if (key.length > CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.COMMON_CACHE,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'generateCacheKey',
        message: `Cache key too long: ${key.length} > ${CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH}`,
        context: {
          keyLength: key.length,
          maxLength: CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH,
          prefix,
          parts: parts.filter(Boolean),
          generatedKey: key
        }
      });
    }

    return key;
  }

  /**
   * 生成股票报价缓存键
   * @param symbol 股票代码
   * @param provider 数据提供商
   * @param market 市场
   * @returns 股票报价缓存键
   */
  static generateStockQuoteKey(
    symbol: string,
    provider: string,
    market?: string,
  ): string {
    const parts = [symbol, provider];
    if (market) {
      parts.push(market);
    }
    return this.generateCacheKey(CACHE_KEY_PREFIXES.STOCK_QUOTE, ...parts);
  }

  /**
   * 生成市场状态缓存键
   * @param market 市场标识符
   * @param date 日期 (YYYY-MM-DD)
   * @returns 市场状态缓存键
   */
  static generateMarketStatusKey(market: string, date?: string): string {
    const parts = [market];
    if (date) {
      parts.push(date);
    }
    return this.generateCacheKey(CACHE_KEY_PREFIXES.MARKET_STATUS, ...parts);
  }

  /**
   * 生成符号映射缓存键
   * @param sourceSymbol 源符号
   * @param targetFormat 目标格式
   * @returns 符号映射缓存键
   */
  static generateSymbolMappingKey(
    sourceSymbol: string,
    targetFormat: string,
  ): string {
    return this.generateCacheKey(
      CACHE_KEY_PREFIXES.SYMBOL_MAPPING,
      sourceSymbol,
      targetFormat,
    );
  }

  /**
   * 生成提供商数据缓存键
   * @param provider 提供商名称
   * @param dataType 数据类型
   * @param identifier 标识符
   * @returns 提供商数据缓存键
   */
  static generateProviderDataKey(
    provider: string,
    dataType: string,
    identifier: string,
  ): string {
    return this.generateCacheKey(
      CACHE_KEY_PREFIXES.PROVIDER_DATA,
      provider,
      dataType,
      identifier,
    );
  }

  /**
   * 生成批量操作缓存键
   * @param keys 原始键数组
   * @returns 处理后的键数组
   */
  static prepareBatchKeys(keys: string[]): string[] {
    return keys.map((key) => {
      if (key.length > CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.COMMON_CACHE,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'prepareBatchKeys',
          message: `Cache key too long in batch operation: ${key.length} > ${CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH}`,
          context: {
            keyLength: key.length,
            maxLength: CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH,
            invalidKey: key,
            operation: 'batch_key_preparation'
          }
        });
      }
      return key;
    });
  }

  /**
   * 解析缓存键
   * @param key 缓存键
   * @returns 解析结果
   */
  static parseKey(key: string): { prefix: string; parts: string[] } {
    const firstColonIndex = key.indexOf(":");
    if (firstColonIndex === -1) {
      return { prefix: key, parts: [] };
    }

    const prefix = key.substring(0, firstColonIndex);
    const remainingPart = key.substring(firstColonIndex + 1);
    const parts = remainingPart.split(":"); // 即使是空字符串也分割，保持一致性

    return { prefix, parts };
  }

  /**
   * 验证键格式是否正确
   * @param key 缓存键
   * @returns 是否有效
   */
  static isValidKey(key: string): boolean {
    if (!key || typeof key !== "string") {
      return false;
    }

    if (key.length > CACHE_CONFIG.MEMORY.MAX_KEY_LENGTH) {
      return false;
    }

    // 检查是否包含非法字符（空格、换行符、回车符、制表符）
    const illegalChars = /[ \n\r\t]/;
    if (illegalChars.test(key)) {
      return false;
    }

    return true;
  }

  /**
   * 生成通配符键用于模式匹配
   * @param prefix 前缀
   * @param pattern 模式
   * @returns 通配符键
   */
  static generatePatternKey(prefix: string, pattern: string = "*"): string {
    return `${prefix}:${pattern}`;
  }

  /**
   * 规范化键名
   * @param key 原始键
   * @returns 规范化后的键
   */
  static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_:.-]/g, "");
  }
}
