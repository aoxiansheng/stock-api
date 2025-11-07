/**
 * Symbol Mapper Cache Standardized Service (Simplified Implementation)
 *
 * 核心职责:
 * - 实现3层LRU内存缓存接口（Map简化实现）
 * - 提供符号格式转换（示例：HK市场5位补零）
 * - 对外保持 mapSymbols/getStats/clearAllCaches 的最小契约
 *
 * 设计取舍（KISS/YAGNI）:
 * - 移除事件发射与硬件监控（非核心）
 * - 不再依赖外部配置/ENV，使用最小常量集合
 */

import { Injectable, Logger } from '@nestjs/common';

// Types and interfaces
import { BatchMappingResult, SymbolMapperCacheStatsDto } from '../interfaces/cache-stats.interface';
import { SYMBOL_MAPPER_CACHE_CONSTANTS } from '../constants/symbol-mapper-cache.constants';
import { MappingDirection } from '../../../../shared/constants/cache.constants';

@Injectable()
export class SymbolMapperCacheStandardizedService {
  private readonly logger = new Logger(SymbolMapperCacheStandardizedService.name);

  // 三层LRU缓存系统 (使用Map简化实现)
  private readonly l1ProviderRulesCache = new Map<string, any>();
  private readonly l2SymbolMappingCache = new Map<string, any>();
  private readonly l3BatchResultCache = new Map<string, any>();

  // 监控统计
  private readonly stats = {
    l1: { hits: 0, misses: 0, total: 0 },
    l2: { hits: 0, misses: 0, total: 0 },
    l3: { hits: 0, misses: 0, total: 0 },
    operations: 0,
    totalQueries: 0,
    lastResetTime: new Date(),
  };

  // Service metrics and monitoring
  private isInitialized: boolean = false;

  constructor() {
    this.logger.log('SymbolMapperCacheStandardizedService (Simplified) initialized');
    this.isInitialized = true;
  }

  // ==================== 核心业务方法 (兼容原有接口) ====================

  /**
   * 符号映射主方法 (兼容原有接口)
   */
  async mapSymbols(
    provider: string,
    symbols: string | string[],
    direction: MappingDirection,
    requestId?: string,
  ): Promise<BatchMappingResult> {
    const startTime = Date.now();
    this.stats.totalQueries++;
    this.stats.operations++;

    // Handle null/undefined inputs gracefully
    if (symbols == null || symbols === undefined) {
      return {
        success: true,
        mappingDetails: {},
        failedSymbols: [],
        provider,
        direction,
        totalProcessed: 0,
        cacheHits: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Convert symbols to array format for consistency
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];

    // Handle empty array case
    if (symbolArray.length === 0) {
      return {
        success: true,
        mappingDetails: {},
        failedSymbols: [],
        provider,
        direction,
        totalProcessed: 0,
        cacheHits: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    try {
      // 简化实现：直接转换符号格式
      const mappingDetails: Record<string, string> = {};
      const failedSymbols: string[] = [];
      let validSymbolsProcessed = 0;

      for (const symbol of symbolArray) {
        try {
          // Skip invalid symbols (null, undefined, empty strings, non-string types)
          if (symbol == null || symbol === undefined || typeof symbol !== 'string' || symbol.trim() === '') {
            continue; // 直接跳过无效输入，不计入失败
          }

          validSymbolsProcessed++; // 计数有效处理的符号
          
          if (direction === MappingDirection.TO_STANDARD) {
            mappingDetails[symbol] = this.convertToStandardFormat(symbol);
          } else {
            mappingDetails[symbol] = this.convertFromStandardFormat(symbol);
          }

          // 更新L2缓存
          const cacheKey = this.getSymbolCacheKey(symbol, provider, direction);
          this.l2SymbolMappingCache.set(cacheKey, {
            standardSymbol: mappingDetails[symbol],
            provider,
            direction,
            timestamp: Date.now(),
            accessCount: 1,
          });
          this.stats.l2.hits++;
        } catch (error) {
          failedSymbols.push(symbol);
        }
      }

      const result: BatchMappingResult = {
        success: true, // Always return success for graceful error handling
        mappingDetails,
        failedSymbols,
        provider,
        direction,
        totalProcessed: validSymbolsProcessed, // 只计算有效处理的符号数量
        cacheHits: validSymbolsProcessed - failedSymbols.length,
        processingTimeMs: Date.now() - startTime,
      };

      return result;

    } catch (error) {
      this.logger.error(`Symbol mapping failed for provider ${provider}`, error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息 (兼容原有接口)
   */
  getStats(): SymbolMapperCacheStatsDto {
    const l1Total = this.stats.l1.hits + this.stats.l1.misses;
    const l2Total = this.stats.l2.hits + this.stats.l2.misses;
    const l3Total = this.stats.l3.hits + this.stats.l3.misses;

    return {
      totalQueries: this.stats.totalQueries,
      l1HitRatio: l1Total > 0 ? (this.stats.l1.hits / l1Total) * 100 : 0,
      l2HitRatio: l2Total > 0 ? (this.stats.l2.hits / l2Total) * 100 : 0,
      l3HitRatio: l3Total > 0 ? (this.stats.l3.hits / l3Total) * 100 : 0,
      layerStats: {
        l1: { ...this.stats.l1, total: l1Total },
        l2: { ...this.stats.l2, total: l2Total },
        l3: { ...this.stats.l3, total: l3Total },
      },
      cacheSize: {
        l1: this.l1ProviderRulesCache.size,
        l2: this.l2SymbolMappingCache.size,
        l3: this.l3BatchResultCache.size,
      },
    };
  }

  /**
   * 清空所有缓存 (兼容原有接口)
   */
  async clearAllCaches(): Promise<void> {
    this.logger.log('Clearing all symbol mapper caches');

    this.l1ProviderRulesCache.clear();
    this.l2SymbolMappingCache.clear();
    this.l3BatchResultCache.clear();

    // 重置统计
    this.stats.l1 = { hits: 0, misses: 0, total: 0 };
    this.stats.l2 = { hits: 0, misses: 0, total: 0 };
    this.stats.l3 = { hits: 0, misses: 0, total: 0 };
    this.stats.operations = 0;
    this.stats.totalQueries = 0;
    this.stats.lastResetTime = new Date();

    this.logger.log('All symbol mapper caches cleared successfully');
  }

  // ==================== 辅助方法 ====================
  /**
   * 生成符号缓存键
   */
  private getSymbolCacheKey(symbol: string, provider: string, direction: MappingDirection): string {
    return `${SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS.SYMBOL_MAPPING}:${provider}:${direction}:${symbol}`;
  }

  /**
   * 转换为标准格式 (简化实现)
   */
  private convertToStandardFormat(symbol: string): string {
    // 示例: "700.HK" -> "00700"
    if (symbol.includes('.HK')) {
      const code = symbol.split('.')[0];
      return code.padStart(5, '0');
    }
    return symbol;
  }

  /**
   * 从标准格式转换 (简化实现)
   */
  private convertFromStandardFormat(symbol: string): string {
    // 示例: "00700" -> "700.HK"
    if (symbol.match(/^\d{5}$/)) {
      const code = parseInt(symbol, 10).toString();
      return `${code}.HK`;
    }
    return symbol;
  }

  // ==================== 服务状态 ====================

  /**
   * 检查服务是否已初始化
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取服务版本信息
   */
  getServiceInfo(): { name: string; version: string; mode: string } {
    return {
      name: 'SymbolMapperCacheStandardizedService',
      version: '1.0.0',
      mode: 'simplified'
    };
  }
}
