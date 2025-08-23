import { Injectable } from '@nestjs/common';
import { createLogger } from '../../../../common/config/logger.config';
import { SymbolMapperCacheService } from '../../../05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service';
import { InfrastructureMetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/infrastructure-metrics-registry.service';
import { MetricsHelper } from '../../../../monitoring/infrastructure/helper/metrics-helper';
import { 
  SymbolTransformResult, 
  SymbolTransformForProviderResult 
} from '../interfaces';

/**
 * Symbol Transformer Service
 * 专门处理符号转换执行逻辑，从 SymbolMapperService 迁移
 * 职责：符号转换执行，不处理规则管理
 */
@Injectable()
export class SymbolTransformerService {
  private readonly logger = createLogger('SymbolTransformer');

  constructor(
    private readonly symbolMapperCacheService: SymbolMapperCacheService,  // 缓存服务（含回源逻辑）
    private readonly metricsRegistry?: InfrastructureMetricsRegistryService  // 可选监控
  ) {}

  /**
   * 核心转换方法 - 迁移自 SymbolMapperService.mapSymbols()
   * 返回格式严格对齐现有实现
   */
  async transformSymbols(
    provider: string,
    symbols: string | string[],
    direction: 'to_standard' | 'from_standard'  // 移除默认值，强制显式传入
  ): Promise<SymbolTransformResult> {
    const startTime = process.hrtime.bigint();
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const requestId = `transform_${Date.now()}`;

    this.logger.debug('开始符号转换', {
      provider,
      symbolsCount: symbolArray.length,
      direction,
      requestId,
    });

    try {
      // 使用缓存服务进行批量转换
      const result = await this.symbolMapperCacheService.mapSymbols(
        provider,
        symbolArray,
        direction,
        requestId
      );
      
      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;
      
      // 转换为统一返回格式（严格对齐现有格式）
      const response: SymbolTransformResult = {
        mappedSymbols: Object.values(result.mappingDetails),
        mappingDetails: result.mappingDetails,
        failedSymbols: result.failedSymbols,
        metadata: {
          provider,
          totalSymbols: symbolArray.length,
          successCount: Object.keys(result.mappingDetails).length,
          failedCount: result.failedSymbols.length,
          processingTimeMs: processingTime,  // 注意：使用 processingTimeMs
        },
      };

      // 记录性能指标
      if (this.metricsRegistry) {
        this.recordMetrics(provider, response);
      }

      this.logger.debug('符号转换完成', {
        requestId,
        ...response.metadata,
      });

      return response;

    } catch (error) {
      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;
      
      this.logger.error('符号转换失败', {
        requestId,
        provider,
        error: error.message,
        processingTimeMs: processingTime,
      });

      // 返回失败结果（与现有实现保持一致）
      return {
        mappedSymbols: [],
        mappingDetails: {},
        failedSymbols: symbolArray,
        metadata: {
          provider,
          totalSymbols: symbolArray.length,
          successCount: 0,
          failedCount: symbolArray.length,
          processingTimeMs: processingTime,
        },
      };
    }
  }

  /**
   * 单符号转换便捷方法
   */
  async transformSingleSymbol(
    provider: string,
    symbol: string,
    direction: 'to_standard' | 'from_standard'  // 移除默认值，强制显式传入
  ): Promise<string> {
    const result = await this.transformSymbols(provider, [symbol], direction);
    return result.mappedSymbols[0] || symbol;
  }

  /**
   * transformSymbolsForProvider - 迁移自 SymbolMapperService
   * 返回格式与现有实现完全一致
   */
  async transformSymbolsForProvider(
    provider: string,
    symbols: string[],
    requestId: string
  ): Promise<SymbolTransformForProviderResult> {
    const startTime = process.hrtime.bigint();
    
    this.logger.debug('开始 transformSymbolsForProvider', {
      provider,
      symbolsCount: symbols.length,
      requestId,
    });

    // 分离标准格式和需要转换的符号
    const { symbolsToTransform, standardSymbols } = this.separateSymbolsByFormat(symbols);
    
    // 转换非标准格式
    let mappingResult = {
      transformedSymbols: {} as Record<string, string>,
      failedSymbols: [] as string[],
      processingTimeMs: 0,
    };

    if (symbolsToTransform.length > 0) {
      const result = await this.transformSymbols(provider, symbolsToTransform, 'to_standard');
      mappingResult = {
        transformedSymbols: result.mappingDetails,
        failedSymbols: result.failedSymbols,
        processingTimeMs: result.metadata.processingTimeMs,
      };
    }

    // 添加标准格式符号（不需要转换）
    standardSymbols.forEach((symbol) => {
      mappingResult.transformedSymbols[symbol] = symbol;
    });

    const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;

    // 返回与现有实现完全一致的格式
    const response: SymbolTransformForProviderResult = {
      transformedSymbols: Object.values(mappingResult.transformedSymbols),
      mappingResults: {
        transformedSymbols: mappingResult.transformedSymbols,
        failedSymbols: mappingResult.failedSymbols,
        metadata: {
          provider,
          totalSymbols: symbols.length,
          successfulTransformations: Object.keys(mappingResult.transformedSymbols).length,
          failedTransformations: mappingResult.failedSymbols.length,
          processingTime: processingTime,  // 注意：这里使用 processingTime（不带Ms）
        },
      },
    };

    this.logger.debug('transformSymbolsForProvider 完成', {
      requestId,
      ...response.mappingResults.metadata,
    });

    return response;
  }

  /**
   * 向后兼容的方法名 - mapSymbols
   */
  async mapSymbols(provider: string, symbols: string | string[]) {
    return await this.transformSymbols(provider, symbols, 'to_standard');
  }

  /**
   * 向后兼容的方法名 - mapSymbol
   */
  async mapSymbol(provider: string, symbol: string) {
    return await this.transformSingleSymbol(provider, symbol, 'to_standard');
  }

  /**
   * 分离符号格式（迁移自 SymbolMapperService）
   */
  private separateSymbolsByFormat(symbols: string[]): {
    symbolsToTransform: string[];
    standardSymbols: string[];
  } {
    const symbolsToTransform: string[] = [];
    const standardSymbols: string[] = [];
    
    symbols.forEach(symbol => {
      if (this.isStandardFormat(symbol)) {
        standardSymbols.push(symbol);
      } else {
        symbolsToTransform.push(symbol);
      }
    });
    
    return { symbolsToTransform, standardSymbols };
  }

  /**
   * 判断是否为标准格式（迁移自 SymbolMapperService）
   */
  private isStandardFormat(symbol: string): boolean {
    // 6位数字（A股）或纯字母（美股）
    return /^\d{6}$/.test(symbol) || /^[A-Z]+$/.test(symbol);
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(provider: string, result: SymbolTransformResult): void {
    if (!this.metricsRegistry) return;

    const hitRate = result.metadata.successCount / result.metadata.totalSymbols;
    
    // 使用 Metrics 助手类记录指标
    MetricsHelper.setGauge(
      this.metricsRegistry,
      'symbol_transformer_success_rate',
      hitRate,
      { provider }
    );
    
    MetricsHelper.observe(
      this.metricsRegistry,
      'symbol_transformer_processing_time',
      result.metadata.processingTimeMs,
      { provider }
    );
  }
}