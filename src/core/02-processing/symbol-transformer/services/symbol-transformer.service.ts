import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { SymbolMapperCacheStandardizedService } from "../../../05-caching/module/symbol-mapper-cache/services/symbol-mapper-cache-standardized.service";
import { MappingDirection } from "../../../shared/constants/cache.constants";

import {
  SymbolTransformResult,
  SymbolTransformForProviderResult,
  ISymbolTransformer,
} from "../interfaces";
import {
  SYMBOL_PATTERNS,
  CONFIG,
  MARKET_TYPES,
} from "../constants/symbol-transformer-enhanced.constants";
import { RequestIdUtils } from "../utils/request-id.utils";
import { UniversalExceptionFactory, ComponentIdentifier, BusinessErrorCode } from "@common/core/exceptions";
import { SYMBOL_TRANSFORMER_ERROR_CODES } from "../constants/symbol-transformer-enhanced.constants";

/**
 * Symbol Transformer Service
 * 专门处理符号转换执行逻辑，从 SymbolMapperService 迁移
 * 职责：符号转换执行，不处理规则管理
 */

@Injectable()
export class SymbolTransformerService implements ISymbolTransformer {
  private readonly logger = createLogger("SymbolTransformer");

  constructor(
    private readonly symbolMapperCacheService: SymbolMapperCacheStandardizedService, // 缓存服务（含回源逻辑）
  ) {}

  /**
   * 核心转换方法 - 迁移自 SymbolMapperService.mapSymbols()
   * 返回格式严格对齐现有实现
   */
  async transformSymbols(
    provider: string,
    symbols: string | string[],
    direction: MappingDirection = MappingDirection.TO_STANDARD,
  ): Promise<SymbolTransformResult> {
    const startTime = process.hrtime.bigint();

    // 检查symbols参数，如果为null/undefined直接转换为空数组进行验证
    const symbolArray =
      symbols == null ? [] : Array.isArray(symbols) ? symbols : [symbols];
    const requestId = RequestIdUtils.generate();

    // 输入验证和安全检查
    this.validateInput(provider, symbolArray, direction);

    this.logger.debug("开始符号转换", {
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
        requestId,
      );

      const processingTimeMs = Number(process.hrtime.bigint() - startTime) / 1e6;

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
          processingTimeMs: processingTimeMs, // 使用标准字段名
        },
      };

   

      this.logger.debug("符号转换完成", {
        requestId,
        ...response.metadata,
      });

