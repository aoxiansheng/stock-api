import { API_OPERATIONS } from "@common/constants/domain";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

import { createLogger, sanitizeLogData } from "@common/logging/index";
import { NUMERIC_CONSTANTS } from "@common/constants/core";
import { SMART_CACHE_CONSTANTS } from "../../../05-caching/module/smart-cache/constants/smart-cache.constants";
// import { MarketStatus } from "../../../../../../../src/common/constants/domain/market-domain.constants";
// Market enum is now provided by cache-request.utils via the new four-layer architecture

import { Market } from "../../../shared/constants/market.constants";

import { RequestContext } from "../interfaces/request-context.interface";

import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { PROVIDER_IDS } from "@providersv2/provider-id.constants";
import {
  MarketStatusService,
  // MarketStatusResult,
} from "../../../shared/services/market-status.service";
import { SymbolTransformerService } from "../../../02-processing/symbol-transformer/services/symbol-transformer.service";
import { SymbolTransformForProviderResult } from "../../../02-processing/symbol-transformer/interfaces/symbol-transform-result.interface";
import { SmartCacheStandardizedService } from "../../../05-caching/module/smart-cache/services/smart-cache-standardized.service";
import { CacheStrategy } from "../../../05-caching/module/smart-cache/services/smart-cache-standardized.service";
import { buildCacheOrchestratorRequest } from "../../../05-caching/module/smart-cache/utils/smart-cache-request.utils";
import { DataFetcherService } from "../../../03-fetching/data-fetcher/services/data-fetcher.service"; // 🔥 新增DataFetcher导入
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { StorageService } from "../../../04-storage/storage/services/storage.service";
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
} from "../constants/messages.constants";
import {
  RECEIVER_OPERATIONS,
  SUPPORTED_CAPABILITY_TYPES,
  assertReceiverCapabilityWhitelistSync,
} from "../constants/operations.constants";
import { DataRequestDto } from "../dto/data-request.dto";
import {
  DataResponseDto,
  ResponseMetadataDto,
  FailureDetailDto,
} from "../dto/data-response.dto";
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import { StoreDataDto } from "../../../04-storage/storage/dto/storage-request.dto";
import { StorageType } from "../../../04-storage/storage/enums/storage-type.enum";
import { StorageClassification } from "../../../shared/types/storage-classification.enum";
import { FIELD_MAPPING_CONFIG } from "../../../shared/types/field-naming.types";
import { ValidationResultDto } from "../dto/validation.dto";
import { DataFetchParams } from "../../../03-fetching/data-fetcher/interfaces/data-fetcher.interface"; // 🔥 导入DataFetcher类型
import {
  resolveMarketTypeFromSymbols,
  MarketTypeContext,
} from "@core/shared/utils/market-type.util";
import { validateYmdDateRange } from "@core/shared/utils/ymd-date.util";

const TRADING_DAYS_MIN_YMD = "19000101";
const TRADING_DAYS_MAX_YMD = "20991231";
const TRADING_DAYS_MAX_SPAN_DAYS = 366;
const CANONICAL_PROVIDER_HINT = [...Object.values(PROVIDER_IDS)]
  .sort((a, b) => a.localeCompare(b))
  .join(", ");
// 🎯 复用 common 模块的日志配置
// 🎯 复用 common 模块的数据接收常量

/**
 * 数据接收服务
 *
 * 负责处理客户端的数据请求，包括：
 * 1. 请求参数验证
 * 2. 数据提供商选择
 * 3. 股票代码转换
 * 4. 能力调用执行
 * 5. 响应数据格式化
 */

@Injectable()
export class ReceiverService implements OnModuleInit, OnModuleDestroy {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(ReceiverService.name);
  private activeConnections = 0;
  private isDestroyed = false;

  // 🎯 使用 common 模块的常量，无需重复定义

  constructor(
    // 🔄 数据处理核心依赖
    private readonly symbolTransformerService: SymbolTransformerService, // 🆕 新增SymbolTransformer依赖
    private readonly dataFetcherService: DataFetcherService, // 🔥 新增DataFetcher依赖
    private readonly dataTransformerService: DataTransformerService,
    private readonly storageService: StorageService,

    // 🎯 服务注册与状态依赖
    private readonly capabilityRegistryService: ProviderRegistryService,
    private readonly marketStatusService: MarketStatusService,
    private readonly marketInferenceService: MarketInferenceService,
    private readonly smartCacheOrchestrator: SmartCacheStandardizedService, // 🔑 关键: 注入智能缓存编排器
  ) {}

