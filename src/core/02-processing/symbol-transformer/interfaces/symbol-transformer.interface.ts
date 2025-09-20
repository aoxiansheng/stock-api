import { SymbolTransformResult } from "./symbol-transform-result.interface";

/**
 * 符号转换器接口
 * 为 SymbolTransformerService 提供抽象层，支持依赖注入和测试
 */
export interface ISymbolTransformer {
  /**
   * 核心转换方法 - 批量符号转换
   * @param provider 提供商名称
   * @param symbols 符号字符串或符号数组
   * @param direction 转换方向
   * @returns 转换结果
   */
  transformSymbols(
    provider: string,
    symbols: string | string[],
    direction: "to_standard" | "from_standard",
  ): Promise<SymbolTransformResult>;

  /**
   * 单符号转换便捷方法
   * @param provider 提供商名称
   * @param symbol 符号字符串
   * @param direction 转换方向
   * @returns 转换后的符号
   */
  transformSingleSymbol(
    provider: string,
    symbol: string,
    direction: "to_standard" | "from_standard",
  ): Promise<string>;

}

/**
 * 符号格式验证器接口
 */
export interface ISymbolFormatValidator {
  /**
   * 验证符号格式
   * @param symbol 符号字符串
   * @returns 是否为有效格式
   */
  isValidFormat(symbol: string): boolean;

  /**
   * 批量验证符号格式
   * @param symbols 符号数组
   * @returns 验证结果
   */
  validateBatch(symbols: string[]): {
    validSymbols: string[];
    invalidSymbols: string[];
  };

  /**
   * 推断市场类型
   * @param symbols 符号数组
   * @returns 市场类型
   */
  inferMarket(symbols: string[]): string;
}

/**
 * 符号转换缓存接口
 */
export interface ISymbolTransformCache {
  /**
   * 获取缓存的转换结果
   * @param key 缓存键
   * @returns 缓存结果或null
   */
  get(key: string): Promise<SymbolTransformResult | null>;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  set(key: string, value: SymbolTransformResult, ttl?: number): Promise<void>;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;
}


/**
 * 符号转换配置接口
 */
export interface ISymbolTransformConfig {
  /**
   * 获取批处理阈值
   */
  getBatchThreshold(): number;

  /**
   * 获取最大符号长度
   */
  getMaxSymbolLength(): number;

  /**
   * 获取缓存TTL
   */
  getCacheTtl(): number;

  /**
   * 是否启用重试
   */
  isRetryEnabled(): boolean;

  /**
   * 获取重试配置
   */
  getRetryConfig(): {
    maxAttempts: number;
    baseDelay: number;
    backoffFactor: number;
  };
}

/**
 * 符号转换工厂接口
 */
export interface ISymbolTransformerFactory {
  /**
   * 创建符号转换器实例
   * @param provider 提供商名称
   * @returns 符号转换器实例
   */
  createTransformer(provider: string): ISymbolTransformer;

  /**
   * 获取支持的提供商列表
   */
  getSupportedProviders(): string[];

  /**
   * 注册新的提供商转换器
   * @param provider 提供商名称
   * @param transformer 转换器实例
   */
  registerProvider(provider: string, transformer: ISymbolTransformer): void;
}

