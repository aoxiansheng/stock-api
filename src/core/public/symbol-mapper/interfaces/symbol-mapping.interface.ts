/**
 * 股票代码映射器接口
 */
export interface ISymbolMapper {
  mapSymbol(
    originalSymbol: string,
    fromProvider: string,
    toProvider: string,
  ): Promise<string>;
  saveMapping(rule: ISymbolMappingRuleList): Promise<void>;
  getSymbolMappingRule(provider: string): Promise<ISymbolMappingRule[]>;
}

/**
 * 单个映射规则
 */
export interface ISymbolMappingRule {
  standardSymbol: string;
  sdkSymbol: string;
  market?: string;
  symbolType?: string;
  isActive?: boolean;
  description?: string;
}

/**
 * 股票代码映射规则集合 - 与API响应格式一致
 */
export interface ISymbolMappingRuleList {
  id?: string; // 统一使用id字段，与API响应格式一致
  dataSourceName: string;
  SymbolMappingRule: ISymbolMappingRule[];
  description?: string;
  version?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 单符号映射结果 (Symbol Mapper 缓存重构新增)
 */
export interface SymbolMappingResult {
  success: boolean;
  mappedSymbol?: string;
  originalSymbol: string;
  provider: string;
  direction: 'to_standard' | 'from_standard';
  cacheHit?: boolean;
  processingTime?: number;
}

/**
 * 批量符号映射结果 (Symbol Mapper 缓存重构新增)
 */
export interface BatchMappingResult {
  success: boolean;
  mappingDetails: Record<string, string>; // 原始符号 -> 映射结果
  failedSymbols: string[];
  provider: string;
  direction: 'to_standard' | 'from_standard';
  totalProcessed: number;
  cacheHits: number;
  processingTime: number;
}

/**
 * 缓存统计信息
 */
export interface CacheStatsDto {
  totalQueries: number;
  l1HitRatio: number; // L1规则缓存命中率
  l2HitRatio: number; // L2符号缓存命中率
  l3HitRatio: number; // L3批量缓存命中率
  layerStats: {
    l1: { hits: number; misses: number; total: number };
    l2: { hits: number; misses: number; total: number };
    l3: { hits: number; misses: number; total: number };
  };
  cacheSize: {
    l1: number; // 规则缓存当前大小
    l2: number; // 符号缓存当前大小
    l3: number; // 批量缓存当前大小
  };
}