  async onModuleInit(): Promise<void> {
    await this.capabilityRegistryService.onModuleInit();

    const activeCapabilities = this.collectActiveProviderCapabilityNames();
    assertReceiverCapabilityWhitelistSync(
      SUPPORTED_CAPABILITY_TYPES,
      activeCapabilities,
    );

    this.logger.log("Receiver 能力白名单与 Provider 能力集合一致性校验通过", {
      whitelistSize: SUPPORTED_CAPABILITY_TYPES.length,
      activeCapabilitySize: activeCapabilities.length,
    });
  }

  private collectActiveProviderCapabilityNames(): string[] {
    const allCapabilities = this.capabilityRegistryService.getAllCapabilities();
    const activeCapabilityNames: string[] = [];

    for (const providerCapabilities of allCapabilities.values()) {
      for (const [capabilityName, capabilityMeta] of providerCapabilities.entries()) {
        if (capabilityMeta?.isEnabled === false) {
          continue;
        }

        const actualCapabilityName = capabilityMeta?.capability?.name;
        activeCapabilityNames.push(
          String(actualCapabilityName || capabilityName),
        );
      }
    }

    return activeCapabilityNames;
  }

  /**
   * 处理数据请求的主入口方法 - 强时效接口
   * 🚀 1秒级缓存策略，面向实时交易场景
   *
   * @param request 数据请求DTO
   * @returns 格式化的数据响应
   */
  async handleRequest(request: DataRequestDto): Promise<DataResponseDto> {
    const startTime = Date.now();
    const requestId = uuidv4();

    // ✅ 记录连接开始
    this.updateActiveConnections(1);

    // 🎯 使用 common 模块的日志脱敏功能
    this.logger.log(
      `开始处理强时效数据请求`,
      sanitizeLogData({
        requestId,
        symbols: request.symbols?.slice(0, NUMERIC_CONSTANTS.N_3),
        receiverType: request.receiverType,
        symbolsCount: request.symbols?.length || 0,
        operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
      }),
    );

    try {
      // 1. 验证请求参数
      await this.validateRequest(request, requestId);

      const marketContext = this.getMarketContext(request.symbols);

      // 2. 确定数据提供商
      const provider = await this.determineOptimalProvider(
        request.symbols,
        request.receiverType,
        request.options?.preferredProvider,
        request.options?.market ?? marketContext.primaryMarket,
        requestId,
        marketContext,
      );

      // 3. 🔑 智能缓存编排器集成 - 强时效缓存策略
      const useSmartCache = request.options?.useSmartCache !== false; // 默认启用
      if (useSmartCache) {
        // 获取市场状态用于缓存策略决策
        const markets =
          marketContext.markets.length > 0
            ? marketContext.markets.map((market) => market as Market)
            : [
                ...new Set(
                  request.symbols.map((symbol) =>
                    this.marketInferenceService.inferMarket(symbol),
                  ),
                ),
              ];
        const marketStatus =
          await this.marketStatusService.getBatchMarketStatus(markets);

        // 构建编排器请求
        const orchestratorRequest = buildCacheOrchestratorRequest({
          symbols: request.symbols,
          receiverType: request.receiverType,
          provider,
          queryId: requestId,
          marketStatus,
          strategy: CacheStrategy.STRONG_TIMELINESS, // Receiver 强时效策略
           marketType: marketContext.marketType,
           market: marketContext.primaryMarket,
          executeOriginalDataFlow: async () => {
            // 内联原始数据流逻辑，移除包装器方法
            const mappedSymbols = await this.symbolTransformerService.transformSymbolsForProvider(
              provider,
              request.symbols,
              requestId,
            );
            const response = await this.executeDataFetching(
              request,
              provider,
              mappedSymbols,
              requestId,
              marketContext,
            );
            return response.data;
          },
        });

        // 使用编排器获取数据
        const result =
          await this.smartCacheOrchestrator.getDataWithSmartCache(
            orchestratorRequest,
          );

        const processingTimeMs = Date.now() - startTime;

        // ✅ 事件化监控 - 记录成功请求
        this.emitRequestMetrics(
          "/api/v1/receiver/data", // endpoint
          "POST", // method
          200, // statusCode
          processingTimeMs, // duration
          {
            // metadata
            requestId,
            operation: request.receiverType,
            provider: provider || "unknown",
            symbolsCount: request.symbols.length,
            avgTimePerSymbol:
              request.symbols.length > 0
                ? processingTimeMs / request.symbols.length
                : 0,
            componentType: "receiver",
            market: marketContext.marketType,
          },
        );

        const payload = result?.data as any;
        const processedCount = Array.isArray(payload)
          ? payload.length
          : payload
          ? 1
          : 0;
        const totalRequested = request.symbols.length;
        const hasPartialFailures = processedCount < totalRequested;

        return new DataResponseDto(
          payload,
          new ResponseMetadataDto(
            provider,
            request.receiverType,
            requestId,
            processingTimeMs,
            hasPartialFailures,
            totalRequested,
            processedCount,
          ),
        );
      }

      // 4. 传统数据流 - 转换股票代码
      const mappedSymbols =
        await this.symbolTransformerService.transformSymbolsForProvider(
          provider,
          request.symbols,
          requestId,
        );

      // 5. 执行数据获取（移除缓存逻辑，统一到Storage组件处理）
      const responseData = await this.executeDataFetching(
        request,
        provider,
        mappedSymbols,
        requestId,
        marketContext,
      );

      const processingTimeMs = Date.now() - startTime;

      // ✅ 事件化监控 - 记录成功请求
      this.emitRequestMetrics(
        "/api/v1/receiver/data", // endpoint
        "POST", // method
        200, // statusCode
        processingTimeMs, // duration
        {
          // metadata
          requestId,
          operation: request.receiverType,
          provider: provider || "unknown",
          symbolsCount: request.symbols.length,
          avgTimePerSymbol:
            request.symbols.length > 0
              ? processingTimeMs / request.symbols.length
              : 0,
          componentType: "receiver",
          market: marketContext.marketType,
        },
      );

      // 🎯 使用 common 模块的日志脱敏功能
      this.logger.log(
        `强时效数据请求处理成功`,
        sanitizeLogData({
          requestId,
          provider,
          processingTimeMs,
          symbolsCount: request.symbols.length,
          operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
        }),
      );

      return responseData;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // ✅ 事件化监控 - 记录失败请求
      this.emitRequestMetrics(
        "/api/v1/receiver/data", // endpoint
        "POST", // method
        500, // statusCode
        processingTimeMs, // duration
        {
          // metadata
          requestId,
          operation: request.receiverType,
          error: error.message,
          symbolsCount: request.symbols?.length || 0,
          componentType: "receiver",
        },
      );

      // 🎯 使用 common 模块的日志脱敏功能
      this.logger.error(
        `强时效数据请求处理失败`,
        sanitizeLogData({
          requestId,
          error: error.message,
          stack: error.stack,
          processingTimeMs,
          operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
          inputData: {
            symbolsCount: request.symbols?.length || 0,
            receiverType: request.receiverType,
          },
        }),
      );
      throw error;
    } finally {
      // 🔧 确保资源清理，无论成功还是失败
      this.updateActiveConnections(-1);
    }
  }

