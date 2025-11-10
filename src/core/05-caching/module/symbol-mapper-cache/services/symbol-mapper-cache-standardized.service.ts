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
import { MappingDirection } from '@core/shared/constants';
import { SymbolMapperService } from '@core/00-prepare/symbol-mapper/services/symbol-mapper.service';
import { SymbolMappingResponseDto } from '@core/00-prepare/symbol-mapper/dto/symbol-mapping-response.dto';

@Injectable()
export class SymbolMapperCacheStandardizedService {
  private readonly logger = new Logger(SymbolMapperCacheStandardizedService.name);

  // 三层LRU缓存系统 (使用Map简化实现)
  private readonly l1ProviderRulesCache = new Map<string, any>();
  private readonly l2SymbolMappingCache = new Map<string, any>();
  private readonly l3BatchResultCache = new Map<string, any>();

  // 简易TTL/LRU配置（可由环境变量覆盖）
  private readonly L1_MAX = parseInt(process.env.SYM_MAP_L1_MAX || '200');
  private readonly L2_MAX = parseInt(process.env.SYM_MAP_L2_MAX || '2000');
  private readonly L3_MAX = parseInt(process.env.SYM_MAP_L3_MAX || '500');
  private readonly L1_TTL_SEC = parseInt(process.env.SYM_MAP_L1_TTL || '300');
  private readonly L2_TTL_SEC = parseInt(process.env.SYM_MAP_L2_TTL || '600');
  private readonly L3_TTL_SEC = parseInt(process.env.SYM_MAP_L3_TTL || '300');

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

