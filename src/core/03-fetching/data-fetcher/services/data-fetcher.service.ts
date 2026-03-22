import { Injectable, HttpStatus, Optional } from "@nestjs/common";
import { createLogger, sanitizeLogData } from "@common/logging/index";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import type { ICapability } from "@providersv2/providers/interfaces/capability.interface";

import {
  BusinessException,
  UniversalExceptionFactory,
  UniversalRetryHandler,
  ComponentIdentifier,
  BusinessErrorCode
} from "@common/core/exceptions";
import {
  IDataFetcher,
  DataFetchParams,
  RawDataResult,
} from "../interfaces/data-fetcher.interface";
import {
  DataFetchRequestDto,
  DataFetchResponseDto,
  DataFetchMetadataDto,
} from "../dto";
import {
  DATA_FETCHER_ERROR_MESSAGES,
  DATA_FETCHER_WARNING_MESSAGES,
  DATA_FETCHER_PERFORMANCE_THRESHOLDS,
  DATA_FETCHER_OPERATIONS,
  DATA_FETCHER_DEFAULT_CONFIG,
} from "../constants/data-fetcher.constants";
import { DATA_FETCHER_ERROR_CODES } from "../constants/data-fetcher-error-codes.constants";
import { UpstreamRequestSchedulerService } from "./upstream-request-scheduler.service";
import type {
  UpstreamMergeMode,
  UpstreamSymbolExtractor,
} from "../interfaces/upstream-request-task.interface";
import { BasicCacheService } from "@core/05-caching/module/basic-cache";
import { stableStringify } from "../utils/upstream-request-key.util";

/**
 * 原始数据类型定义
 *
 * 标准格式仅接受：
 * - 数组: [...]
 * - 对象: { data: [...] }
 */
interface RawData {
  [key: string]: any;
}

const STREAM_CAPABILITY_NAMES = new Set<string>([
  CAPABILITY_NAMES.STREAM_STOCK_QUOTE.toLowerCase(),
]);

const STALE_FALLBACK_CAPABILITIES = new Set<string>([
  CAPABILITY_NAMES.GET_STOCK_BASIC_INFO.toLowerCase(),
  CAPABILITY_NAMES.GET_TRADING_DAYS.toLowerCase(),
]);

/**
 * processRawData 方法的输入类型联合
 * 标准格式：数组或 { data: [] }
 */
type ProcessRawDataInput = RawData | any[];

/**
 * 数据获取服务
 *
 * 专门负责从第三方SDK获取原始数据，解耦Receiver组件的职责
 * 支持多种数据提供商和能力类型
 */
@Injectable()
export class DataFetcherService implements IDataFetcher {
  private readonly logger = createLogger(DataFetcherService.name);
  private readonly missingCapabilityMetadataWarnings = new Set<string>();

  /**
   * 批处理并发限制数量 - 通过环境变量配置，防止高并发场景资源耗尽
   */
  private readonly BATCH_CONCURRENCY_LIMIT = parseInt(
    process.env.DATA_FETCHER_BATCH_CONCURRENCY || "10",
  );

  private readonly basicInfoStaleTtlSeconds = this.parsePositiveInteger(
    process.env.UPSTREAM_BASIC_INFO_STALE_TTL_SECONDS,
    3600,
  );
  private readonly tradingDaysStaleTtlSeconds = this.parsePositiveInteger(
    process.env.UPSTREAM_TRADING_DAYS_STALE_TTL_SECONDS,
    86400,
  );
  private readonly defaultSchedulerSymbolExtractor: UpstreamSymbolExtractor = (
    row: unknown,
  ): string => {
    if (!row || typeof row !== "object") {
      return "";
    }
    const symbol = (row as Record<string, unknown>).symbol;
    return String(symbol || "").trim().toUpperCase();
  };
  private readonly infowayQuoteSymbolExtractor: UpstreamSymbolExtractor = (
    row: unknown,
  ): string => {
    if (!row || typeof row !== "object") {
      return "";
    }
    const payload = row as Record<string, unknown>;
    const symbol = payload.s ?? payload.symbol;
    return String(symbol || "").trim().toUpperCase();
  };