  /**
   * 初始化请求上下文
   *
   * @param request 数据请求DTO
   * @returns 请求上下文对象
   */
  private initializeRequestContext(request: DataRequestDto): RequestContext {
    const requestId = uuidv4();
    const startTime = Date.now();
    const marketContext = this.getMarketContext(request.symbols);

    return {
      requestId,
      startTime,
      useSmartCache: request.options?.useSmartCache !== false, // 默认启用
      metadata: {
        symbolsCount: request.symbols?.length || 0,
        receiverType: request.receiverType,
        market: marketContext.primaryMarket || marketContext.marketType,
      },
      marketContext,
    };
  }

  /**
   * 验证和准备请求
   *
   * @param request 数据请求DTO
   * @param context 请求上下文
   * @throws BadRequestException 当验证失败时
   */
  private async validateAndPrepareRequest(
    request: DataRequestDto,
    context: RequestContext,
  ): Promise<void> {
    // 1. 验证请求参数
    await this.validateRequest(request, context.requestId);

    // 2. 确定数据提供商
    const provider = await this.determineOptimalProvider(
      request.symbols,
      request.receiverType,
      request.options?.preferredProvider,
      request.options?.market ?? context.marketContext?.primaryMarket,
      context.requestId,
      context.marketContext,
    );

    // 更新上下文
    context.provider = provider;
  }