      return response;
    } catch (error) {
      const processingTimeMs = Number(process.hrtime.bigint() - startTime) / 1e6;

  

      this.logger.error("符号转换失败", {
        requestId,
        provider,
        error: error.message,
        processingTimeMs: processingTimeMs,
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
          processingTimeMs: processingTimeMs,
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
    direction: MappingDirection = MappingDirection.TO_STANDARD,
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
    requestId: string,
  ): Promise<SymbolTransformForProviderResult> {
    const startTime = process.hrtime.bigint();

    this.logger.debug("开始 transformSymbolsForProvider", {
      provider,
      symbolsCount: symbols.length,
      requestId,
    });

    // 分离标准格式和需要转换的符号
    const { symbolsToTransform, standardSymbols } =
      this.separateSymbolsByFormat(symbols);

    // 转换非标准格式
    let mappingResult = {
      transformedSymbols: {} as Record<string, string>,
      failedSymbols: [] as string[],
      processingTimeMs: 0,
    };

    if (symbolsToTransform.length > 0) {
      const result = await this.transformSymbols(
        provider,
        symbolsToTransform,
        MappingDirection.TO_STANDARD,
      );
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

    const processingTimeMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    // 返回与现有实现完全一致的格式
    const response: SymbolTransformForProviderResult = {
      transformedSymbols: Object.values(mappingResult.transformedSymbols),
      mappingResults: {
        transformedSymbols: mappingResult.transformedSymbols,
        failedSymbols: mappingResult.failedSymbols,
        metadata: {
          provider,
          totalSymbols: symbols.length,
          successfulTransformations: Object.keys(
            mappingResult.transformedSymbols,
          ).length,
          failedTransformations: mappingResult.failedSymbols.length,
          processingTimeMs: processingTimeMs, // 使用标准字段名
        },
      },
    };

    this.logger.debug("transformSymbolsForProvider 完成", {
      requestId,
      ...response.mappingResults.metadata,
    });

    return response;
  }


  /**
   * 输入验证和安全检查
   */
  private validateInput(
    provider: string,
    symbols: string[],
    direction: MappingDirection,
  ): void {
    // 提供商验证
    if (
      !provider ||
      typeof provider !== "string" ||
      provider.trim().length === 0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: 'Provider is required and must be a non-empty string',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateInput',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: { provider, customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT, reason: 'invalid_provider_format' },
        retryable: false
      });
    }

    // 符号数组验证 - 首先检查null/undefined
    if (!symbols || !Array.isArray(symbols)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: 'Symbols array is required and must not be empty',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateInput',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: { symbols, customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_SYMBOL_FORMAT, reason: 'invalid_symbols_array' },
        retryable: false
      });
    }

    if (symbols.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: 'Symbols array is required and must not be empty',
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateInput',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: { symbolsLength: symbols.length, customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY, reason: 'empty_symbols_array' },
        retryable: false
      });
    }

    // 批量处理限制（防DoS攻击）
    if (symbols.length > CONFIG.MAX_BATCH_SIZE) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Batch size exceeds maximum limit of ${CONFIG.MAX_BATCH_SIZE}`,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'validateInput',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: {
          symbolsLength: symbols.length,
          maxBatchSize: CONFIG.MAX_BATCH_SIZE,
          customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED,
          reason: 'batch_size_exceeded'
        },
        retryable: false
      });
    }

    // 方向验证
    if (!Object.values(MappingDirection).includes(direction)) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Invalid direction: ${direction}. Must be '${MappingDirection.TO_STANDARD}' or '${MappingDirection.FROM_STANDARD}'`,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateInput',
        component: ComponentIdentifier.SYMBOL_TRANSFORMER,
        context: {
          direction,
          validDirections: Object.values(MappingDirection),
          customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_DIRECTION_FORMAT,
          reason: 'invalid_direction_format'
        },
        retryable: false
      });
    }

    // 符号长度验证（防DoS攻击）
    for (const symbol of symbols) {
      if (!symbol || typeof symbol !== "string") {
        throw UniversalExceptionFactory.createBusinessException({
          message: 'All symbols must be non-empty strings',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validateInput',
          component: ComponentIdentifier.SYMBOL_TRANSFORMER,
          context: { symbol, customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_SYMBOL_FORMAT, reason: 'invalid_symbol_format' },
          retryable: false
        });
      }

      if (symbol.length > CONFIG.MAX_SYMBOL_LENGTH) {
        throw UniversalExceptionFactory.createBusinessException({
          message: `Symbol length exceeds maximum limit of ${CONFIG.MAX_SYMBOL_LENGTH}: ${symbol}`,
          errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
          operation: 'validateInput',
          component: ComponentIdentifier.SYMBOL_TRANSFORMER,
          context: {
            symbol,
            symbolLength: symbol.length,
            maxSymbolLength: CONFIG.MAX_SYMBOL_LENGTH,
            customErrorCode: SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_LENGTH_EXCEEDED,
            reason: 'symbol_length_exceeded'
          },
          retryable: false
        });
      }
    }
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

    symbols.forEach((symbol) => {
      if (this.isStandardFormat(symbol)) {
        standardSymbols.push(symbol);
      } else {
        symbolsToTransform.push(symbol);
      }
    });

    return { symbolsToTransform, standardSymbols };
  }

  /**
   * 判断是否为标准格式（使用预编译正则表达式）
   */
  private isStandardFormat(symbol: string): boolean {
    // 输入验证
    if (!symbol || symbol.length > CONFIG.MAX_SYMBOL_LENGTH) {
      return false;
    }

    // 使用预编译正则表达式，性能提升50%+
    return (
      SYMBOL_PATTERNS.CN.test(symbol) ||
      SYMBOL_PATTERNS.US.test(symbol) ||
      SYMBOL_PATTERNS.HK.test(symbol)
    );
  }

  // 市场推断方法已移除（不属于转换核心职责）

  

}
