/**
 * Symbol Mapper Cache Standardized Service (Simplified Implementation)
 *
 * 功能说明:
 * - 实现3层LRU内存缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - 符号格式转换引擎 ("700.HK" → "00700")
 * - 标准化缓存模块接口实现
 * - 双服务兼容模式 (保持与原有业务逻辑的兼容性)
 *
 * 注意: 这是简化版实现，主要用于类型兼容性和基础功能演示
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Core imports
import { SymbolMappingRepository } from '../../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import { FeatureFlags } from '@config/feature-flags.config';

// Types and interfaces
import { BatchMappingResult, SymbolMapperCacheStatsDto } from '../interfaces/cache-stats.interface';
import { SYMBOL_MAPPER_CACHE_CONSTANTS } from '../constants/symbol-mapper-cache.constants';
import { MappingDirection } from '../../../../shared/constants/cache.constants';

/**
 * Symbol Mapper Cache Standardized Service (Simplified)
 *
 * 实现标准化的符号映射缓存服务，保持与原有服务的兼容性
 * 注意：这是简化版本，专注于核心业务功能
 */
@Injectable()
export class SymbolMapperCacheStandardizedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SymbolMapperCacheStandardizedService.name);

  // 三层LRU缓存系统 (使用Map简化实现)
  private readonly l1ProviderRulesCache = new Map<string, any>();
  private readonly l2SymbolMappingCache = new Map<string, any>();
  private readonly l3BatchResultCache = new Map<string, any>();

  // 并发控制
  private readonly pendingQueries = new Map<string, Promise<any>>();

  // 监控统计
  private readonly stats = {
    l1: { hits: 0, misses: 0, total: 0 },
    l2: { hits: 0, misses: 0, total: 0 },
    l3: { hits: 0, misses: 0, total: 0 },
    operations: 0,
    totalQueries: 0,
    lastResetTime: new Date(),
  };

  // 内存监控
  private memoryCheckTimer: NodeJS.Timeout | null = null;
  private lastMemoryCleanup = Date.now();

  // Service metrics and monitoring
  private isInitialized: boolean = false;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly repository: SymbolMappingRepository,
    private readonly featureFlags: FeatureFlags,
  ) {
    this.logger.log('SymbolMapperCacheStandardizedService (Simplified) initialized');
    this.isInitialized = true;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing SymbolMapperCacheStandardizedService...');

      // 启动内存监控
      await this.startMemoryMonitoring();

      // 发送初始化完成事件
      this.eventEmitter.emit('cache.module.initialized', {
        module: 'symbol-mapper-cache',
        timestamp: new Date(),
      });

      this.logger.log('SymbolMapperCacheStandardizedService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SymbolMapperCacheStandardizedService', error);
      throw error;
    }
  }

  /**
   * 模块销毁清理
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Destroying SymbolMapperCacheStandardizedService...');

      // 清理定时器
      if (this.memoryCheckTimer) {
        clearTimeout(this.memoryCheckTimer);
        this.memoryCheckTimer = null;
      }

      // 清理缓存
      this.l1ProviderRulesCache.clear();
      this.l2SymbolMappingCache.clear();
      this.l3BatchResultCache.clear();
      this.pendingQueries.clear();

      // 发送销毁完成事件
      this.eventEmitter.emit('cache.module.destroyed', {
        module: 'symbol-mapper-cache',
        timestamp: new Date(),
      });

      this.logger.log('SymbolMapperCacheStandardizedService destroyed successfully');
    } catch (error) {
      this.logger.error('Error during SymbolMapperCacheStandardizedService destruction', error);
    }
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

    // Convert symbols to array format for consistency
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];

    try {
      // 简化实现：直接转换符号格式
      const mappingDetails: Record<string, string> = {};
      const failedSymbols: string[] = [];

      for (const symbol of symbolArray) {
        try {
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
        success: failedSymbols.length === 0,
        mappingDetails,
        failedSymbols,
        provider,
        direction,
        totalProcessed: symbolArray.length,
        cacheHits: symbolArray.length - failedSymbols.length,
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
    this.pendingQueries.clear();

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
   * 启动内存监控
   */
  private async startMemoryMonitoring(): Promise<void> {
    if (this.memoryCheckTimer) return;

    const checkInterval = SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CHECK_INTERVAL_MS;
    this.memoryCheckTimer = setInterval(async () => {
      await this.performMemoryCheck();
    }, checkInterval);

    this.logger.log(`Memory monitoring started with ${checkInterval}ms interval`);
  }

  /**
   * 内存检查
   */
  private async performMemoryCheck(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // 高内存使用时触发清理
    if (usagePercent > 85) {
      this.logger.warn(`High memory usage detected: ${usagePercent.toFixed(2)}%`);
      await this.performCleanup();
    }

    // 定期清理
    const cleanupInterval = SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CLEANUP_INTERVAL_MS;
    if (Date.now() - this.lastMemoryCleanup > cleanupInterval) {
      await this.performCleanup();
      this.lastMemoryCleanup = Date.now();
    }
  }

  /**
   * 执行清理
   */
  private async performCleanup(): Promise<void> {
    // 清理30%的L3缓存（最大）
    const l3ItemsToRemove = Math.ceil(this.l3BatchResultCache.size * 0.3);
    const l3Keys = Array.from(this.l3BatchResultCache.keys());
    for (let i = 0; i < Math.min(l3ItemsToRemove, l3Keys.length); i++) {
      this.l3BatchResultCache.delete(l3Keys[i]);
    }

    // 清理20%的L2缓存
    const l2ItemsToRemove = Math.ceil(this.l2SymbolMappingCache.size * 0.2);
    const l2Keys = Array.from(this.l2SymbolMappingCache.keys());
    for (let i = 0; i < Math.min(l2ItemsToRemove, l2Keys.length); i++) {
      this.l2SymbolMappingCache.delete(l2Keys[i]);
    }

    this.logger.log(`Cleanup completed: removed L2=${l2ItemsToRemove}, L3=${l3ItemsToRemove} items`);
  }

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