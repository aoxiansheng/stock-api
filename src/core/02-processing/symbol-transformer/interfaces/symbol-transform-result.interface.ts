/**
 * Symbol Transform Result Interface
 * 严格对齐 SymbolMapperService.mapSymbols() 返回格式
 */
export interface SymbolTransformResult {
  /** 转换后的符号数组，从 mappingDetails 的值派生 */
  mappedSymbols: string[];

  /** 映射详情，键为原符号，值为转换后符号 */
  mappingDetails: Record<string, string>;

  /** 转换失败的符号列表 */
  failedSymbols: string[];

  /** 转换元数据 */
  metadata: {
    /** 提供商名称 */
    provider: string;

    /** 总符号数 */
    totalSymbols: number;

    /** 成功转换数 */
    successCount: number;

    /** 失败转换数 */
    failedCount: number;

 
    processingTimeMs: number;
  };
}

/**
 * transformSymbolsForProvider 方法返回结构
 * 保持与现有实现完全一致
 */
export interface SymbolTransformForProviderResult {
  /** 转换后的符号数组 */
  transformedSymbols: string[];

  /** 映射结果详情 */
  mappingResults: {
    /** 转换映射详情（Record格式） */
    transformedSymbols: Record<string, string>;

    /** 失败的符号列表 */
    failedSymbols: string[];

    /** 元数据 */
    metadata: {
      provider: string;
      totalSymbols: number;
      successfulTransformations: number;
      failedTransformations: number;
      /** 处理时间（毫秒） */
      processingTimeMs: number;
    };
  };
}
