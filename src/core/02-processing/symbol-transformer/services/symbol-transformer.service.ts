import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";;
import { SymbolMapperCacheService } from "../../../05-caching/symbol-mapper-cache/services/symbol-mapper-cache.service";
import { MappingDirection } from "../../../05-caching/symbol-mapper-cache/constants/cache.constants";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import {
  SymbolTransformResult,
  SymbolTransformForProviderResult,
} from "../interfaces";
import {
  SYMBOL_PATTERNS,
  CONFIG,
  MARKET_TYPES,
  TRANSFORM_DIRECTIONS,
  MONITORING_CONFIG,
} from "../constants/symbol-transformer-enhanced.constants";
import { RequestIdUtils } from "../utils/request-id.utils";

/**
 * Symbol Transformer Service
 * 专门处理符号转换执行逻辑，从 SymbolMapperService 迁移
 * 职责：符号转换执行，不处理规则管理
 */
@Injectable()
export class SymbolTransformerService {
  private readonly logger = createLogger("SymbolTransformer");

  constructor(
    private readonly symbolMapperCacheService: SymbolMapperCacheService, // 缓存服务（含回源逻辑）
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控（零耦合）
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
          processingTimeMs: processingTime, // 注意：使用 processingTimeMs
        },
      };

      // ✅ 事件驱动监控：异步、解耦、高性能
      this.emitMonitoringEvent("symbol_transformation_completed", {
        provider,
        direction,
        duration: processingTime,
        totalSymbols: symbolArray.length,
        successCount: response.metadata.successCount,
        failedCount: response.metadata.failedCount,
        successRate:
          (response.metadata.successCount / symbolArray.length) * 100,
        market: this.inferMarketFromSymbols(symbolArray),
      });

      this.logger.debug("符号转换完成", {
        requestId,
        ...response.metadata,
      });

      return response;
    } catch (error) {
      const processingTime = Number(process.hrtime.bigint() - startTime) / 1e6;

      // ✅ 事件驱动错误监控
      this.emitMonitoringEvent("symbol_transformation_failed", {
        provider,
        direction,
        duration: processingTime,
        totalSymbols: symbolArray.length,
        error: error.message,
        errorType: error.constructor.name,
      });

      this.logger.error("符号转换失败", {
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
          successfulTransformations: Object.keys(
            mappingResult.transformedSymbols,
          ).length,
          failedTransformations: mappingResult.failedSymbols.length,
          processingTime: processingTime, // 注意：这里使用 processingTime（不带Ms）
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
   * 向后兼容的方法名 - mapSymbols
   */
  async mapSymbols(provider: string, symbols: string | string[]) {
    return await this.transformSymbols(provider, symbols, MappingDirection.TO_STANDARD);
  }

  /**
   * 向后兼容的方法名 - mapSymbol
   */
  async mapSymbol(provider: string, symbol: string) {
    return await this.transformSingleSymbol(provider, symbol, MappingDirection.TO_STANDARD);
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
      throw new Error("Provider is required and must be a non-empty string");
    }

    // 符号数组验证 - 首先检查null/undefined
    if (!symbols || !Array.isArray(symbols)) {
      throw new Error("Symbols array is required and must not be empty");
    }

    if (symbols.length === 0) {
      throw new Error("Symbols array is required and must not be empty");
    }

    // 批量处理限制（防DoS攻击）
    if (symbols.length > CONFIG.MAX_BATCH_SIZE) {
      throw new Error(
        `Batch size exceeds maximum limit of ${CONFIG.MAX_BATCH_SIZE}`,
      );
    }

    // 方向验证
    if (!Object.values(TRANSFORM_DIRECTIONS).includes(direction)) {
      throw new Error(
        `Invalid direction: ${direction}. Must be '${TRANSFORM_DIRECTIONS.TO_STANDARD}' or '${TRANSFORM_DIRECTIONS.FROM_STANDARD}'`,
      );
    }

    // 符号长度验证（防DoS攻击）
    for (const symbol of symbols) {
      if (!symbol || typeof symbol !== "string") {
        throw new Error("All symbols must be non-empty strings");
      }

      if (symbol.length > CONFIG.MAX_SYMBOL_LENGTH) {
        throw new Error(
          `Symbol length exceeds maximum limit of ${CONFIG.MAX_SYMBOL_LENGTH}: ${symbol}`,
        );
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

  /**
   * 推断市场类型（使用预编译正则表达式）
   */
  private inferMarketFromSymbols(symbols: string[]): string {
    if (symbols.length === 0) return MARKET_TYPES.UNKNOWN;

    const sample = symbols[0];

    // 使用预编译正则表达式
    if (SYMBOL_PATTERNS.CN.test(sample)) return MARKET_TYPES.CN; // A股
    if (SYMBOL_PATTERNS.US.test(sample)) return MARKET_TYPES.US; // 美股
    if (SYMBOL_PATTERNS.HK.test(sample)) return MARKET_TYPES.HK; // 港股

    return MARKET_TYPES.MIXED;
  }

  /**
   * ✅ 事件驱动监控 - 零耦合异步发送
   */
  private emitMonitoringEvent(metricName: string, data: any) {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "symbol_transformer",
        metricType: "business",
        metricName,
        metricValue: data.duration || data.symbolCount || 1,
        tags: {
          operation: "symbol-transformation",
          provider: data.provider,
          direction: data.direction,
          totalSymbols: data.totalSymbols,
          successCount: data.successCount,
          failedCount: data.failedCount,
          successRate: data.successRate,
          market: data.market,
          status: metricName.includes("failed") ? "error" : "success",
          // 添加更多业务上下文标签
          ...(data.error && { error_message: data.error }),
          ...(data.errorType && { error_type: data.errorType }),
        },
      });
    });
  }
}