  constructor(
    private readonly capabilityRegistryService: ProviderRegistryService,
    @Optional() private readonly upstreamRequestScheduler?: UpstreamRequestSchedulerService,
    @Optional() private readonly basicCacheService?: BasicCacheService,
  ) {}

  private normalizeRecord(record: any): any {
    if (!record || typeof record !== "object") {
      return record;
    }

    try {
      if (typeof record.toObject === "function") {
        return record.toObject();
      }
      if (typeof record.toJSON === "function") {
        const jsonValue = record.toJSON();
        if (jsonValue && typeof jsonValue === "object") {
          return jsonValue;
        }
      }
    } catch (error) {
      this.logger.warn("normalizeRecord failure", {
        reason: (error as Error).message,
      });
    }

    return record;
  }

  /**
   * 从第三方SDK获取原始数据
   *
   * @param params 获取参数
   * @returns 原始数据结果
   */
  async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
    const {
      provider,
      capability,
      symbols,
      requestId,
      apiType = DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE,
      options = {},
      contextService,
    } = params;

    try {
      // 1. 验证提供商能力
      await this.checkCapability(provider, capability);
      const normalizedApiType = this.normalizeApiType(apiType);
      const capabilityDefinition = this.capabilityRegistryService.getCapability(
        provider,
        capability,
      );
      this.guardAgainstStreamCapabilityOnRestChain(
        provider,
        capability,
        normalizedApiType,
        requestId,
        capabilityDefinition,
      );

      // 1.1 兜底：若未显式传入 contextService，则尝试从注册表获取
      let ensuredContextService = contextService;
      if (!ensuredContextService) {
        try {
          ensuredContextService = await this.getProviderContext(provider);
        } catch (error) {
          this.logger.debug("getProviderContext unavailable, continue without context", {
            provider,
            reason: (error as Error).message,
          });
          ensuredContextService = undefined;
        }
      }

      // 2. 准备执行参数 - 简化：统一通过options传递，移除重复参数
      // 将 contextService 透传给能力执行（例如 LongPort 能力需要）
      // 注意合并顺序：显式的 contextService 放在最后，避免被 options 覆盖
      const executionParams = {
        symbols,
        requestId,
        ...options,
        apiType: normalizedApiType,
        contextService: ensuredContextService,
      };

      // 3. 执行SDK调用 - 标准化监控：记录外部API调用
      const apiStartTime = Date.now();
      const rawData = await this.executeWithOptionalScheduling({
        provider,
        capability,
        symbols,
        requestId,
        normalizedApiType,
        options,
        executionParams,
      });
      const apiDuration = Date.now() - apiStartTime;

      // 4. 处理原始数据 - 标准化：统一处理不同格式的返回结果
      const processedData = this.processRawData(rawData);

      // 5. 性能监控 - 标准化：统一性能指标收集
      if (apiDuration > DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS) {
        this.logger.warn(
          DATA_FETCHER_WARNING_MESSAGES.SLOW_RESPONSE.replace(
            "{processingTimeMs}",
            apiDuration.toString(),
          ),
          {
            provider,
            capability,
            processingTimeMs: apiDuration,
            symbolsCount: symbols.length,
          },
        );
      }

      await this.cacheStaleResultIfNeeded({
        provider,
        capability,
        apiType: normalizedApiType,
        symbols,
        options,
        data: processedData,
      });

      // 6. 返回标准化结果
      return {
        data: processedData,
        metadata: {
          provider,
          capability,
          processingTimeMs: apiDuration,
          symbolsProcessed: symbols.length,
        },
      };
    } catch (error) {
      const staleFallback = await this.tryResolveStaleFallback({
        provider,
        capability,
        apiType: this.normalizeApiType(apiType),
        symbols,
        options,
        requestId,
        error,
      });
      if (staleFallback) {
        return staleFallback;
      }

      // 错误日志 - 标准化：统一错误日志格式
      this.logger.error(
        `Data fetch failed for ${provider}.${capability}`,
        sanitizeLogData({
          provider,
          capability,
          requestId,
          error: error.message,
          symbolsCount: symbols.length,
          symbols: symbols.slice(0, DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT),
        }),
      );

      // 发送错误事件 - 标准化：统一错误事件格式
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）

      if (error instanceof BusinessException) {
        throw error;
      }

      const upstreamRateLimitStatus = this.resolveUpstreamRateLimitStatus(error);
      if (upstreamRateLimitStatus === HttpStatus.TOO_MANY_REQUESTS) {
        throw UniversalExceptionFactory.createBusinessException({
          message: DATA_FETCHER_ERROR_MESSAGES.DATA_FETCH_FAILED.replace(
            "{error}",
            (error as Error)?.message || "Upstream returned 429",
          ),
          errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED,
          operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
          component: ComponentIdentifier.DATA_FETCHER,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          context: {
            provider,
            capability,
            requestId,
            symbolsCount: symbols.length,
            upstreamStatus: upstreamRateLimitStatus,
          },
        });
      }

      throw UniversalExceptionFactory.createBusinessException({
        message: DATA_FETCHER_ERROR_MESSAGES.DATA_FETCH_FAILED.replace(
          "{error}",
          error.message,
        ),
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
        component: ComponentIdentifier.DATA_FETCHER,
        context: { provider, capability, requestId, symbolsCount: symbols.length },
      });
    }
  }

  /**
   * 检查提供商是否支持指定的能力
   *
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 是否支持
   */
  async supportsCapability(
    provider: string,
    capability: string,
  ): Promise<boolean> {
    try {
      const cap = this.capabilityRegistryService.getCapability(
        provider,
        capability,
      );
      return !!cap;
    } catch {
      return false;
    }
  }

  /**
   * 获取提供商的上下文服务
   *
   * @param provider 提供商名称
   * @returns 上下文服务实例
   */
  async getProviderContext(provider: string): Promise<any> {
    try {
      // Предполагаем, что этот метод существует или будет добавлен
      const contextService = await this.getContextServiceForProvider(provider);

      if (!contextService) {
        throw UniversalExceptionFactory.createBusinessException({
          message: DATA_FETCHER_ERROR_MESSAGES.CONTEXT_SERVICE_NOT_AVAILABLE.replace(
            "{provider}",
            provider,
          ),
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT,
          component: ComponentIdentifier.DATA_FETCHER,
          context: { provider },
        });
      }

      return contextService;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      
      throw UniversalExceptionFactory.createFromError(
        error,
        DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT,
        ComponentIdentifier.DATA_FETCHER,
        { provider }
      );
    }
  }

  /**
   * 获取批量处理并发限制 - 带边界检查
   *
   * @returns 合理范围内的并发限制数量 (1-50)
   */
  private getBatchConcurrencyLimit(): number {
    const limit = this.BATCH_CONCURRENCY_LIMIT;
    // 限制在合理范围内：1-50
    return Math.max(1, Math.min(limit, 50));
  }

  /**
   * 批量获取数据 (为未来扩展预留)
   *
   * @param requests 批量请求
   * @returns 批量结果
   */
  async fetchBatch(
    requests: DataFetchRequestDto[],
  ): Promise<DataFetchResponseDto[]> {
    const results: DataFetchResponseDto[] = [];

    // 获取动态并发限制
    const concurrencyLimit = this.getBatchConcurrencyLimit();

    this.logger.debug("开始批量数据获取", {
      totalRequests: requests.length,
      concurrencyLimit,
      rawLimit: this.BATCH_CONCURRENCY_LIMIT,
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
    });

    // 分批处理，控制并发数量
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);

      this.logger.debug("处理批次", {
        batchIndex: Math.floor(i / concurrencyLimit) + 1,
        batchSize: batch.length,
        concurrencyLimit,
        operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      });

      const batchResults = await Promise.allSettled(
        batch.map(async (request) => this.processSingleRequest(request)),
      );

      // 转换结果
      const processedResults = batchResults.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : this.createErrorResponse(result.reason),
      );

      results.push(...processedResults);
    }

    // 💡 批量操作的系统级监控由 src/monitoring/ 全局监控组件统一处理
    // 📁 复用现有监控组件，不得新建系统级监控功能
    // 🎯 此处保留业务级监控指标即可

    // 记录批量处理详细指标 - 事件驱动方式
    setImmediate(() => {
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });

    this.logger.debug("批量数据获取完成", {
      totalRequests: requests.length,
      successCount: results.filter((r) => !r.hasPartialFailures).length,
      partialFailuresCount: results.filter((r) => r.hasPartialFailures).length,
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
    });

    return results;
  }

  /**
   * 处理单个批量请求
   *
   * @param request 单个请求
   * @returns 处理结果
   */
  private async processSingleRequest(
    request: DataFetchRequestDto,
  ): Promise<DataFetchResponseDto> {
    try {
      const params: DataFetchParams = {
        provider: request.provider,
        capability: request.capability,
        symbols: request.symbols,
        requestId: request.requestId,
        apiType: request.apiType,
        options: request.options,
        contextService: await this.getProviderContext(request.provider),
      };

      const result = await UniversalRetryHandler.standardRetry(
        async () => await this.fetchRawData(params),
        DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
        ComponentIdentifier.DATA_FETCHER
      );

      return DataFetchResponseDto.success(
        result.data,
        result.metadata.provider,
        result.metadata.capability,
        result.metadata.processingTimeMs,
        result.metadata.symbolsProcessed,
      );
    } catch (error) {
      // 统一异常处理：将异常转换为错误响应
      this.logger.error("Single request failed", {
        provider: request.provider,
        capability: request.capability,
        requestId: request.requestId,
        error: error instanceof BusinessException ? error.getDetailedInfo() : error.message,
        operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      });

      throw error; // 让上层Promise.allSettled处理
    }
  }

  private async executeWithOptionalScheduling(params: {
    provider: string;
    capability: string;
    symbols: string[];
    requestId?: string;
    normalizedApiType: "rest" | "stream";
    options: Record<string, any>;
    executionParams: Record<string, any>;
  }): Promise<any> {
    const {
      provider,
      capability,
      symbols,
      requestId,
      normalizedApiType,
      options,
      executionParams,
    } = params;

    const execute = async (symbolsOverride: string[]): Promise<any> =>
      await this.executeCapability(provider, capability, {
        ...executionParams,
        symbols: symbolsOverride,
      });
    const symbolExtractor = this.resolveSchedulerSymbolExtractor(provider, capability);
    const mergeMode = this.resolveSchedulerMergeMode(provider, capability);

    if (
      !this.upstreamRequestScheduler ||
      !this.upstreamRequestScheduler.shouldSchedule(
        provider,
        capability,
        normalizedApiType,
      )
    ) {
      if (
        this.upstreamRequestScheduler &&
        normalizedApiType === "rest" &&
        !this.upstreamRequestScheduler.isAllowlisted(provider, capability)
      ) {
        this.logger.debug("回源请求未进入上游调度器（allowlist 未命中）", {
          provider,
          capability,
          requestId,
          symbolsCount: symbols.length,
        });
      }
      return await execute(symbols);
    }

    return await this.upstreamRequestScheduler.schedule({
      provider,
      capability,
      symbols,
      requestId,
      options,
      execute,
      mergeMode,
      symbolExtractor,
    });
  }

  private resolveSchedulerSymbolExtractor(
    provider: string,
    capability: string,
  ): UpstreamSymbolExtractor {
    const providerKey = String(provider || "").trim().toLowerCase();
    const capabilityKey = String(capability || "").trim().toLowerCase();

    if (
      providerKey === "infoway" &&
      (capabilityKey === CAPABILITY_NAMES.GET_STOCK_QUOTE.toLowerCase() ||
        capabilityKey === CAPABILITY_NAMES.GET_CRYPTO_QUOTE.toLowerCase())
    ) {
      return this.infowayQuoteSymbolExtractor;
    }
    return this.defaultSchedulerSymbolExtractor;
  }

  private resolveSchedulerMergeMode(
    provider: string,
    capability: string,
  ): UpstreamMergeMode {
    const providerKey = String(provider || "").trim().toLowerCase();
    const capabilityKey = String(capability || "").trim().toLowerCase();
    if (
      providerKey === "infoway" &&
      (capabilityKey === CAPABILITY_NAMES.GET_STOCK_HISTORY.toLowerCase() ||
        capabilityKey === CAPABILITY_NAMES.GET_CRYPTO_HISTORY.toLowerCase())
    ) {
      return "single_symbol_only";
    }
    return "merge_by_request_signature";
  }

  /**
   * 获取能力实例
   *
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 能力实例
   * @throws NotFoundException 当能力不存在时
   */
  private async checkCapability(provider: string, capability: string): Promise<void> {
    try {
      // Предполагаем, что этот метод существует или будет добавлен
      const hasCapability = await this.hasCapability(provider, capability);

      if (!hasCapability) {
        throw UniversalExceptionFactory.createBusinessException({
          message: DATA_FETCHER_ERROR_MESSAGES.CAPABILITY_NOT_SUPPORTED.replace(
            "{provider}",
            provider,
          ).replace("{capability}", capability),
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: DATA_FETCHER_OPERATIONS.CHECK_CAPABILITY,
          component: ComponentIdentifier.DATA_FETCHER,
          context: { provider, capability },
        });
      }
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      
      throw UniversalExceptionFactory.createFromError(
        error,
        DATA_FETCHER_OPERATIONS.CHECK_CAPABILITY,
        ComponentIdentifier.DATA_FETCHER,
        { provider, capability }
      );
    }
  }

  /**
   * 处理原始数据格式 - 仅接受标准格式
   *
   * 标准格式：
   * 1. 数组：[{...}]
   * 2. 对象：{ data: [...] }
   *
   * @param rawData SDK返回的任意格式原始数据
   * @returns 标准化的数据数组，供后续组件统一处理
   */
  private processRawData(rawData: ProcessRawDataInput): any[] {
    if (Array.isArray(rawData)) {
      return rawData.map((item) => this.normalizeRecord(item));
    }

    if (rawData && typeof rawData === "object") {
      const data = (rawData as RawData).data;
      if (Array.isArray(data)) {
        return data.map((item) => this.normalizeRecord(item));
      }
    }

    const receivedType = rawData === null ? "null" : typeof rawData;
    const receivedKeys =
      rawData && typeof rawData === "object" ? Object.keys(rawData) : [];

    throw UniversalExceptionFactory.createBusinessException({
      message: "原始数据格式非法，仅接受数组或 { data: [] } 标准格式。",
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      component: ComponentIdentifier.DATA_FETCHER,
      context: {
        receivedType,
        receivedKeys,
      },
    });
  }


  private async cacheStaleResultIfNeeded(params: {
    provider: string;
    capability: string;
    apiType: "rest" | "stream";
    symbols: string[];
    options: Record<string, any>;
    data: any[];
  }): Promise<void> {
    if (!this.shouldUseStaleFallback(params.provider, params.capability, params.apiType)) {
      return;
    }

    if (!this.basicCacheService || !Array.isArray(params.data) || params.data.length === 0) {
      return;
    }

    const cacheKey = this.buildStaleCacheKey(
      params.provider,
      params.capability,
      params.symbols,
      params.options,
    );

    await this.basicCacheService.set(
      cacheKey,
      {
        data: params.data,
        updatedAt: new Date().toISOString(),
      },
      { ttlSeconds: this.resolveStaleTtlSeconds(params.capability) },
    );
  }

  private async tryResolveStaleFallback(params: {
    provider: string;
    capability: string;
    apiType: "rest" | "stream";
    symbols: string[];
    options: Record<string, any>;
    requestId?: string;
    error: unknown;
  }): Promise<RawDataResult | null> {
    if (!this.shouldUseStaleFallback(params.provider, params.capability, params.apiType)) {
      return null;
    }

    if (!this.basicCacheService) {
      return null;
    }

    const cacheKey = this.buildStaleCacheKey(
      params.provider,
      params.capability,
      params.symbols,
      params.options,
    );

    const cached = await this.basicCacheService.get<{
      data?: any[];
      updatedAt?: string;
    }>(cacheKey);

    if (!cached?.data || !Array.isArray(cached.data) || cached.data.length === 0) {
      return null;
    }

    this.logger.warn("Data fetch stale fallback hit", {
      provider: params.provider,
      capability: params.capability,
      requestId: params.requestId,
      symbolsCount: params.symbols.length,
      staleUpdatedAt: cached.updatedAt,
      reason: (params.error as Error)?.message || String(params.error),
    });

    return {
      data: cached.data,
      metadata: {
        provider: params.provider,
        capability: params.capability,
        processingTimeMs: 0,
        symbolsProcessed: params.symbols.length,
        errors: ["STALE_FALLBACK_HIT"],
      },
    };
  }

  private shouldUseStaleFallback(
    provider: string,
    capability: string,
    apiType: "rest" | "stream",
  ): boolean {
    return (
      apiType === "rest" &&
      String(provider || "").trim().toLowerCase() === "infoway" &&
      STALE_FALLBACK_CAPABILITIES.has(String(capability || "").trim().toLowerCase())
    );
  }

  private buildStaleCacheKey(
    provider: string,
    capability: string,
    symbols: string[],
    options: Record<string, any>,
  ): string {
    return `upstream-stale:${String(provider || "").trim().toLowerCase()}:${String(capability || "").trim().toLowerCase()}:${stableStringify({
      market: String(options?.market || "").trim().toUpperCase(),
      beginDay: String(options?.beginDay || "").trim(),
      endDay: String(options?.endDay || "").trim(),
      symbols: (symbols || [])
        .map((symbol) => String(symbol || "").trim().toUpperCase())
        .filter(Boolean)
        .sort(),
    })}`;
  }

  private resolveStaleTtlSeconds(capability: string): number {
    const normalizedCapability = String(capability || "").trim().toLowerCase();
    if (normalizedCapability === CAPABILITY_NAMES.GET_TRADING_DAYS.toLowerCase()) {
      return this.tradingDaysStaleTtlSeconds;
    }
    return this.basicInfoStaleTtlSeconds;
  }

  private parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private resolveUpstreamRateLimitStatus(error: unknown): number | null {
    const anyError = error as {
      status?: number;
      statusCode?: number;
      response?: { status?: number };
      getStatus?: () => number;
      message?: string;
    };

    const statusCandidates = [
      anyError?.status,
      anyError?.statusCode,
      anyError?.response?.status,
      typeof anyError?.getStatus === "function" ? anyError.getStatus() : undefined,
    ];
    const resolvedStatus = statusCandidates.find((status) =>
      Number.isFinite(status),
    );
    if (resolvedStatus === HttpStatus.TOO_MANY_REQUESTS) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }

    const message = String(anyError?.message || "").toLowerCase();
    if (message.includes("429") || message.includes("too many requests")) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }

    return null;
  }

  /**
   * 创建错误响应
   *
   * @param error 错误信息
   * @returns 错误响应DTO
   */
  private createErrorResponse(error: any): DataFetchResponseDto {
    const metadata = new DataFetchMetadataDto(
      "unknown",
      "unknown",
      0,
      0,
      [],
      [error.message || "未知错误"],
    );

    return new DataFetchResponseDto([], metadata, false);
  }

  /**
   * Вспомогательный метод для получения контекстного сервиса провайдера
   */
  private async getContextServiceForProvider(provider: string): Promise<any> {
    // Реализация метода для работы с EnhancedCapabilityRegistryService
    const providerInstance = this.capabilityRegistryService.getProvider(provider);
    
    if (!providerInstance) {
      return null;
    }
    
    if (typeof providerInstance.getContextService !== "function") {
      return null;
    }
    
    return await providerInstance.getContextService();
  }

  /**
   * Вспомогательный метод для выполнения возможности
   */
  private async executeCapability(
    provider: string, 
    capability: string, 
    params: any
  ): Promise<any> {
    const cap = this.capabilityRegistryService.getCapability(provider, capability);
    if (!cap) {
      throw UniversalExceptionFactory.createBusinessException({
        message: DATA_FETCHER_ERROR_MESSAGES.CAPABILITY_NOT_SUPPORTED.replace(
          "{provider}",
          provider,
        ).replace("{capability}", capability),
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: DATA_FETCHER_OPERATIONS.CHECK_CAPABILITY,
        component: ComponentIdentifier.DATA_FETCHER,
        context: { provider, capability },
      });
    }
    if (typeof cap.execute !== 'function') {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Capability ${provider}.${capability} does not have execute method`,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        operation: DATA_FETCHER_OPERATIONS.CHECK_CAPABILITY,
        component: ComponentIdentifier.DATA_FETCHER,
        context: { provider, capability },
      });
    }
    return await cap.execute(params);
  }

  /**
   * Вспомогательный метод для проверки наличия возможности
   */
  private async hasCapability(provider: string, capability: string): Promise<boolean> {
    const cap = this.capabilityRegistryService.getCapability(provider, capability);
    return !!cap;
  }

  private guardAgainstStreamCapabilityOnRestChain(
    provider: string,
    capability: string,
    apiType: string,
    requestId?: string,
    capabilityDefinition?: ICapability | null,
  ): void {
    const normalizedApiType = this.normalizeApiType(apiType);
    const isStreamCapability = this.isStreamCapability(
      provider,
      capability,
      capabilityDefinition,
    );
    const isRestChain = normalizedApiType !== "stream";

    if (!isStreamCapability || !isRestChain) {
      return;
    }

    const misuseContext = {
      provider,
      capability,
      apiType,
      requestId,
      expectedApiType: "stream",
      guide: "use-stream-receiver-subscribe-flow",
    };

    this.logger.warn("Blocked stream capability misuse on REST chain", {
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      ...misuseContext,
    });

    throw UniversalExceptionFactory.createBusinessException({
      message: `能力 ${capability} 属于实时流能力，不能通过 REST 执行链调用。请改用 StreamReceiver/StreamDataFetcher 订阅链路。`,
      errorCode: BusinessErrorCode.INVALID_OPERATION,
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      component: ComponentIdentifier.DATA_FETCHER,
      context: misuseContext,
    });
  }

  private isStreamCapability(
    provider: string,
    capability: string,
    capabilityDefinition?: ICapability | null,
  ): boolean {
    const streamCapabilityFromMetadata =
      this.resolveStreamCapabilityFromMetadata(capabilityDefinition);
    if (streamCapabilityFromMetadata !== null) {
      return streamCapabilityFromMetadata;
    }

    const normalizedCapability = String(capability || "").trim().toLowerCase();
    const isStreamFromFallback = STREAM_CAPABILITY_NAMES.has(normalizedCapability);
    if (isStreamFromFallback) {
      this.warnMissingCapabilityMetadata(provider, capability);
    }
    return isStreamFromFallback;
  }

  private warnMissingCapabilityMetadata(provider: string, capability: string): void {
    const warningKey = `${provider}:${capability}`.toLowerCase();
    if (this.missingCapabilityMetadataWarnings.has(warningKey)) {
      return;
    }
    this.missingCapabilityMetadataWarnings.add(warningKey);
    this.logger.warn("Capability metadata missing transport/apiType, fallback to stream name set", {
      provider,
      capability,
      fallback: "STREAM_CAPABILITY_NAMES",
    });
  }

  private resolveStreamCapabilityFromMetadata(
    capabilityDefinition?: ICapability | null,
  ): boolean | null {
    if (!capabilityDefinition) {
      return null;
    }

    const normalizedTransport = String(capabilityDefinition.transport || "")
      .trim()
      .toLowerCase();
    if (normalizedTransport === "stream" || normalizedTransport === "websocket") {
      return true;
    }
    if (normalizedTransport === "rest") {
      return false;
    }

    if (capabilityDefinition.apiType) {
      return this.normalizeApiType(capabilityDefinition.apiType) === "stream";
    }

    return null;
  }

  private normalizeApiType(apiType?: string): "rest" | "stream" {
    const normalizedApiType = String(
      apiType || DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE,
    )
      .trim()
      .toLowerCase();
    return normalizedApiType === "stream" ? "stream" : "rest";
  }
}
