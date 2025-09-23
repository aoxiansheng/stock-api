/**
 * 缓存相关接口定义
 * 从 symbol-mapping.interface.ts 中提取的缓存专用接口
 * 更新使用新的枚举和类型定义
 */

import { MappingDirection } from "../../../../shared/constants/cache.constants";


/**
 * 批量符号映射结果
 */
export interface BatchMappingResult {
  success: boolean;
  mappingDetails: Record<string, string>; // 原始符号 -> 映射结果
  failedSymbols: string[];
  provider: string;
  direction: MappingDirection;
  totalProcessed: number;
  cacheHits: number;
  processingTimeMs: number;
}

/**
 * Symbol Mapper Cache 三层缓存统计信息
 * 重命名以避免与其他模块的 RedisCacheRuntimeStatsDto 冲突
 */
export interface SymbolMapperCacheStatsDto {
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
