import crypto from "crypto";
import { Market } from "../../../../shared/constants/market.constants";
import {
  CacheStrategy,
  CacheOrchestratorRequest,
} from "../interfaces/smart-cache-orchestrator.interface";
import {
  MarketDetectOptions,
  SymbolValidationUtils,
} from "@common/utils/symbol-validation.util";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { SMART_CACHE_ERROR_CODES } from '../constants/smart-cache-error-codes.constants';

/**
 * 智能缓存编排器请求构建工具
 * 提供统一的请求构建、缓存键生成和符号哈希功能
 */

/**
 * 构建智能缓存编排器请求
 * @param options 请求构建选项
 * @returns 标准化的编排器请求对象
 */
let defaultMarketInferenceService: MarketInferenceService | undefined;

export function setDefaultMarketInferenceService(
  service: MarketInferenceService | null,
): void {
  defaultMarketInferenceService = service ?? undefined;
}

export function buildCacheOrchestratorRequest<T>(options: {
  symbols: string[];
  receiverType: string;
  provider: string;
  queryId: string;
  marketStatus: Record<string, any>;
  strategy: CacheStrategy;
  executeOriginalDataFlow: () => Promise<T>;
}): CacheOrchestratorRequest<T> {
  // 构建缓存键
  const cacheKey = buildUnifiedCacheKey(
    `receiver:${options.receiverType}`,
    options.symbols,
    { provider: options.provider },
  );

  return {
    cacheKey,
    strategy: options.strategy,
    symbols: options.symbols,
    fetchFn: options.executeOriginalDataFlow,
    metadata: {
      marketStatus: options.marketStatus,
      provider: options.provider,
      receiverType: options.receiverType,
      queryId: options.queryId,
    },
  };
}

/**
 * 构建统一缓存键
 * @param prefix 键前缀
 * @param symbols 符号列表
 * @param additionalParams 额外参数
 * @returns 统一格式的缓存键
 */
export function buildUnifiedCacheKey(
  prefix: string,
  symbols: string[],
  additionalParams?: Record<string, any>,
): string {
  // 验证输入参数
  if (!prefix || prefix.trim() === "") {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'buildUnifiedCacheKey',
      message: 'Cache key prefix cannot be empty',
      context: { prefix, errorType: SMART_CACHE_ERROR_CODES.MISSING_CACHE_KEY_PREFIX }
    });
  }

  if (!symbols || symbols.length === 0) {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'buildUnifiedCacheKey',
      message: 'Symbols list cannot be empty',
      context: { symbols, errorType: SMART_CACHE_ERROR_CODES.EMPTY_SYMBOLS_LIST }
    });
  }

  const keyParts: string[] = [prefix];

  // 处理符号列表
  if (symbols.length === 1) {
    // 单个符号直接使用
    keyParts.push(symbols[0]);
  } else if (symbols.length <= 5) {
    // 少量符号直接拼接
    keyParts.push(symbols.sort().join("|"));
  } else {
    // 大量符号使用哈希
    const symbolsHash = createStableSymbolsHash(symbols);
    keyParts.push(`hash:${symbolsHash}`);
  }

  // 处理额外参数
  if (additionalParams && Object.keys(additionalParams).length > 0) {
    const paramEntries = Object.entries(additionalParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join("|");
    keyParts.push(paramEntries);
  }

  return keyParts.join(":");
}

/**
 * 创建稳定的符号哈希
 * 使用Node.js crypto模块的SHA-1算法，确保零额外依赖
 * @param symbols 符号列表
 * @returns SHA-1哈希值（前16位）
 */
export function createStableSymbolsHash(symbols: string[]): string {
  // 验证crypto模块可用性
  if (!crypto || typeof crypto.createHash !== "function") {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.ENVIRONMENT_ERROR,
      operation: 'createStableSymbolsHash',
      message: 'Node.js crypto module is unavailable',
      context: {
        cryptoAvailable: !!crypto,
        createHashAvailable: !!(crypto && crypto.createHash),
        errorType: SMART_CACHE_ERROR_CODES.CRYPTO_MODULE_UNAVAILABLE
      }
    });
  }

  if (!symbols || symbols.length === 0) {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'createStableSymbolsHash',
      message: 'Symbols list cannot be empty',
      context: { symbols, errorType: SMART_CACHE_ERROR_CODES.EMPTY_SYMBOLS_LIST }
    });
  }

  // 标准化符号列表：排序并去重
  const normalizedSymbols = [...new Set(symbols)]
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol.length > 0)
    .sort();

  if (normalizedSymbols.length === 0) {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.SMART_CACHE,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: 'createStableSymbolsHash',
      message: 'Valid symbols list cannot be empty after normalization',
      context: {
        originalSymbols: symbols,
        normalizedSymbols,
        errorType: SMART_CACHE_ERROR_CODES.EMPTY_VALID_SYMBOLS
      }
    });
  }

  // 使用SHA-1哈希算法
  const hash = crypto
    .createHash("sha1")
    .update(normalizedSymbols.join("|"), "utf8")
    .digest("hex");

  // 返回前16位，减少键长度但保持足够的碰撞安全性
  return hash.substring(0, 16);
}

/**
 * 从符号列表推断市场
 * 迁移自ReceiverService.extractMarketFromSymbols，确保逻辑一致性
 * @param symbols 符号列表
 * @returns 推断的市场字符串
 */
export function extractMarketFromSymbols(symbols: string[]): string {
  if (!symbols || symbols.length === 0) {
    return "UNKNOWN";
  }

  // 取第一个符号的市场后缀作为主要市场
  const firstSymbol = symbols[0];
  if (firstSymbol.includes(".HK")) return "HK";
  if (firstSymbol.includes(".US")) return "US";
  if (firstSymbol.includes(".SZ")) return "SZ";
  if (firstSymbol.includes(".SH")) return "SH";

  // 如果没有后缀，尝试根据格式推断
  if (/^\d{5,6}$/.test(firstSymbol)) {
    return firstSymbol.startsWith("00") || firstSymbol.startsWith("30")
      ? "SZ"
      : "SH";
  }

  // 纯字母判断为美股
  if (/^[A-Z]+$/.test(firstSymbol.toUpperCase())) {
    return "US";
  }

  return "UNKNOWN";
}

/**
 * 从单个符号推断市场
 * 迁移自ReceiverService.inferMarketFromSymbol，保持完全一致
 * @param symbol 股票符号
 * @returns 推断的市场枚举
 */

export function inferMarketFromSymbol(
  symbol: string,
  options?: MarketDetectOptions,
): (typeof Market)[keyof typeof Market] {
    if (defaultMarketInferenceService) {
      return defaultMarketInferenceService.inferMarket(symbol, options);
    }

    return (
      SymbolValidationUtils.getMarketFromSymbol(symbol, options) ?? Market.US
    );
}

/**
 * 验证缓存键格式
 * @param cacheKey 缓存键
 * @returns 是否有效
 */
export function validateCacheKey(cacheKey: string): boolean {
  if (!cacheKey || typeof cacheKey !== "string") {
    return false;
  }

  // 检查基本格式：至少包含前缀和内容
  const parts = cacheKey.split(":");
  if (parts.length < 2) {
    return false;
  }

  // 检查每个部分都不为空
  return parts.every((part) => part.trim().length > 0);
}