  /**
   * 判断是否应该使用智能缓存
   *
   * @param request 数据请求DTO
   * @returns 是否使用智能缓存
   */
  private shouldUseSmartCache(request: DataRequestDto): boolean {
    return request.options?.useSmartCache !== false; // 默认启用
  }

  /**
   * 验证数据请求参数
   *
   * @param request 数据请求DTO
   * @param requestId 请求ID
   * @throws BadRequestException 当验证失败时
   */
  private async validateRequest(
    request: DataRequestDto,
    requestId: string,
  ): Promise<void> {
    const validationResult = await this.performRequestValidation(request);

    if (!validationResult.isValid) {
      this.logger.warn(
        `请求参数验证失败`,
        sanitizeLogData({
          requestId,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          symbols: request.symbols?.slice(
            0,
            NUMERIC_CONSTANTS.N_5,
          ),
          operation: "validateRequest",
        }),
      );

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateRequest',
        message: 'Request validation failed',
        context: {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          symbols: request.symbols?.slice(0, NUMERIC_CONSTANTS.N_5),
          validationFailure: true
        }
      });
    }

    // 记录警告信息（如果有）
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      this.logger.warn(
        `请求参数验证通过但存在警告`,
        sanitizeLogData({
          requestId,
          warnings: validationResult.warnings,
          operation: "validateRequest",
        }),
      );
    }
  }

  /**
   * 执行详细的请求验证逻辑
   */
  private async performRequestValidation(
    request: DataRequestDto,
  ): Promise<ValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 🎯 移除必填字段、格式、数量、长度等基础验证
    // 这些验证现在由 DataRequestDto 中的 class-validator 装饰器自动处理

    // 仅保留无法通过装饰器实现的业务逻辑验证

    // 检查重复代码
    const uniqueSymbols = new Set(request.symbols);
    if (uniqueSymbols.size !== request.symbols.length) {
      warnings.push(RECEIVER_WARNING_MESSAGES.DUPLICATE_SYMBOLS);
    }

    // 检查空白字符
    const symbolsWithWhitespace = request.symbols.filter(
      (symbol) => symbol && symbol !== symbol.trim(),
    );
    if (symbolsWithWhitespace.length > 0) {
      warnings.push(RECEIVER_WARNING_MESSAGES.SYMBOLS_WITH_WHITESPACE);
    }

    // 🎯 移除数据类型支持性验证
    // 已由 @IsIn 装饰器处理

    // 🎯 移除选项参数验证
    // RequestOptionsDto 中已包含验证装饰器
    const beginDayRaw = request.options?.beginDay as unknown;
    const endDayRaw = request.options?.endDay as unknown;

    if (
      beginDayRaw !== undefined &&
      beginDayRaw !== null &&
      typeof beginDayRaw !== "string"
    ) {
      errors.push("beginDay 必须是字符串");
    }
    if (
      endDayRaw !== undefined &&
      endDayRaw !== null &&
      typeof endDayRaw !== "string"
    ) {
      errors.push("endDay 必须是字符串");
    }

    const beginDay = typeof beginDayRaw === "string" ? beginDayRaw : undefined;
    const endDay = typeof endDayRaw === "string" ? endDayRaw : undefined;
    const hasTradingDayRange =
      Boolean(beginDay && beginDay.trim()) || Boolean(endDay && endDay.trim());
    if (
      hasTradingDayRange &&
      request.receiverType !== CAPABILITY_NAMES.GET_TRADING_DAYS
    ) {
      errors.push("beginDay/endDay 仅允许在 get-trading-days 请求中使用");
    }

    if (request.receiverType === CAPABILITY_NAMES.GET_TRADING_DAYS) {
      const dateRangeValidation = validateYmdDateRange(beginDay, endDay, {
        strict: true,
        minYmd: TRADING_DAYS_MIN_YMD,
        maxYmd: TRADING_DAYS_MAX_YMD,
        maxSpanDays: TRADING_DAYS_MAX_SPAN_DAYS,
      });
      if (!dateRangeValidation.isValid && dateRangeValidation.message) {
        errors.push(dateRangeValidation.message);
      }
    }

    if (errors.length > 0) {
      return ValidationResultDto.invalid(
        errors,
        warnings.length > 0 ? warnings : undefined,
      );
    }

    return ValidationResultDto.valid(
      warnings.length > 0 ? warnings : undefined,
    );
  }

  /**
   * 确定最优数据提供商
   *
   * @param symbols 股票代码列表
   * @param receiverType 数据类型
   * @param preferredProvider 首选提供商
   * @param market 指定市场
   * @param requestId 请求ID
   * @returns 提供商名称
   */
  private async determineOptimalProvider(
    symbols: string[],
    receiverType: string,
    preferredProvider?: string,
    market?: string,
    requestId?: string,
    marketContext?: MarketTypeContext,
  ): Promise<string> {
    try {
      // 优先使用指定提供商
      if (preferredProvider) {
        const provider = await this.validatePreferredProvider(
          preferredProvider,
          receiverType,
          market,
          requestId,
        );
        if (provider) return provider;
      }

      // 自动选择最佳提供商
      const inferredMarket =
        market ||
        marketContext?.primaryMarket ||
        this.marketInferenceService.inferDominantMarket(symbols);
      const capabilityName = receiverType;
      const bestProvider = this.capabilityRegistryService.getBestProvider(
        capabilityName,
        inferredMarket,
      );

      if (bestProvider) {
        this.logger.debug(
          `自动选择最优提供商`,
          sanitizeLogData({
            requestId,
            provider: bestProvider,
            receiverType,
            market: market,
            symbolsCount: symbols.length,
            operation: "determineOptimalProvider",
          }),
        );
        return bestProvider;
      }

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'determineOptimalProvider',
        message: `No provider found for receiver type '${receiverType}' and market '${inferredMarket}'`,
        context: {
          receiverType,
          market: market,
          availableProviders: [],
          providerSelectionFailed: true
        }
      });
    } catch (error) {
      this.logger.error(
        `数据提供商选择失败`,
        sanitizeLogData({
          requestId,
          error: error.message,
          receiverType,
          market,
          symbols: symbols.slice(
            0,
            NUMERIC_CONSTANTS.N_3,
          ),
          operation: "determineOptimalProvider",
        }),
      );

      // 关键修复：如果错误已经是我们自定义的业务异常，直接重新抛出，避免信息丢失
      if (error instanceof BadRequestException || error instanceof NotFoundException || (error.constructor.name === 'BusinessException')) {
        throw error;
      }

      // 对于未知错误，再进行包装
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: 'determineOptimalProvider',
        message: 'Provider selection failed due to internal error',
        context: {
          originalError: error.message,
          receiverType,
          market: market,
          symbols: symbols?.slice(0, 5) // 提供部分符号示例
        }
      });
    }
  }

  /**
   * 验证首选提供商是否可用
   */
  private async validatePreferredProvider(
    preferredProvider: string,
    receiverType: string,
    market?: string,
    requestId?: string,
  ): Promise<string | null> {
    const capabilityName = receiverType;
    const capability = this.capabilityRegistryService.getCapability(
      preferredProvider,
      capabilityName,
    );

    if (!capability) {
      this.logger.warn(
        RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT,
        sanitizeLogData({
          requestId,
          provider: preferredProvider,
          capability: capabilityName,
          operation: "validatePreferredProvider",
        }),
      );
      // 关键修复：当找不到首选提供商时，直接抛出404异常
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'validatePreferredProvider',
        message: `Preferred provider '${preferredProvider}' is unavailable for receiver type '${receiverType}'. Use canonical providers: ${CANONICAL_PROVIDER_HINT}.`,
        context: {
          preferredProvider,
          receiverType,
          market: market || "any",
          capabilityName,
          providerCapabilityMissing: true
        }
      });
    }

    // 检查市场支持
    if (market && !capability.supportedMarkets.includes(market)) {
      this.logger.warn(
        RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET,
        sanitizeLogData({
          requestId,
          provider: preferredProvider,
          market,
          supportedMarkets: capability.supportedMarkets,
          operation: "validatePreferredProvider",
        }),
      );
      // 关键修复：当提供商不支持指定市场时，抛出404异常
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation: 'validatePreferredProvider',
        message: `Preferred provider '${preferredProvider}' is unavailable for market '${market}'. Use canonical providers: ${CANONICAL_PROVIDER_HINT}.`,
        context: {
          preferredProvider,
          market,
          supportedMarkets: capability.supportedMarkets,
          receiverType,
          marketNotSupported: true
        }
      });
    }

    this.logger.debug(
      `使用首选提供商`,
      sanitizeLogData({
        requestId,
        provider: preferredProvider,
        receiverType,
        market,
        operation: "validatePreferredProvider",
      }),
    );

    return preferredProvider;
  }

  /**
   * 执行数据获取 (核心业务逻辑)
   */
  private async executeDataFetching(
    request: DataRequestDto,
    provider: string,
    mappedSymbols: SymbolTransformForProviderResult,
    requestId: string,
    marketContext?: MarketTypeContext,
  ): Promise<DataResponseDto> {
    const startTime = Date.now();
    const capabilityName = request.receiverType;
    const effectiveMarketContext =
      marketContext ?? this.getMarketContext(request.symbols);

    try {
      // 🔥 关键重构：委托DataFetcher处理SDK调用
      const fetchParams: DataFetchParams = {
        provider,
        capability: capabilityName,
        symbols: mappedSymbols.transformedSymbols,
        contextService: await this.getProviderContextService(provider),
        requestId,
        apiType: "rest",
        options: request.options,
      };

      const fetchResult =
        await this.dataFetcherService.fetchRawData(fetchParams);
      const rawData = fetchResult.data;

      // ✅ 数据标准化处理：使用 Transformer 进行数据格式转换
      this.logger.debug(`开始数据标准化处理`, {
        requestId,
        provider,
        receiverType: request.receiverType,
        rawDataCount: rawData.length,
        fetchTime: fetchResult.metadata.processingTimeMs,
      });

      const rawSample = Array.isArray(rawData) ? rawData[0] : rawData;
      this.logger.debug(`Raw data for transformation`, {
        rawSize: rawData?.length ?? 0,
        rawSample,
      });
      const transformRequest: DataTransformRequestDto = {
        provider,
        apiType: "rest",
        transDataRuleListType: this.mapReceiverTypeToTransDataRuleListType(
          request.receiverType,
        ),
        rawData,
        marketType: effectiveMarketContext.marketType,
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const transformedResult =
        await this.dataTransformerService.transform(transformRequest);

      const transformedSample = Array.isArray(transformedResult.transformedData)
        ? transformedResult.transformedData[0]
        : transformedResult.transformedData;
      this.logger.debug(`Transformed data sample`, {
        requestId,
        provider,
        transformedSample,
        rawSample,
      });

      // 符号逆映射：将 Provider 符号还原为系统默认标准格式
      try {
        const fwd = mappedSymbols.mappingResults?.transformedSymbols || {};
        const reverse: Record<string, string> = {};
        for (const std of Object.keys(fwd)) {
          const sdk = fwd[std];
          if (sdk) reverse[sdk] = std;
        }

        const applyReverse = (item: any) => {
          if (item && typeof item === 'object' && 'symbol' in item) {
            const sv = (item as any).symbol;
            if (typeof sv === 'string' && reverse[sv]) {
              (item as any).symbol = reverse[sv];
            }
          }
          return item;
        };

        if (Array.isArray(transformedResult.transformedData)) {
          transformedResult.transformedData = transformedResult.transformedData.map(applyReverse);
        } else {
          transformedResult.transformedData = applyReverse(transformedResult.transformedData);
        }
      } catch (e) {
        this.logger.warn('符号逆映射失败(已忽略)', { error: (e as any)?.message });
      }

      // ✅ 新增步骤2：使用 Storage 进行统一存储
      this.logger.debug(`开始数据存储处理`, {
        requestId,
        provider,
        transformedDataCount: Array.isArray(transformedResult.transformedData)
          ? transformedResult.transformedData.length
          : 1,
      });

      const storageRequest: StoreDataDto = {
        key: `stock_data_${provider}_${request.receiverType}_${requestId}`,
        data: transformedResult.transformedData,
        storageType: StorageType.PERSISTENT, // 存储到数据库持久化
        storageClassification: this.mapReceiverTypeToStorageClassification(
          request.receiverType,
        ),
        provider,
        market:
          effectiveMarketContext.primaryMarket ||
          effectiveMarketContext.marketType,
        options: {
          compress: true,
        },
      };

      // 条件存储：检查storageMode是否允许存储
      if (request.options?.storageMode !== "none") {
        // Storage 操作不应该阻塞主流程，异步执行
        this.storageService.storeData(storageRequest).catch((error) => {
          this.logger.warn(`数据存储失败，但不影响主流程`, {
            requestId,
            provider,
            error: error.message,
          });
        });
      } else {
        this.logger.debug(`存储模式为none，跳过数据存储`, {
          requestId,
          provider,
          storageMode: request.options.storageMode,
        });
      }

      // 🎯 计算部分成功的信息
      const hasPartialFailures =
        mappedSymbols.mappingResults.metadata.failedTransformations > 0;
      const totalRequested = mappedSymbols.mappingResults.metadata.totalSymbols;
      const successfullyProcessed =
        mappedSymbols.mappingResults.metadata.successfulTransformations;

      const metadata = new ResponseMetadataDto(
        provider,
        capabilityName,
        requestId,
        Date.now() - startTime, // 计算实际处理时间
        hasPartialFailures,
        totalRequested,
        successfullyProcessed,
      );

      this.logger.log(`完整数据处理链路执行成功`, {
        requestId,
        provider,
        receiverType: request.receiverType,
        totalProcessingTime: Date.now() - startTime,
        fetchTime: fetchResult.metadata.processingTimeMs,
        rawDataCount: rawData.length,
        transformedDataCount: Array.isArray(transformedResult.transformedData)
          ? transformedResult.transformedData.length
          : 1,
      });

      // 构造响应对象，包含失败明细
      const response = new DataResponseDto(
        transformedResult.transformedData,
        metadata,
      );
      if (
        mappedSymbols.mappingResults.metadata.failedTransformations > 0 &&
        mappedSymbols.mappingResults.failedSymbols?.length > 0
      ) {
        response.failures = mappedSymbols.mappingResults.failedSymbols.map(
          (symbol) =>
            ({
              symbol,
              reason: "符号映射失败或数据获取失败",
            }) as FailureDetailDto,
        );
      }

      // 返回标准化后的数据而不是原始SDK数据
      return response;
    } catch (error) {
      this.logger.error(
        `数据获取执行失败`,
        sanitizeLogData({
          requestId,
          provider,
          capability: capabilityName,
          error: error.message,
          operation: "executeDataFetching",
        }),
      );

      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        operation: 'executeDataFetching',
        message: `Data fetching validation failed: ${error.message}`,
        context: {
          originalError: error.message,
          request: {
            receiverType: request.receiverType,
            symbols: request.symbols?.slice(0, 5),
            preferredProvider: request.options?.preferredProvider
          },
          operation: 'executeDataFetching'
        }
      });
    }
  }

  /**
   * ✅ 事件化监控 - 记录请求指标
   * 符合监控组件集成规范，使用事件驱动方式
   */
  private emitRequestMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    processingTimeMs: number,
    metadata: Record<string, any>,
  ): void {
    // ✅ 使用 setImmediate 确保异步处理，不阻塞业务逻辑
    setImmediate(() => {
      if (this.isDestroyed) return; // 防止在模块销毁后执行

      const tags: Record<string, any> = {
        endpoint,
        method,
        status_code: statusCode,
        component: "receiver",
        operation: metadata.operation || "unknown",
        provider: metadata.provider || "unknown",
        symbols_count: metadata.symbolsCount || 0,
        market: metadata.market || "unknown",
      };

      // 关键修复：当请求失败时，在 tags 中添加 error 字段
      if (statusCode >= 400 && metadata.error) {
        tags.error = metadata.error;
      }

      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });
  }

  /**
   * ✅ 事件化监控 - 更新活跃连接监控
   * 符合监控组件集成规范，使用事件驱动方式
   */
  private updateActiveConnections(delta: number): void {
    this.activeConnections = Math.max(0, this.activeConnections + delta);

    // ✅ 使用 setImmediate 确保异步处理，不阻塞业务逻辑
    setImmediate(() => {
      if (this.isDestroyed) return; // 防止在模块销毁后执行

      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });
  }

  /**
   * 获取提供商的上下文服务
   *
   * @param provider 提供商名称
   * @returns 上下文服务实例或undefined
   */
  private async getProviderContextService(provider: string): Promise<any> {
    // 🎯 动态获取Provider实例，消除硬编码依赖
    const providerInstance =
      this.capabilityRegistryService.getProvider(provider);

    if (
      providerInstance &&
      typeof providerInstance.getContextService === "function"
    ) {
      return providerInstance.getContextService();
    }

    this.logger.debug(
      `Provider ${provider} 未注册或不支持getContextService方法`,
      {
        provider,
        hasProvider: !!providerInstance,
        hasContextService:
          providerInstance &&
          typeof providerInstance.getContextService === "function",
      },
    );

    return undefined;
  }

  /**
   * 将 receiverType 映射到 transDataRuleListType
   * 用于 Transformer 组件确定使用哪种映射规则类型
   */
  private mapReceiverTypeToTransDataRuleListType(receiverType: string): string {
    const mapping = FIELD_MAPPING_CONFIG.TRANS_RULE_TYPE_BY_CAPABILITY as Record<string, string>;
    const transDataRuleListType = mapping[receiverType];
    if (!transDataRuleListType) {
      this.logger.warn(`未找到 receiverType 映射，使用默认值`, {
        receiverType,
        defaultTransDataRuleListType: "quote_fields",
      });
      return "quote_fields"; // 默认使用股票报价字段映射
    }
    return transDataRuleListType;
  }

  /**
   * 将 receiverType 映射到 Storage 分类类型
   */
  private mapReceiverTypeToStorageClassification(
    receiverType: string,
  ): StorageClassification {
    const mapping = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION as Record<string, StorageClassification>;
    return mapping[receiverType] || StorageClassification.STOCK_QUOTE;
  }

  /**
   * 根据符号和市场状态计算缓存TTL
   */
  private calculateStorageCacheTTL(symbols: string[]): number {
    // 根据市场开盘状态调整缓存时间
    // 开盘时间使用短缓存(1-5秒)，闭市使用长缓存(30-300秒)
    const defaultTTL = SMART_CACHE_CONSTANTS.TTL.MARKET_OPEN_DEFAULT_S; // 默认缓存

    // 使用 symbols 数量做简单 TTL 调整示例（避免未使用变量警告）
    const symbolCount = symbols?.length || 0;
    if (symbolCount > NUMERIC_CONSTANTS.N_20) {
      return Math.max(
        defaultTTL,
        (SMART_CACHE_CONSTANTS.TTL.WEAK_TIMELINESS_DEFAULT_S /
          NUMERIC_CONSTANTS.N_5) *
          2,
      ); // 大批量请求给更长 TTL
    }

    // 这里可以根据symbols判断市场，然后设置不同的TTL
    // 实际实现可以调用 marketStatusService 获取市场状态
    return defaultTTL;
  }

  /**
   * 统一的市场上下文解析
   */
  private getMarketContext(symbols: string[]): MarketTypeContext {
    return resolveMarketTypeFromSymbols(this.marketInferenceService, symbols);
  }

  /**
   * NestJS 模块销毁生命周期钩子
   * 负责清理资源和优雅关闭
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('ReceiverService 开始执行资源清理和优雅关闭');

    // 标记服务为已销毁状态，防止新的异步操作
    this.isDestroyed = true;

    try {
      // 1. 等待活跃连接完成处理
      if (this.activeConnections > 0) {
        this.logger.warn(`等待 ${this.activeConnections} 个活跃连接完成处理`);

        // 等待最多10秒让活跃连接完成
        const maxWaitTime = 10000;
        const startTime = Date.now();

        while (this.activeConnections > 0 && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.activeConnections > 0) {
          this.logger.warn(`强制关闭前仍有 ${this.activeConnections} 个活跃连接未完成`);
        } else {
          this.logger.log('所有活跃连接已完成处理');
        }
      }

      // 2. 发送服务关闭监控事件
      this.emitServiceShutdownMetrics();

      // 3. 清理统计信息
      this.activeConnections = 0;

      this.logger.log('ReceiverService 资源清理完成');
    } catch (error) {
      this.logger.error('ReceiverService 资源清理过程中发生错误', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 发送服务关闭监控事件
   */
  private emitServiceShutdownMetrics(): void {
    try {
      // 使用 setImmediate 确保异步处理，同时检查销毁状态
      setImmediate(() => {
        if (!this.isDestroyed) return; // 只在销毁时发送关闭事件

        // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
      });
    } catch (error) {
      this.logger.error('发送服务关闭监控事件失败', {
        error: error.message,
      });
    }
  }
}