  constructor(
    private readonly symbolMapperService: SymbolMapperService,
  ) {
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

    if (symbols == null) {
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

    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
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
      const rules = await this.loadProviderRules(provider);
      const mappingDetails: Record<string, string> = {};
      const failedSymbols: string[] = [];
      let validSymbolsProcessed = 0;

      for (const originalSymbol of symbolArray) {
        const normalized = this.normalizeSymbol(originalSymbol);
        if (!normalized) {
          continue;
        }

        validSymbolsProcessed++;

        const cacheKey = this.getL2Key(provider, normalized, direction);
        const cacheHit = this.getCache(this.l2SymbolMappingCache, cacheKey);
        if (cacheHit.hit) {
          mappingDetails[originalSymbol] = cacheHit.value;
          continue;
        }

        let mapped: string | null = null;
        if (direction === MappingDirection.TO_STANDARD) {
          mapped =
            rules.reverseMap[normalized] ??
            (rules.forwardMap[normalized] ? normalized : normalized);
        } else {
          mapped =
            rules.forwardMap[normalized] ??
            (rules.reverseMap[normalized] ? normalized : normalized);
        }

        if (mapped) {
          mappingDetails[originalSymbol] = mapped;
          this.setCache(
            this.l2SymbolMappingCache,
            cacheKey,
            mapped,
            this.L2_TTL_SEC,
            this.L2_MAX,
          );
        } else {
          failedSymbols.push(originalSymbol);
        }
      }

      return {
        success: true,
        mappingDetails,
        failedSymbols,
        provider,
        direction,
        totalProcessed: validSymbolsProcessed,
        cacheHits: validSymbolsProcessed - failedSymbols.length,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Symbol mapping failed for provider ${provider}`, error);
      throw error;
    }
  }

  // ==================== 新增：规则驱动映射API ====================

  /**
   * 按 provider 返回标准→SDK 映射（forward）与 SDK→标准（reverse），并给出映射后的数组
   * 未命中规则时回退为原值
   */
  async mapToProvider(provider: string, symbols: string[]): Promise<{
    mappedArray: string[];
    forwardMap: Record<string, string>;
    reverseMap: Record<string, string>;
  }> {
    // L3 批量缓存
    const batchKey = this.getL3Key(provider, symbols, 'to_provider');
    const l3Hit = this.getCache(this.l3BatchResultCache, batchKey);
    if (l3Hit.hit) return l3Hit.value;

    const rules = await this.loadProviderRules(provider);
    const forwardMap: Record<string, string> = rules.forwardMap || {};
    const reverseMap: Record<string, string> = rules.reverseMap || {};

    const mappedArray: string[] = [];
    for (const s of symbols) {
      const normalized = this.normalizeSymbol(s);
      if (!normalized) {
        continue;
      }

      if (normalized in forwardMap) {
        const mappedValue = forwardMap[normalized];
        mappedArray.push(mappedValue);
        // L2写入
        this.setCache(
          this.l2SymbolMappingCache,
          this.getL2Key(provider, normalized, MappingDirection.FROM_STANDARD),
          mappedValue,
          this.L2_TTL_SEC,
          this.L2_MAX,
        );
      } else {
        // 尝试L2
        const l2Key = this.getL2Key(
          provider,
          normalized,
          MappingDirection.FROM_STANDARD,
        );
        const l2Hit = this.getCache(this.l2SymbolMappingCache, l2Key);
        if (l2Hit.hit) {
          mappedArray.push(l2Hit.value);
        } else {
          mappedArray.push(normalized); // 回退原值
          this.setCache(
            this.l2SymbolMappingCache,
            l2Key,
            normalized,
            this.L2_TTL_SEC,
            this.L2_MAX,
          );
        }
      }
    }

    const batchVal = { mappedArray, forwardMap, reverseMap };
    this.setCache(this.l3BatchResultCache, batchKey, batchVal, this.L3_TTL_SEC, this.L3_MAX);
    return batchVal;
  }

  /**
   * 按 provider 返回 SDK→标准（reverse）与标准→SDK（forward），并给出映射后的数组
   */
  async mapToStandard(provider: string, symbols: string[]): Promise<{
    mappedArray: string[];
    forwardMap: Record<string, string>;
    reverseMap: Record<string, string>;
  }> {
    const batchKey = this.getL3Key(provider, symbols, 'to_standard');
    const l3Hit = this.getCache(this.l3BatchResultCache, batchKey);
    if (l3Hit.hit) return l3Hit.value;

    const rules = await this.loadProviderRules(provider);
    const forwardMap: Record<string, string> = rules.forwardMap || {};
    const reverseMap: Record<string, string> = rules.reverseMap || {};

    const mappedArray: string[] = [];
    for (const s of symbols) {
      const normalized = this.normalizeSymbol(s);
      if (!normalized) {
        continue;
      }

      if (normalized in reverseMap) {
        const mappedValue = reverseMap[normalized];
        mappedArray.push(mappedValue);
        this.setCache(
          this.l2SymbolMappingCache,
          this.getL2Key(provider, normalized, MappingDirection.TO_STANDARD),
          mappedValue,
          this.L2_TTL_SEC,
          this.L2_MAX,
        );
      } else {
        const l2Key = this.getL2Key(
          provider,
          normalized,
          MappingDirection.TO_STANDARD,
        );
        const l2Hit = this.getCache(this.l2SymbolMappingCache, l2Key);
        if (l2Hit.hit) {
          mappedArray.push(l2Hit.value);
        } else {
          mappedArray.push(normalized);
          this.setCache(
            this.l2SymbolMappingCache,
            l2Key,
            normalized,
            this.L2_TTL_SEC,
            this.L2_MAX,
          );
        }
      }
    }

    const batchVal = { mappedArray, forwardMap, reverseMap };
    this.setCache(this.l3BatchResultCache, batchKey, batchVal, this.L3_TTL_SEC, this.L3_MAX);
    return batchVal;
  }

  /**
   * 加载并缓存 provider 规则（forward: 标准→SDK，reverse: SDK→标准）
   */
  private async loadProviderRules(provider: string): Promise<{ forwardMap: Record<string,string>; reverseMap: Record<string,string> }> {
    const cacheKey = `rules:provider:${provider}`;
    const cached = this.getCache(this.l1ProviderRulesCache, cacheKey);
    if (cached.hit) return cached.value;

    try {
      const dto: SymbolMappingResponseDto = await this.symbolMapperService.getSymbolMappingByDataSource(provider);
      const forwardMap: Record<string, string> = {};
      const reverseMap: Record<string, string> = {};
      const rules = dto?.SymbolMappingRule || [];
      for (const r of rules) {
        if (!r?.standardSymbol || !r?.sdkSymbol) continue;
        forwardMap[r.standardSymbol] = r.sdkSymbol;
        reverseMap[r.sdkSymbol] = r.standardSymbol;
      }
      const result = { forwardMap, reverseMap };
      this.setCache(this.l1ProviderRulesCache, cacheKey, result, this.L1_TTL_SEC, this.L1_MAX);
      return result;
    } catch (error) {
      // 数据源不存在或查询失败：返回空规则，避免阻塞
      const result = { forwardMap: {}, reverseMap: {} };
      this.setCache(this.l1ProviderRulesCache, cacheKey, result, this.L1_TTL_SEC, this.L1_MAX);
      return result;
    }
  }

  // ==================== 辅助：TTL/LRU 封装 ====================
  private getCache(map: Map<string, any>, key: string): { hit: boolean; value?: any } {
    const entry = map.get(key);
    if (!entry) return { hit: false };
    const now = Date.now();
    if (entry.expireAt && entry.expireAt < now) {
      map.delete(key);
      return { hit: false };
    }
    entry.usage = (entry.usage || 0) + 1;
    return { hit: true, value: entry.value };
  }

  private setCache(map: Map<string, any>, key: string, value: any, ttlSec: number, maxSize: number): void {
    const expireAt = Date.now() + (ttlSec * 1000);
    map.set(key, { value, expireAt, usage: 1 });
    if (map.size > maxSize) {
      // 简单LRU：按 usage 升序淘汰一个
      let minUsage = Infinity;
      let victim: string | null = null;
      for (const [k, v] of map.entries()) {
        const u = v?.usage || 0;
        if (u < minUsage && k !== key) {
          minUsage = u; victim = k;
        }
      }
      if (victim) map.delete(victim);
    }
  }

  private getL2Key(provider: string, symbol: string, direction: MappingDirection): string {
    return `${SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS.SYMBOL_MAPPING}:${provider}:${direction}:${symbol}`;
  }

  private getL3Key(provider: string, symbols: string[], mode: 'to_provider' | 'to_standard'): string {
    const sorted = [...symbols].filter(Boolean).sort().join(',');
    return `${SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS.BATCH_RESULT}:${provider}:${mode}:${sorted}`;
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

  private normalizeSymbol(symbol: unknown): string | null {
    if (typeof symbol !== 'string') {
      return null;
    }
    const trimmed = symbol.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.toUpperCase();
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
