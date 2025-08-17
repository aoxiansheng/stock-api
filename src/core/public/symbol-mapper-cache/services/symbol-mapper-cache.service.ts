import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { MetricsRegistryService } from '../../../../monitoring/metrics/services/metrics-registry.service';
import { SymbolMappingRepository } from '../../symbol-mapper/repositories/symbol-mapping.repository';
import { SymbolMappingRule } from '../../symbol-mapper/schemas/symbol-mapping-rule.schema';
import { createLogger } from '@common/config/logger.config';
import { Metrics } from '../../../../monitoring/metrics/metrics-helper';
import { 
  BatchMappingResult,
  CacheStatsDto 
} from '../interfaces/cache-stats.interface';

/**
 * Symbol Mapper 统一缓存服务
 * 优化批量查询缓存和实现双向映射的核心组件
 * 
 * 🎯 三层缓存架构:
 * - L1: 规则缓存 (Provider Rules Cache) - 提供商映射规则
 * - L2: 符号映射缓存 (Symbol Mapping Cache) - 单符号双向映射
 * - L3: 批量结果缓存 (Batch Result Cache) - 批量查询结果
 */
@Injectable()
export class SymbolMapperCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(SymbolMapperCacheService.name);
  
  // 🎯 三层缓存架构
  private providerRulesCache: LRUCache<string, SymbolMappingRule[]>;  // L1: 规则缓存
  private symbolMappingCache: LRUCache<string, string>;               // L2: 符号映射缓存  
  private batchResultCache: LRUCache<string, BatchMappingResult>;     // L3: 批量结果缓存
  
  // 🔒 并发控制
  private readonly pendingQueries: Map<string, Promise<any>>;
  
  // 📡 变更监听
  private changeStream: any; // Change Stream 实例
  private reconnectAttempts: number = 0; // 重连尝试次数
  private readonly maxReconnectDelay: number = 30000; // 最大重连延迟 30秒
  private isMonitoringActive: boolean = false; // 监听器激活状态
  
  // 💾 内存监控
  private memoryCheckTimer: NodeJS.Timeout | null = null; // 内存检查定时器
  private lastMemoryCleanup: Date = new Date(); // 上次清理时间
  
  // 📊 缓存统计 - 按层级分别统计
  private cacheStats: {
    l1: { hits: number; misses: number };
    l2: { hits: number; misses: number };
    l3: { hits: number; misses: number };
    totalQueries: number;
  };

  constructor(
    private readonly repository: SymbolMappingRepository,
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService
  ) {
    this.initializeCaches();
    this.initializeStats();
    this.pendingQueries = new Map();
  }

  /**
   * 🚀 模块初始化 - 启动变更监听和内存监控
   */
  async onModuleInit(): Promise<void> {
    // 仅在模块初始化时注册一次，避免重复监听
    this.setupChangeStreamMonitoring();
    
    // 启动内存水位监控
    this.startMemoryMonitoring();
    
    this.logger.log('SymbolMapperCacheService initialized with change stream and memory monitoring');
  }

  /**
   * 📊 模块销毁 - 清理资源
   */
  async onModuleDestroy(): Promise<void> {
    // 关闭 Change Stream
    if (this.changeStream) {
      try {
        await this.changeStream.close();
        this.logger.log('Change Stream 已关闭');
      } catch (error) {
        this.logger.error('关闭 Change Stream 失败', { error: error.message });
      }
    }
    
    // 停止内存监控
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
      this.logger.log('Memory monitoring stopped');
    }
    
    // 重置监听状态
    this.isMonitoringActive = false;
    this.reconnectAttempts = 0;
    
    // 清理缓存
    this.providerRulesCache.clear();
    this.symbolMappingCache.clear();
    this.batchResultCache.clear();
    
    // 清理待处理查询
    this.pendingQueries.clear();
    
    this.logger.log('SymbolMapperCacheService destroyed and resources cleaned up');
  }

  /**
   * 📊 初始化统计计数器
   */
  private initializeStats(): void {
    this.cacheStats = {
      l1: { hits: 0, misses: 0 },
      l2: { hits: 0, misses: 0 },
      l3: { hits: 0, misses: 0 },
      totalQueries: 0
    };
  }

  /**
   * 🎯 缓存初始化：从FeatureFlags读取现有字段，L3使用新增字段
   */
  private initializeCaches(): void {
    // 从 FeatureFlags 读取缓存配置
    const l1Config = {
      max: this.featureFlags.ruleCacheMaxSize,
      ttl: this.featureFlags.ruleCacheTtl
    };
    
    const l2Config = {
      max: this.featureFlags.symbolCacheMaxSize,
      ttl: this.featureFlags.symbolCacheTtl
    };
    
    // L3配置：使用新增的 FeatureFlags 字段
    const l3Config = {
      max: this.featureFlags.batchResultCacheMaxSize,
      ttl: this.featureFlags.batchResultCacheTtl
    };
    
    // L1: 规则缓存 - 规则很少变动，长期缓存
    this.providerRulesCache = new LRUCache({
      max: l1Config.max,
      ttl: l1Config.ttl,
      updateAgeOnGet: false        // 不更新访问时间，保持TTL
    });
    
    // L2: 符号映射缓存 - 符号映射相对稳定
    this.symbolMappingCache = new LRUCache({
      max: l2Config.max,
      ttl: l2Config.ttl,
      updateAgeOnGet: true         // 热门符号延长生命周期
    });
    
    // L3: 批量结果缓存 - 批量查询结果
    this.batchResultCache = new LRUCache({
      max: l3Config.max,
      ttl: l3Config.ttl,
      updateAgeOnGet: true
    });
    
    this.logger.log('Caches initialized with FeatureFlags config', {
      l1Rules: l1Config,
      l2Symbols: l2Config,
      l3Batches: l3Config
    });
  }

  /**
   * 🎯 统一入口：支持单个和批量查询
   * 替换现有的 mapSymbol 和 mapSymbols 方法
   */
  async mapSymbols(
    provider: string, 
    symbols: string | string[], 
    direction: 'to_standard' | 'from_standard',
    requestId?: string
  ): Promise<BatchMappingResult> {
    
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const isBatch = symbolArray.length > 1;
    const startTime = Date.now();
    
    // 🛡️ 服务内开关兜底：即使外层已检查，这里再次确认缓存是否启用
    if (!this.featureFlags.symbolMappingCacheEnabled) {
      this.logger.warn('Symbol mapping cache is disabled, bypassing cache logic', {
        provider,
        symbolsCount: symbolArray.length,
        direction
      });
      
      // 记录缓存禁用指标
      this.recordCacheMetrics('disabled', false);
      
      // 直接执行数据库查询，不使用任何缓存
      const results = await this.executeUncachedQuery(provider, symbolArray, direction);
      
      // 构建符合接口的返回结构
      return this.buildDirectQueryResult(symbolArray, results, provider, direction, startTime);
    }
    
    this.cacheStats.totalQueries++;
    
    try {
      // 🎯 Level 3: 批量结果缓存检查
      if (isBatch) {
        const batchKey = this.getBatchCacheKey(provider, symbolArray, direction);
        const batchCached = this.batchResultCache.get(batchKey);
        if (batchCached) {
          this.cacheStats.l3.hits++;
          this.recordCacheMetrics('l3', true);
          return this.cloneResult(batchCached);
        }
        // L3 未命中计数
        this.cacheStats.l3.misses++;
        this.recordCacheMetrics('l3', false);
      }
      
      // 🎯 Level 2: 单符号缓存检查
      const cacheHits = new Map<string, string>();
      const uncachedSymbols = [];
      
      for (const symbol of symbolArray) {
        const symbolKey = this.getSymbolCacheKey(provider, symbol, direction);
        const cached = this.symbolMappingCache.get(symbolKey);
        if (cached) {
          cacheHits.set(symbol, cached);
          this.cacheStats.l2.hits++;
          this.recordCacheMetrics('l2', true);
        } else {
          uncachedSymbols.push(symbol);
          this.cacheStats.l2.misses++;  // L2 未命中计数
          this.recordCacheMetrics('l2', false);
        }
      }
      
      // 🎯 Level 1: 规则缓存 + 数据库查询
      let uncachedResults = {};
      if (uncachedSymbols.length > 0) {
        // 并发控制：使用与批量缓存完全相同的键规范（包括MD5）
        const queryKey = this.getPendingQueryKey(provider, uncachedSymbols, direction);
        
        if (this.pendingQueries.has(queryKey)) {
          uncachedResults = await this.pendingQueries.get(queryKey);
        } else {
          // 创建带超时保护的查询Promise
          const queryPromise = this.createTimeoutProtectedQuery(
            provider, 
            uncachedSymbols, 
            direction,
            queryKey
          );
          this.pendingQueries.set(queryKey, queryPromise);
          
          try {
            uncachedResults = await queryPromise;
            // 🔄 批量结果回填单符号缓存（双向写入）
            this.backfillSingleSymbolCache(provider, uncachedResults, direction);
          } catch (error) {
            this.logger.error('Uncached query failed', { queryKey, error: error.message });
            throw error;
          } finally {
            this.pendingQueries.delete(queryKey);
          }
        }
      }
      
      // 🎯 合并所有结果
      const finalResult = this.mergeResults(cacheHits, uncachedResults, symbolArray, provider, direction, startTime);
      
      // 🎯 存储批量结果缓存 - 结构校验后存储
      if (isBatch && uncachedSymbols.length > 0) {
        const batchKey = this.getBatchCacheKey(provider, symbolArray, direction);
        
        // 重要：结构校验并补齐L3精准失效所需字段
        const validatedResult = this.validateAndFixBatchResult(finalResult);
        
        this.batchResultCache.set(batchKey, validatedResult);
        
        this.logger.debug('Batch result cached with validated structure', {
          batchKey,
          mappingDetailsCount: Object.keys(validatedResult.mappingDetails).length,
          failedSymbolsCount: validatedResult.failedSymbols.length
        });
      }
      
      // 📊 记录性能指标
      this.recordPerformanceMetrics(provider, symbolArray.length, Date.now() - startTime, cacheHits.size);
      
      return finalResult;
      
    } catch (error) {
      this.logger.error('Symbol mapping failed', {
        provider,
        symbolsCount: symbolArray.length,
        direction,
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * 🔍 缓存统计信息 - 使用层内总次数作为分母，避免比例异常
   */
  getCacheStats(): CacheStatsDto {
    const l1Total = this.cacheStats.l1.hits + this.cacheStats.l1.misses;
    const l2Total = this.cacheStats.l2.hits + this.cacheStats.l2.misses;
    const l3Total = this.cacheStats.l3.hits + this.cacheStats.l3.misses;
    
    return {
      totalQueries: this.cacheStats.totalQueries,
      
      // 各层命中率：使用层内总次数作为分母
      l1HitRatio: l1Total > 0 ? (this.cacheStats.l1.hits / l1Total) * 100 : 0,
      l2HitRatio: l2Total > 0 ? (this.cacheStats.l2.hits / l2Total) * 100 : 0,
      l3HitRatio: l3Total > 0 ? (this.cacheStats.l3.hits / l3Total) * 100 : 0,
      
      // 详细计数
      layerStats: {
        l1: { hits: this.cacheStats.l1.hits, misses: this.cacheStats.l1.misses, total: l1Total },
        l2: { hits: this.cacheStats.l2.hits, misses: this.cacheStats.l2.misses, total: l2Total },
        l3: { hits: this.cacheStats.l3.hits, misses: this.cacheStats.l3.misses, total: l3Total }
      },
      
      cacheSize: {
        l1: this.providerRulesCache.size,    // L1: 规则缓存
        l2: this.symbolMappingCache.size,    // L2: 符号映射缓存
        l3: this.batchResultCache.size       // L3: 批量结果缓存
      }
    };
  }

  // =============================================================================
  // 🔧 私有辅助方法区域 - 将在下一个里程碑中实现
  // =============================================================================

  /**
   * 🔄 深拷贝结果，避免调用方修改影响缓存
   */
  private cloneResult(result: BatchMappingResult): BatchMappingResult {
    // 深拷贝确保缓存数据不被外部修改
    return JSON.parse(JSON.stringify(result));
  }
  
  /**
   * 🔨 构建直接查询结果（缓存禁用时使用）
   */
  private buildDirectQueryResult(
    symbols: string[],
    results: Record<string, string>,
    provider: string,
    direction: 'to_standard' | 'from_standard',
    startTime: number
  ): BatchMappingResult {
    const failedSymbols = symbols.filter(s => !results[s]);
    
    return {
      success: true,
      provider,
      direction,
      totalProcessed: symbols.length,
      cacheHits: 0,  // 没有缓存命中，因为缓存被禁用
      mappingDetails: results,
      failedSymbols,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * ✅ 批量结果结构校验与修复
   */
  private validateAndFixBatchResult(result: BatchMappingResult): BatchMappingResult {
    // 确保必需字段存在，供L3精准失效使用
    const validatedResult = { ...result };
    
    if (!validatedResult.mappingDetails || typeof validatedResult.mappingDetails !== 'object') {
      validatedResult.mappingDetails = {};
      this.logger.warn('Missing mappingDetails in batch result, added empty object');
    }
    
    if (!Array.isArray(validatedResult.failedSymbols)) {
      validatedResult.failedSymbols = [];
      this.logger.warn('Missing failedSymbols in batch result, added empty array');
    }
    
    return validatedResult;
  }

  /**
   * 🔑 缓存键生成策略 - 确保稳定性和一致性
   */
  private getSymbolCacheKey(provider: string, symbol: string, direction: 'to_standard' | 'from_standard'): string {
    // 标准化provider名称（小写）避免大小写导致的缓存miss
    const normalizedProvider = provider.toLowerCase();
    return `symbol:${normalizedProvider}:${direction}:${symbol}`;
  }

  /**
   * 🔑 统一键生成方法 - 确保批量缓存与并发控制使用相同规格
   */
  private generateConsistentKey(prefix: string, provider: string, symbols: string[], direction: 'to_standard' | 'from_standard'): string {
    const normalizedProvider = provider.toLowerCase();
    const sortedSymbols = [...symbols].sort().join(',');
    const symbolsHash = crypto.createHash('md5').update(sortedSymbols).digest('hex');
    return `${prefix}:${normalizedProvider}:${direction}:${symbolsHash}`;
  }

  private getBatchCacheKey(provider: string, symbols: string[], direction: 'to_standard' | 'from_standard'): string {
    return this.generateConsistentKey('batch', provider, symbols, direction);
  }

  private getPendingQueryKey(provider: string, symbols: string[], direction: 'to_standard' | 'from_standard'): string {
    return this.generateConsistentKey('pending', provider, symbols, direction);
  }

  private getProviderRulesKey(provider: string): string {
    const normalizedProvider = provider.toLowerCase();
    return `rules:${normalizedProvider}`;
  }

  /**
   * 📊 监控指标策略 - 避免指标类型冲突
   */
  private recordCacheMetrics(level: 'l1'|'l2'|'l3'|'disabled', isHit: boolean): void {
    // 复用现有的 streamCacheHitRate，仅使用定义中的 cache_type 标签
    // 避免添加额外标签导致 prom-client 标签不匹配报错
    // 统一使用 Metrics.inc 封装，与现网保持一致
    Metrics.inc(
      this.metricsRegistry,
      'streamCacheHitRate',
      { 
        cache_type: `symbol_mapping_${level}`  // symbol_mapping_l1/l2/l3
      },
      isHit ? 100 : 0
    );
  }

  private recordPerformanceMetrics(
    provider: string, 
    symbolsCount: number, 
    processingTime: number,
    cacheHits: number
  ): void {
    const hitRatio = (cacheHits / symbolsCount) * 100;
    
    // 避免与Counter类型的streamCacheHitRate冲突
    // 方式1：仅记录日志，不新增指标
    this.logger.log('Symbol mapping performance', {
      provider: provider.toLowerCase(),
      symbolsCount,
      processingTime,
      hitRatio,
      cacheEfficiency: hitRatio > 80 ? 'high' : hitRatio > 50 ? 'medium' : 'low'
    });
  }

  /**
   * 🎯 统一规则获取（带缓存）- 键一致性修正
   */
  private async getProviderRules(provider: string): Promise<SymbolMappingRule[]> {
    const rulesKey = this.getProviderRulesKey(provider);  // 使用统一键生成
    const cached = this.providerRulesCache.get(rulesKey);
    if (cached) {
      this.cacheStats.l1.hits++;  // L1是规则缓存
      this.recordCacheMetrics('l1', true);  // 记录L1命中
      return cached;
    }
    
    this.cacheStats.l1.misses++;
    this.recordCacheMetrics('l1', false);  // 记录L1未命中
    
    // 查询数据库获取规则
    const mappingConfig = await this.repository.findByDataSource(provider);
    const rules = mappingConfig?.SymbolMappingRule || [];
    
    // 存入L1缓存，使用统一键
    this.providerRulesCache.set(rulesKey, rules);
    
    this.logger.debug('Provider rules loaded and cached', {
      provider: provider.toLowerCase(),
      rulesKey,
      rulesCount: rules.length
    });
    
    return rules;
  }

  /**
   * ⏱️ 创建带超时保护的查询
   * 防止底层Promise悬挂导致内存泄露
   */
  private createTimeoutProtectedQuery(
    provider: string,
    symbols: string[],
    direction: 'to_standard' | 'from_standard',
    queryKey: string
  ): Promise<Record<string, string>> {
    // 使用显式配置的查询超时时间
    const queryTimeout = this.featureFlags.symbolMapperQueryTimeoutMs;
    
    return new Promise(async (resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout;
      let isResolved = false;
      
      // 设置超时定时器
      timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          // 清理pendingQueries以防止内存泄露
          this.pendingQueries.delete(queryKey);
          
          const errorMsg = `Query timeout after ${queryTimeout}ms`;
          this.logger.error(errorMsg, {
            provider,
            symbolsCount: symbols.length,
            direction,
            queryKey
          });
          
          reject(new Error(errorMsg));
        }
      }, queryTimeout);
      
      try {
        // 执行实际查询
        const result = await this.executeUncachedQuery(provider, symbols, direction);
        
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          resolve(result);
        }
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          reject(error);
        }
      }
    });
  }

  /**
   * 🔄 执行未缓存查询 - L1规则缓存 + 数据库映射
   */
  private async executeUncachedQuery(provider: string, symbols: string[], direction: 'to_standard' | 'from_standard'): Promise<Record<string, string>> {
    this.logger.debug('Executing uncached query', { provider, symbolsCount: symbols.length, direction });
    
    // 首先获取规则（可能命中L1缓存）
    const rules = await this.getProviderRules(provider);
    
    if (!rules || rules.length === 0) {
      this.logger.warn('No mapping rules found for provider', { provider });
      return {};
    }
    
    const results: Record<string, string> = {};
    
    // 对每个符号应用映射规则
    for (const symbol of symbols) {
      const mappedSymbol = this.applyMappingRules(symbol, rules, direction);
      if (mappedSymbol && mappedSymbol !== symbol) {
        results[symbol] = mappedSymbol;
      }
      // 注意：映射失败或无变化的符号不添加到results中，将在failedSymbols中处理
    }
    
    this.logger.debug('Uncached query completed', {
      provider: provider.toLowerCase(),
      inputCount: symbols.length,
      successCount: Object.keys(results).length,
      direction
    });
    
    return results;
  }

  /**
   * 📋 应用映射规则到单个符号
   */
  private applyMappingRules(
    symbol: string, 
    rules: SymbolMappingRule[], 
    direction: 'to_standard' | 'from_standard'
  ): string | null {
    // 根据方向选择匹配字段
    const sourceField = direction === 'to_standard' ? 'sdkSymbol' : 'standardSymbol';
    const targetField = direction === 'to_standard' ? 'standardSymbol' : 'sdkSymbol';
    
    // 查找匹配的规则
    const matchingRule = rules.find(rule => 
      rule.isActive !== false && rule[sourceField] === symbol
    );
    
    if (matchingRule) {
      return matchingRule[targetField];
    }
    
    // 没找到匹配规则时返回原符号（保持现有行为）
    return symbol;
  }

  /**
   * 🔄 批量回源回填策略 - 详细实现规则
   */
  private backfillSingleSymbolCache(
    provider: string, 
    uncachedResults: Record<string, string>, 
    direction: 'to_standard' | 'from_standard'
  ): void {
    // uncachedResults 格式：{ [originalSymbol]: mappedSymbol }
    // 遍历成功映射的结果，失败项不回填
    
    for (const [originalSymbol, mappedSymbol] of Object.entries(uncachedResults)) {
      // 跳过映射失败的项（值为 null、undefined 或空字符串）
      if (!mappedSymbol) {
        continue;
      }
      
      // 缓存当前方向的映射
      const currentKey = this.getSymbolCacheKey(provider, originalSymbol, direction);
      this.symbolMappingCache.set(currentKey, mappedSymbol);
      
      // 同步双向回填：缓存反向映射
      const reverseDirection = direction === 'to_standard' ? 'from_standard' : 'to_standard';
      const reverseKey = this.getSymbolCacheKey(provider, mappedSymbol, reverseDirection);
      this.symbolMappingCache.set(reverseKey, originalSymbol);
      
      this.logger.debug('Bidirectional backfill completed', {
        provider: provider.toLowerCase(),
        originalSymbol,
        mappedSymbol,
        direction,
        currentKey,
        reverseKey
      });
    }
    
    this.logger.log('Batch backfill completed', {
      provider: provider.toLowerCase(),
      direction,
      successCount: Object.keys(uncachedResults).filter(key => uncachedResults[key]).length,
      totalCount: Object.keys(uncachedResults).length
    });
  }

  /**
   * 🔄 设置 Change Stream 监听器
   * 监听 symbol_mapping_rules 集合的变更事件，实现智能缓存失效
   */
  private setupChangeStreamMonitoring(): void {
    // 幂等性检查：避免重复监听
    if (this.isMonitoringActive) {
      this.logger.warn('Change Stream monitoring already active, skipping setup');
      return;
    }

    try {
      // 使用 repository 的 watchChanges 方法
      this.changeStream = this.repository.watchChanges();
      this.isMonitoringActive = true;

      // 监听变更事件
      this.changeStream.on('change', this.handleChangeEvent.bind(this));
      
      // 监听错误事件 - 实现指数退避重连策略
      this.changeStream.on('error', (error) => {
        this.logger.error('Change Stream error occurred', {
          error: error.message,
          stack: error.stack,
          reconnectAttempts: this.reconnectAttempts
        });
        
        this.isMonitoringActive = false;
        this.scheduleReconnection();
      });

      // 监听关闭事件 - 也触发重连
      this.changeStream.on('close', () => {
        this.logger.warn('Change Stream connection closed');
        this.isMonitoringActive = false;
        this.scheduleReconnection();
      });

      // 成功建立连接，重置重连计数
      this.reconnectAttempts = 0;
      this.logger.log('Change Stream monitoring established successfully', {
        collection: 'symbol_mapping_rules',
        watchEvents: ['insert', 'update', 'delete']
      });

    } catch (error) {
      this.logger.error('Failed to setup Change Stream monitoring', {
        error: error.message,
        stack: error.stack
      });
      this.isMonitoringActive = false;
      this.scheduleReconnection();
    }
  }

  /**
   * 📡 调度重连 - 实现指数退避策略
   */
  private scheduleReconnection(): void {
    // 计算退避延迟：1s -> 2s -> 4s -> 8s -> 16s -> 30s (max)
    const baseDelay = 1000; // 1秒基础延迟
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    
    this.reconnectAttempts++;
    
    this.logger.log('Scheduling Change Stream reconnection', {
      attempt: this.reconnectAttempts,
      delayMs: delay,
      nextAttemptAt: new Date(Date.now() + delay).toISOString()
    });
    
    setTimeout(() => {
      this.logger.log('Attempting to reconnect Change Stream...', {
        attempt: this.reconnectAttempts
      });
      this.setupChangeStreamMonitoring();
    }, delay);
  }

  /**
   * 🎯 处理 Change Stream 变更事件
   * 解析变更事件并触发智能缓存失效
   */
  private async handleChangeEvent(changeEvent: any): Promise<void> {
    try {
      const { operationType, fullDocument, documentKey, ns } = changeEvent;
      
      this.logger.debug('Change Stream event received', {
        operationType,
        documentId: documentKey?._id,
        hasFullDocument: !!fullDocument,
        collection: ns?.coll
      });

      // 提取 provider 信息
      let affectedProvider: string | null = null;
      
      if (fullDocument?.dataSourceName) {
        // insert/update/replace 操作：从完整文档获取 provider
        affectedProvider = fullDocument.dataSourceName;
        
        this.logger.debug('Provider extracted from fullDocument', {
          operationType,
          provider: affectedProvider,
          documentId: documentKey?._id
        });
        
      } else if (operationType === 'delete') {
        // delete 操作处理策略：
        // 1. 首先尝试从 preImage 获取（如果配置了 preAndPostImages）
        // 2. 否则查询最近的数据源版本缓存
        // 3. 最后使用保守策略清空所有缓存
        
        affectedProvider = await this.extractProviderFromDeleteEvent(changeEvent);
        
        if (!affectedProvider) {
          this.logger.warn('Cannot determine provider for delete operation, using conservative strategy', {
            documentKey,
            operationType
          });
          affectedProvider = '*'; // 保守策略：影响所有 provider
        }
      }

      if (affectedProvider) {
        await this.invalidateProviderCache(affectedProvider, operationType);
      } else {
        this.logger.warn('Cannot determine affected provider from change event', {
          operationType,
          documentKey,
          hasFullDocument: !!fullDocument
        });
      }

    } catch (error) {
      this.logger.error('Error handling Change Stream event', {
        error: error.message,
        stack: error.stack,
        changeEvent: JSON.stringify(changeEvent, null, 2)
      });
    }
  }

  /**
   * 🔍 从 delete 事件中提取 provider 信息
   * 使用多种策略尝试确定被删除文档的 dataSourceName
   */
  private async extractProviderFromDeleteEvent(changeEvent: any): Promise<string | null> {
    const { documentKey, preImage } = changeEvent;
    
    try {
      // 策略 1: 从 preImage 获取（如果 Change Stream 配置了 preAndPostImages）
      if (preImage?.dataSourceName) {
        this.logger.debug('Provider extracted from preImage', {
          provider: preImage.dataSourceName,
          documentId: documentKey?._id
        });
        return preImage.dataSourceName;
      }
      
      // 策略 2: 查询数据库（基于 documentKey._id）
      if (documentKey?._id) {
        try {
          const document = await this.repository.findById(documentKey._id.toString());
          if (document?.dataSourceName) {
            this.logger.debug('Provider extracted from database query', {
              provider: document.dataSourceName,
              documentId: documentKey._id
            });
            return document.dataSourceName;
          }
        } catch (dbError) {
          this.logger.warn('Failed to query document for provider extraction', {
            documentId: documentKey._id,
            error: dbError.message
          });
        }
      }
      
      // 策略 3: 基于时间窗口的启发式方法
      // 记录最近操作的 provider，在短时间内假设删除的是同一个 provider
      // 这里可以实现一个 LRU 最近操作缓存
      
      this.logger.warn('All provider extraction strategies failed for delete operation', {
        documentKey,
        hasPreImage: !!preImage
      });
      
      return null;
      
    } catch (error) {
      this.logger.error('Error during provider extraction from delete event', {
        error: error.message,
        documentKey
      });
      return null;
    }
  }

  /**
   * 🧹 智能缓存失效：基于 provider 失效相关缓存
   * 支持两种模式：全量失效和精准失效
   */
  private async invalidateProviderCache(provider: string, operationType: string): Promise<void> {
    const startTime = Date.now();
    let invalidatedCount = 0;

    try {
      if (provider === '*') {
        // 影响所有 provider 的操作（如 delete 且无法确定具体 provider）
        invalidatedCount = await this.performFullCacheInvalidation(operationType, startTime);
        return;
      }

      const normalizedProvider = provider.toLowerCase();
      
      // 尝试精准失效：比较新旧规则差异
      const preciseCacheInvalidated = await this.attemptPreciseCacheInvalidation(normalizedProvider, operationType);
      
      if (preciseCacheInvalidated !== null) {
        // 精准失效成功
        invalidatedCount = preciseCacheInvalidated;
        
        this.logger.log('Precise cache invalidation completed', {
          provider: normalizedProvider,
          operationType,
          invalidatedEntries: invalidatedCount,
          processingTime: Date.now() - startTime,
          remainingCacheSize: {
            l1: this.providerRulesCache.size,
            l2: this.symbolMappingCache.size,
            l3: this.batchResultCache.size
          }
        });
      } else {
        // 精准失效失败，回退到传统方式
        invalidatedCount = await this.performProviderWideInvalidation(normalizedProvider, operationType, startTime);
      }

    } catch (error) {
      this.logger.error('Cache invalidation failed', {
        provider,
        operationType,
        error: error.message,
        invalidatedCount
      });
    }
  }

  /**
   * 🚨 全量缓存失效 - 最保守的策略
   */
  private async performFullCacheInvalidation(operationType: string, startTime: number): Promise<number> {
    this.logger.warn('Performing full cache invalidation due to ambiguous change');
    
    // 统计失效条目数
    const invalidatedCount = this.symbolMappingCache.size + this.batchResultCache.size;
    
    // 清空所有缓存
    this.providerRulesCache.clear();
    this.symbolMappingCache.clear();
    this.batchResultCache.clear();
    
    this.logger.warn('Full cache invalidation completed', {
      operationType,
      invalidatedEntries: invalidatedCount,
      processingTime: Date.now() - startTime
    });
    
    return invalidatedCount;
  }

  /**
   * 🎯 尝试精准缓存失效
   * 通过比较新旧规则差异，只失效受影响的符号
   */
  private async attemptPreciseCacheInvalidation(provider: string, operationType: string): Promise<number | null> {
    try {
      // 对于 insert 操作，无需比较旧规则
      if (operationType === 'insert') {
        // 直接失效 L1 规则缓存，让系统重新加载
        const rulesKey = this.getProviderRulesKey(provider);
        if (this.providerRulesCache.has(rulesKey)) {
          this.providerRulesCache.delete(rulesKey);
          this.logger.debug('L1 rules cache invalidated for insert operation', { provider });
        }
        return 1; // 只失效了 L1 缓存
      }

      // 对于 update/delete 操作，尝试精准比较
      const rulesKey = this.getProviderRulesKey(provider);
      const oldRules = this.providerRulesCache.get(rulesKey);
      
      if (!oldRules) {
        // 缓存中没有旧规则，无法进行精准比较
        this.logger.debug('No cached rules found for precise invalidation', { provider });
        return null;
      }

      // 获取最新规则
      const newRules = await this.getProviderRules(provider);
      
      // 计算规则差异
      const differences = this.calculateRuleDifferences(oldRules, newRules);
      const totalAffectedPairs = differences.addedPairs.length + 
                                differences.removedPairs.length + 
                                differences.modifiedPairs.length;

      if (totalAffectedPairs === 0) {
        this.logger.debug('No rule differences detected, skipping cache invalidation', { provider });
        return 0;
      }

      // 合并所有受影响的符号对
      const allAffectedPairs = [
        ...differences.addedPairs,
        ...differences.removedPairs,
        ...differences.modifiedPairs
      ];

      // 执行精准失效
      const invalidatedCount = await this.invalidateAffectedCacheEntries(provider, allAffectedPairs, operationType);
      
      this.logger.log('Precise cache invalidation successful', {
        provider,
        operationType,
        affectedPairs: totalAffectedPairs,
        invalidatedEntries: invalidatedCount
      });

      return invalidatedCount;

    } catch (error) {
      this.logger.warn('Precise cache invalidation failed, will fallback to provider-wide invalidation', {
        provider,
        operationType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 🔄 提供商范围失效 - 传统方式的性能优化版本
   */
  private async performProviderWideInvalidation(provider: string, operationType: string, startTime: number): Promise<number> {
    let invalidatedCount = 0;
    
    // 1. 失效 L1 规则缓存
    const rulesKey = this.getProviderRulesKey(provider);
    if (this.providerRulesCache.has(rulesKey)) {
      this.providerRulesCache.delete(rulesKey);
      this.logger.debug('L1 rules cache invalidated', { provider, rulesKey });
    }

    // 2. 批量失效 L2 符号缓存 - 性能优化：收集键后批量删除
    const l2KeysToDelete: string[] = [];
    
    // 版本兼容性处理：优先使用 entries()，回退到 keys()
    if (this.symbolMappingCache.entries) {
      // 新版本 LRU 库支持 entries()
      for (const [key] of this.symbolMappingCache.entries()) {
        if (key.includes(`:${provider}:`)) {
          l2KeysToDelete.push(key);
        }
      }
    } else if (this.symbolMappingCache.keys) {
      // 旧版本 LRU 库回退到 keys()
      for (const key of this.symbolMappingCache.keys()) {
        if (key.includes(`:${provider}:`)) {
          l2KeysToDelete.push(key);
        }
      }
    } else {
      // 最后的回退方案：forEach
      this.symbolMappingCache.forEach((value, key) => {
        if (key.includes(`:${provider}:`)) {
          l2KeysToDelete.push(key);
        }
      });
    }
    
    for (const key of l2KeysToDelete) {
      this.symbolMappingCache.delete(key);
      invalidatedCount++;
    }

    // 3. 批量失效 L3 批量缓存 - 性能优化：收集键后批量删除
    const l3KeysToDelete: string[] = [];
    
    // 版本兼容性处理：优先使用 entries()，回退到 keys()
    if (this.batchResultCache.entries) {
      // 新版本 LRU 库支持 entries()
      for (const [key] of this.batchResultCache.entries()) {
        if (key.includes(`:${provider}:`)) {
          l3KeysToDelete.push(key);
        }
      }
    } else if (this.batchResultCache.keys) {
      // 旧版本 LRU 库回退到 keys()
      for (const key of this.batchResultCache.keys()) {
        if (key.includes(`:${provider}:`)) {
          l3KeysToDelete.push(key);
        }
      }
    } else {
      // 最后的回退方案：forEach
      this.batchResultCache.forEach((value, key) => {
        if (key.includes(`:${provider}:`)) {
          l3KeysToDelete.push(key);
        }
      });
    }
    
    for (const key of l3KeysToDelete) {
      this.batchResultCache.delete(key);
      invalidatedCount++;
    }

    this.logger.log('Provider-wide cache invalidation completed', {
      provider,
      operationType,
      invalidatedEntries: invalidatedCount,
      l2KeysRemoved: l2KeysToDelete.length,
      l3KeysRemoved: l3KeysToDelete.length,
      processingTime: Date.now() - startTime,
      remainingCacheSize: {
        l1: this.providerRulesCache.size,
        l2: this.symbolMappingCache.size,
        l3: this.batchResultCache.size
      }
    });
    
    return invalidatedCount;
  }

  /**
   * 🔍 计算规则差异 - 用于精准缓存失效
   * 比较新旧规则集合，返回受影响的符号对
   */
  private calculateRuleDifferences(
    oldRules: SymbolMappingRule[],
    newRules: SymbolMappingRule[]
  ): {
    addedPairs: Array<{ standard: string; sdk: string }>;
    removedPairs: Array<{ standard: string; sdk: string }>;
    modifiedPairs: Array<{ standard: string; sdk: string }>;
  } {
    // 将规则转换为符号对映射，便于比较
    const oldPairsMap = new Map<string, string>();
    const newPairsMap = new Map<string, string>();
    
    // 构建旧规则的符号对映射
    for (const rule of oldRules) {
      if (rule.isActive !== false && rule.standardSymbol && rule.sdkSymbol) {
        const key = `${rule.standardSymbol}:${rule.sdkSymbol}`;
        oldPairsMap.set(key, rule.market || '');
      }
    }
    
    // 构建新规则的符号对映射
    for (const rule of newRules) {
      if (rule.isActive !== false && rule.standardSymbol && rule.sdkSymbol) {
        const key = `${rule.standardSymbol}:${rule.sdkSymbol}`;
        newPairsMap.set(key, rule.market || '');
      }
    }
    
    const addedPairs: Array<{ standard: string; sdk: string }> = [];
    const removedPairs: Array<{ standard: string; sdk: string }> = [];
    const modifiedPairs: Array<{ standard: string; sdk: string }> = [];
    
    // 找出新增的符号对
    for (const [key] of newPairsMap) {
      if (!oldPairsMap.has(key)) {
        const [standard, sdk] = key.split(':');
        addedPairs.push({ standard, sdk });
      }
    }
    
    // 找出删除的符号对
    for (const [key] of oldPairsMap) {
      if (!newPairsMap.has(key)) {
        const [standard, sdk] = key.split(':');
        removedPairs.push({ standard, sdk });
      }
    }
    
    // 找出修改的符号对（规则属性发生变化，如 market 字段）
    for (const [key, newMarket] of newPairsMap) {
      const oldMarket = oldPairsMap.get(key);
      if (oldMarket !== undefined && oldMarket !== newMarket) {
        const [standard, sdk] = key.split(':');
        modifiedPairs.push({ standard, sdk });
      }
    }
    
    this.logger.debug('Rule differences calculated', {
      addedCount: addedPairs.length,
      removedCount: removedPairs.length,
      modifiedCount: modifiedPairs.length,
      totalAffectedPairs: addedPairs.length + removedPairs.length + modifiedPairs.length
    });
    
    return {
      addedPairs,
      removedPairs,
      modifiedPairs
    };
  }

  /**
   * 🎯 精准缓存失效 - 基于符号对差异进行选择性失效
   * 只失效受影响的符号，而不是清空整个 provider 的缓存
   */
  private async invalidateAffectedCacheEntries(
    provider: string,
    affectedPairs: Array<{ standard: string; sdk: string }>,
    operationType: string
  ): Promise<number> {
    const normalizedProvider = provider.toLowerCase();
    let invalidatedCount = 0;
    const startTime = Date.now();
    
    try {
      // 对于每个受影响的符号对，失效相关的 L2 和 L3 缓存条目
      for (const { standard, sdk } of affectedPairs) {
        
        // 失效 L2 符号映射缓存 - 双向失效
        const toStandardKey = this.getSymbolCacheKey(normalizedProvider, sdk, 'to_standard');
        const fromStandardKey = this.getSymbolCacheKey(normalizedProvider, standard, 'from_standard');
        
        if (this.symbolMappingCache.has(toStandardKey)) {
          this.symbolMappingCache.delete(toStandardKey);
          invalidatedCount++;
        }
        
        if (this.symbolMappingCache.has(fromStandardKey)) {
          this.symbolMappingCache.delete(fromStandardKey);
          invalidatedCount++;
        }
        
        // 失效 L3 批量缓存中包含这些符号的条目
        // 注意：这里需要遍历所有 L3 缓存条目，检查其 mappingDetails
        invalidatedCount += this.invalidateL3EntriesContainingSymbols(normalizedProvider, [standard, sdk]);
      }
      
      this.logger.log('Precise cache invalidation completed', {
        provider: normalizedProvider,
        operationType,
        affectedPairsCount: affectedPairs.length,
        invalidatedEntries: invalidatedCount,
        processingTime: Date.now() - startTime
      });
      
      return invalidatedCount;
      
    } catch (error) {
      this.logger.error('Precise cache invalidation failed', {
        provider: normalizedProvider,
        operationType,
        affectedPairsCount: affectedPairs.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 💾 启动内存水位监控
   */
  private startMemoryMonitoring(): void {
    const checkInterval = this.featureFlags.symbolMapperMemoryCheckInterval;
    
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, checkInterval);
    
    this.logger.log('Memory monitoring started', {
      checkIntervalMs: checkInterval,
      warningThreshold: `${this.featureFlags.symbolMapperMemoryWarningThreshold}%`,
      criticalThreshold: `${this.featureFlags.symbolMapperMemoryCriticalThreshold}%`
    });
  }
  
  /**
   * 🔍 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // 记录当前内存状态
    const memoryState = {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapUsagePercent: Math.round(heapUsagePercent),
      cacheSize: {
        l1: this.providerRulesCache.size,
        l2: this.symbolMappingCache.size,
        l3: this.batchResultCache.size
      }
    };
    
    // 检查是否达到警告阈值
    if (heapUsagePercent >= this.featureFlags.symbolMapperMemoryWarningThreshold) {
      this.logger.warn('Memory usage warning threshold reached', memoryState);
      
      // 检查是否达到临界阈值，需要清理
      if (heapUsagePercent >= this.featureFlags.symbolMapperMemoryCriticalThreshold) {
        this.logger.error('Memory usage critical threshold reached, triggering cleanup', memoryState);
        this.performLayeredCacheCleanup();
      }
    } else {
      // 每10次检查记录一次正常状态
      const timeSinceLastCleanup = Date.now() - this.lastMemoryCleanup.getTime();
      if (timeSinceLastCleanup > 600000) { // 10分钟
        this.logger.debug('Memory usage normal', memoryState);
      }
    }
  }
  
  /**
   * 🧹 执行分层缓存清理
   * 按优先级清理：L3 → L2 → L1
   */
  private performLayeredCacheCleanup(): void {
    const startTime = Date.now();
    const beforeStats = {
      l1: this.providerRulesCache.size,
      l2: this.symbolMappingCache.size,
      l3: this.batchResultCache.size
    };
    
    // Step 1: 清理 L3 批量缓存（影响最小）
    const l3Cleared = this.batchResultCache.size;
    this.batchResultCache.clear();
    this.logger.log('L3 batch cache cleared', { entriesCleared: l3Cleared });
    
    // 检查内存是否已经恢复
    const memAfterL3 = process.memoryUsage();
    const heapPercentAfterL3 = (memAfterL3.heapUsed / memAfterL3.heapTotal) * 100;
    
    if (heapPercentAfterL3 >= this.featureFlags.symbolMapperMemoryCriticalThreshold) {
      // Step 2: 清理 L2 符号缓存
      const l2Cleared = this.symbolMappingCache.size;
      this.symbolMappingCache.clear();
      this.logger.log('L2 symbol cache cleared', { entriesCleared: l2Cleared });
      
      // 再次检查内存
      const memAfterL2 = process.memoryUsage();
      const heapPercentAfterL2 = (memAfterL2.heapUsed / memAfterL2.heapTotal) * 100;
      
      if (heapPercentAfterL2 >= this.featureFlags.symbolMapperMemoryCriticalThreshold) {
        // Step 3: 清理 L1 规则缓存（最后手段）
        const l1Cleared = this.providerRulesCache.size;
        this.providerRulesCache.clear();
        this.logger.log('L1 rules cache cleared', { entriesCleared: l1Cleared });
      }
    }
    
    // 记录清理结果
    const afterStats = {
      l1: this.providerRulesCache.size,
      l2: this.symbolMappingCache.size,
      l3: this.batchResultCache.size
    };
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
      this.logger.log('Manual garbage collection triggered');
    }
    
    const memAfterCleanup = process.memoryUsage();
    const heapUsedAfterMB = Math.round(memAfterCleanup.heapUsed / 1024 / 1024);
    const heapPercentAfter = (memAfterCleanup.heapUsed / memAfterCleanup.heapTotal) * 100;
    
    this.lastMemoryCleanup = new Date();
    
    this.logger.log('Layered cache cleanup completed', {
      processingTime: Date.now() - startTime,
      entriesCleared: {
        l1: beforeStats.l1 - afterStats.l1,
        l2: beforeStats.l2 - afterStats.l2,
        l3: beforeStats.l3 - afterStats.l3
      },
      memoryAfter: {
        heapUsedMB: heapUsedAfterMB,
        heapUsagePercent: Math.round(heapPercentAfter)
      }
    });
  }
  
  /**
   * 🔍 失效包含特定符号的 L3 批量缓存条目
   */
  private invalidateL3EntriesContainingSymbols(provider: string, symbols: string[]): number {
    let invalidatedCount = 0;
    const symbolSet = new Set(symbols);
    
    // 遍历 L3 缓存条目，检查 mappingDetails 是否包含目标符号
    for (const [cacheKey, batchResult] of this.batchResultCache.entries()) {
      // 确认这是目标 provider 的缓存条目
      if (!cacheKey.includes(`:${provider}:`)) {
        continue;
      }
      
      // 检查批量结果是否包含受影响的符号
      const mappingDetails = batchResult.mappingDetails || {};
      const hasAffectedSymbol = Object.keys(mappingDetails).some(symbol => symbolSet.has(symbol)) ||
                               Object.values(mappingDetails).some(symbol => symbolSet.has(symbol));
      
      if (hasAffectedSymbol) {
        this.batchResultCache.delete(cacheKey);
        invalidatedCount++;
        
        this.logger.debug('L3 cache entry invalidated due to affected symbol', {
          cacheKey,
          affectedSymbols: symbols
        });
      }
    }
    
    return invalidatedCount;
  }

  private mergeResults(
    cacheHits: Map<string, string>, 
    uncachedResults: Record<string, string>, 
    originalSymbols: string[],
    provider: string,
    direction: 'to_standard' | 'from_standard',
    startTime: number
  ): BatchMappingResult {
    const mappingDetails: Record<string, string> = {};
    const failedSymbols: string[] = [];
    
    // 合并缓存命中和数据库查询结果
    for (const symbol of originalSymbols) {
      const mappedSymbol = cacheHits.get(symbol) || uncachedResults[symbol];
      if (mappedSymbol) {
        mappingDetails[symbol] = mappedSymbol;
      } else {
        failedSymbols.push(symbol);
      }
    }
    
    return {
      success: true,
      mappingDetails,
      failedSymbols,
      provider: provider.toLowerCase(),
      direction,
      totalProcessed: originalSymbols.length,
      cacheHits: cacheHits.size,
      processingTime: Date.now() - startTime
    };
  }
}