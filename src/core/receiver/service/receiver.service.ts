import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { MarketStatus } from "@common/constants/market-trading-hours.constants";
import { Market } from "@common/constants/market.constants";

import { CacheService } from "../../../cache/cache.service";
import { CapabilityRegistryService } from "../../../providers/capability-registry.service";
import {
  MarketStatusService,
  MarketStatusResult,
} from "../../shared/service/market-status.service";
import { SymbolMapperService } from "../../symbol-mapper/service/symbol-mapper.service";

import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
  RECEIVER_PERFORMANCE_THRESHOLDS,
  RECEIVER_OPERATIONS,
} from "../constants/receiver.constants";
import { DataRequestDto } from "../dto/data-request.dto";
import { DataResponseDto, ResponseMetadataDto } from "../dto/data-response.dto";
import {
  RequestOptionsDto,
  SymbolTransformationResultDto,
  DataFetchingParamsDto,
} from "../dto/receiver-internal.dto";
import { ValidationResultDto } from "../dto/validation.dto";
import { MarketUtils } from "../utils/market.util";
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
export class ReceiverService {
  // 🎯 使用 common 模块的日志配置
  private readonly logger = createLogger(ReceiverService.name);

  // 🎯 使用 common 模块的常量，无需重复定义

  constructor(
    private readonly SymbolMapperService: SymbolMapperService,
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly marketStatusService: MarketStatusService,
    private readonly cacheService: CacheService,
  ) {}


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

    // 🎯 使用 common 模块的日志脱敏功能
    this.logger.log(
      `开始处理强时效数据请求`,
      sanitizeLogData({
        requestId,
        symbols: request.symbols?.slice(
          0,
          RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT,
        ),
        capabilityType: request.capabilityType,
        symbolsCount: request.symbols?.length || 0,
        operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
      }),
    );

    try {
      // 1. 验证请求参数
      await this.validateRequest(request, requestId);

      // 2. 确定数据提供商
      const provider = await this.determineOptimalProvider(
        request.symbols,
        request.capabilityType,
        request.options?.preferredProvider,
        request.options?.market,
        requestId,
      );

      // 3. 获取市场状态 - 强时效关键步骤
      const marketStatus = await this.getMarketStatusForSymbols(
        request.symbols,
        requestId,
      );

      // 4. 检查强时效缓存
      const cachedResult = await this.tryGetFromRealtimeCache(
        request,
        provider,
        marketStatus,
        requestId,
      );

      if (cachedResult) {
        const processingTime = Date.now() - startTime;
        this.logger.log(
          `强时效缓存命中`,
          sanitizeLogData({
            requestId,
            provider,
            processingTime,
            symbolsCount: request.symbols.length,
            cacheSource: "realtime",
          }),
        );
        return cachedResult;
      }

      // 5. 转换股票代码
      const { symbolsToTransform, standardSymbols } = this.separateSymbols(
        request.symbols,
      );
      const mappedSymbols = await this.transformSymbols(
        symbolsToTransform,
        standardSymbols,
        provider,
        requestId,
      );

      // 6. 执行实时数据获取
      const responseData = await this.executeRealtimeDataFetching(
        request,
        provider,
        mappedSymbols,
        marketStatus,
        requestId,
      );

      const processingTime = Date.now() - startTime;

      // 7. 记录性能指标
      this.recordPerformanceMetrics(
        requestId,
        processingTime,
        request.symbols.length,
      );

      // 🎯 使用 common 模块的日志脱敏功能
      this.logger.log(
        `强时效数据请求处理成功`,
        sanitizeLogData({
          requestId,
          provider,
          processingTime,
          symbolsCount: request.symbols.length,
          operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
        }),
      );

      return responseData;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      // 🎯 使用 common 模块的日志脱敏功能
      this.logger.error(
        `强时效数据请求处理失败`,
        sanitizeLogData({
          requestId,
          error: error.message,
          stack: error.stack,
          processingTime,
          operation: RECEIVER_OPERATIONS.HANDLE_REQUEST,
          inputData: {
            symbolsCount: request.symbols?.length || 0,
            capabilityType: request.capabilityType,
          },
        }),
      );
      throw error;
    }
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
          symbols: request.symbols?.slice(0, 5),
          operation: "validateRequest",
        }),
      );

      throw new BadRequestException({
        message: RECEIVER_ERROR_MESSAGES.VALIDATION_FAILED,
        errors: validationResult.errors,
        code: "VALIDATION_FAILED",
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
   * 🎯 新增方法：分离需要转换的和已经是标准格式的股票代码
   * @param symbols 完整的股票代码列表
   * @returns 分离后的两组代码
   */
  private separateSymbols(symbols: string[]): {
    symbolsToTransform: string[];
    standardSymbols: string[];
  } {
    const symbolsToTransform: string[] = [];
    const standardSymbols: string[] = [];

    // 简单的启发式规则：包含 "." 的被认为是标准代码
    // 注意：这个规则未来可能需要增强以应对更复杂的场景
    symbols.forEach((symbol) => {
      if (symbol.includes(".")) {
        standardSymbols.push(symbol);
      } else {
        symbolsToTransform.push(symbol);
      }
    });

    return { symbolsToTransform, standardSymbols };
  }

  /**
   * 验证请求选项参数
   */
  private validateRequestOptions(options: RequestOptionsDto): string[] {
    const errors: string[] = [];

    if (
      options.preferredProvider &&
      typeof options.preferredProvider !== "string"
    ) {
      errors.push(RECEIVER_ERROR_MESSAGES.PREFERRED_PROVIDER_INVALID);
    }

    if (
      options.realtime !== undefined &&
      typeof options.realtime !== "boolean"
    ) {
      errors.push(RECEIVER_ERROR_MESSAGES.REALTIME_PARAM_INVALID);
    }

    if (options.fields && !Array.isArray(options.fields)) {
      errors.push(RECEIVER_ERROR_MESSAGES.FIELDS_PARAM_INVALID);
    }

    if (options.market && typeof options.market !== "string") {
      errors.push(RECEIVER_ERROR_MESSAGES.MARKET_PARAM_INVALID);
    }

    return errors;
  }

  /**
   * 确定最优数据提供商
   *
   * @param symbols 股票代码列表
   * @param capabilityType 数据类型
   * @param preferredProvider 首选提供商
   * @param market 指定市场
   * @param requestId 请求ID
   * @returns 提供商名称
   */
  private async determineOptimalProvider(
    symbols: string[],
    capabilityType: string,
    preferredProvider?: string,
    market?: string,
    requestId?: string,
  ): Promise<string> {
    try {
      // 优先使用指定提供商
      if (preferredProvider) {
        const provider = await this.validatePreferredProvider(
          preferredProvider,
          capabilityType,
          market,
          requestId,
        );
        if (provider) return provider;
      }

      // 自动选择最佳提供商
      const inferredMarket =
        market || MarketUtils.inferMarketFromSymbols(symbols);
      const capabilityName = capabilityType;
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
            capabilityType,
            market: inferredMarket,
            symbolsCount: symbols.length,
            operation: "determineOptimalProvider",
          }),
        );
        return bestProvider;
      }

      throw new NotFoundException(
        RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND.replace(
          "{capabilityType}",
          capabilityType,
        ).replace("{market}", inferredMarket),
      );
    } catch (error) {
      this.logger.error(
        `数据提供商选择失败`,
        sanitizeLogData({
          requestId,
          error: error.message,
          capabilityType,
          market,
          symbols: symbols.slice(0, 3),
          operation: "determineOptimalProvider",
        }),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        RECEIVER_ERROR_MESSAGES.PROVIDER_SELECTION_FAILED,
      );
    }
  }

  /**
   * 验证首选提供商是否可用
   */
  private async validatePreferredProvider(
    preferredProvider: string,
    capabilityType: string,
    market?: string,
    requestId?: string,
  ): Promise<string | null> {
    const capabilityName = capabilityType;
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
      throw new NotFoundException(
        RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND.replace(
          "{capabilityType}",
          capabilityType,
        ).replace("{market}", market || "any"),
      );
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
      throw new NotFoundException(
        RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET.replace(
          "{provider}",
          preferredProvider,
        ).replace("{market}", market),
      );
    }

    this.logger.debug(
      `使用首选提供商`,
      sanitizeLogData({
        requestId,
        provider: preferredProvider,
        capabilityType,
        market,
        operation: "validatePreferredProvider",
      }),
    );

    return preferredProvider;
  }

  /**
   * 转换股票代码
   *
   * @param symbolsToTransform 需要转换的原始股票代码列表
   * @param standardSymbols 已经是标准格式的股票代码
   * @param provider 数据提供商
   * @param requestId 请求ID
   * @returns 转换结果
   */
  private async transformSymbols(
    symbolsToTransform: string[],
    standardSymbols: string[],
    provider: string,
    requestId: string,
  ): Promise<SymbolTransformationResultDto> {
    try {
      let mappingResult = {
        transformedSymbols: {},
        failedSymbols: [],
        processingTimeMs: 0,
      };

      // 仅当有需要转换的代码时才调用服务
      if (symbolsToTransform.length > 0) {
        const resultFromService =
          await this.SymbolMapperService.transformSymbols(
            provider,
            symbolsToTransform,
          );
        mappingResult = { ...resultFromService };
      }

      // 将已经是标准格式的代码添加到成功结果中
      // 它们的原始代码和转换后代码是相同的
      standardSymbols.forEach((symbol) => {
        mappingResult.transformedSymbols[symbol] = symbol;
      });

      const allOriginalSymbols = [...symbolsToTransform, ...standardSymbols];

      // 🎯 修改：处理转换失败的股票代码，但不抛出异常，支持部分成功
      if (
        mappingResult.failedSymbols &&
        mappingResult.failedSymbols.length > 0
      ) {
        const errorMessage =
          RECEIVER_ERROR_MESSAGES.SOME_SYMBOLS_FAILED_TO_MAP.replace(
            "{failedSymbols}",
            mappingResult.failedSymbols.join(", "),
          );
        this.logger.warn(
          errorMessage,
          sanitizeLogData({
            requestId,
            provider,
            failedCount: mappingResult.failedSymbols.length,
            failedSymbols: mappingResult.failedSymbols,
            operation: "transformSymbols",
          }),
        );

        // 如果所有股票代码都转换失败，则抛出异常
        if (mappingResult.failedSymbols.length === allOriginalSymbols.length) {
          throw new BadRequestException(errorMessage);
        }

        // 部分失败的情况下，继续处理成功的股票代码
      }

      // 🎯 修改：只处理成功转换的股票代码
      const successfulSymbols = Object.keys(
        mappingResult.transformedSymbols,
      ).filter((symbol) => !mappingResult.failedSymbols?.includes(symbol));
      const transformedSymbolsArray = successfulSymbols.map(
        (symbol) => mappingResult.transformedSymbols[symbol],
      );

      this.logger.debug(
        `股票代码转换完成`,
        sanitizeLogData({
          requestId,
          provider,
          originalCount: allOriginalSymbols.length,
          transformedCount: transformedSymbolsArray.length,
          failedCount: mappingResult.failedSymbols?.length || 0,
          operation: "transformSymbols",
        }),
      );

      // 🎯 修正：确保返回的结构与接收方期望的一致，支持部分成功
      const hasFailures =
        mappingResult.failedSymbols && mappingResult.failedSymbols.length > 0;

      return {
        transformedSymbols: transformedSymbolsArray,
        mappingResults: {
          transformedSymbols: mappingResult.transformedSymbols,
          failedSymbols: mappingResult.failedSymbols || [],
          metadata: {
            provider,
            totalSymbols: allOriginalSymbols.length,
            successfulTransformations: transformedSymbolsArray.length,
            failedTransformations: (mappingResult.failedSymbols || []).length,
            processingTime: mappingResult.processingTimeMs, // 🎯 使用 DTO 中的处理时间
            hasPartialFailures: hasFailures,
          },
        },
      } as SymbolTransformationResultDto;
    } catch (error) {
      this.logger.error(
        RECEIVER_ERROR_MESSAGES.SYMBOL_TRANSFORMATION_FAILED,
        sanitizeLogData({
          requestId,
          provider,
          error: error.message,
          operation: "transformSymbols",
        }),
      );

      // 🎯 新增：重新抛出已知的 BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        RECEIVER_ERROR_MESSAGES.SYMBOL_TRANSFORMATION_FAILED,
      );
    }
  }

  /**
   * 执行数据获取 (原有方法，保持兼容性)
   */
  private async executeDataFetching(
    request: DataRequestDto,
    provider: string,
    mappedSymbols: SymbolTransformationResultDto,
    requestId: string,
  ): Promise<DataResponseDto> {
    const startTime = Date.now();
    const capabilityName = request.capabilityType;
    const capability = this.capabilityRegistryService.getCapability(
      provider,
      capabilityName,
    );

    if (!capability) {
      throw new NotFoundException(
        RECEIVER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORT_CAPABILITY.replace(
          "{provider}",
          provider,
        ).replace("{capability}", capabilityName),
      );
    }

    const executionParams: DataFetchingParamsDto = {
      symbols: mappedSymbols.transformedSymbols,
      options: request.options,
      originalSymbols: request.symbols,
      requestId,
      contextService: await this.getProviderContextService(provider),
    };

    try {
      const data = await capability.execute(executionParams);

      // 确保返回的数据始终是数组格式
      const responseData = Array.isArray(data) ? data : [data];

      // 🎯 新增：计算部分成功的信息
      const hasPartialFailures =
        mappedSymbols.mappingResults.metadata.hasPartialFailures;
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

      return new DataResponseDto(responseData, metadata);
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

      throw new InternalServerErrorException(
        RECEIVER_ERROR_MESSAGES.DATA_FETCHING_FAILED.replace(
          "{error}",
          error.message,
        ),
      );
    }
  }

  /**
   * 获取股票代码对应的市场状态
   * 🎯 强时效接口专用 - 快速市场状态检测
   */
  private async getMarketStatusForSymbols(
    symbols: string[],
    requestId: string,
  ): Promise<Record<Market, MarketStatusResult>> {
    try {
      // 推断所有涉及的市场
      const marketsSet = new Set<Market>();
      symbols.forEach((symbol) => {
        marketsSet.add(this.inferMarketFromSymbol(symbol));
      });

      const markets = Array.from(marketsSet);

      // 批量获取市场状态
      const marketStatus =
        await this.marketStatusService.getBatchMarketStatus(markets);

      this.logger.debug(
        `批量市场状态获取完成`,
        sanitizeLogData({
          requestId,
          markets,
          statuses: Object.fromEntries(
            Object.entries(marketStatus).map(([market, status]) => [
              market,
              status.status,
            ]),
          ),
        }),
      );

      return marketStatus;
    } catch (error) {
      this.logger.error(
        `市场状态获取失败`,
        sanitizeLogData({
          requestId,
          symbols: symbols.slice(0, 3),
          error: error.message,
        }),
      );

      // 降级处理：返回默认市场状态
      const markets = [Market.US, Market.HK, Market.SH, Market.SZ];
      const fallbackStatus: Record<Market, MarketStatusResult> = {} as any;

      for (const market of markets) {
        fallbackStatus[market] = {
          market,
          status: MarketStatus.CLOSED,
          currentTime: new Date(),
          marketTime: new Date(),
          timezone: "UTC",
          realtimeCacheTTL: 60,
          analyticalCacheTTL: 3600,
          isHoliday: false,
          isDST: false,
          confidence: 0.5,
        };
      }

      return fallbackStatus;
    }
  }

  /**
   * 从强时效缓存中尝试获取数据
   * 🚀 1秒级缓存策略，基于市场状态动态TTL
   */
  private async tryGetFromRealtimeCache(
    request: DataRequestDto,
    provider: string,
    marketStatus: Record<Market, MarketStatusResult>,
    requestId: string,
  ): Promise<DataResponseDto | null> {
    try {
      const cacheKey = this.buildRealtimeCacheKey(request, provider);
      const cachedData = await this.cacheService.get<any[]>(cacheKey);

      if (!cachedData) {
        this.logger.debug(`强时效缓存未命中`, { requestId, cacheKey });
        return null;
      }

      const processingTime = 0; // 从缓存获取，处理时间计为0
      const capability = request.capabilityType;

      // 关键修复：使用当前请求的元数据重新构建响应
      const metadata = new ResponseMetadataDto(
        provider,
        capability,
        requestId,
        processingTime,
        false, // hasPartialFailures
        request.symbols.length, // totalRequested
        request.symbols.length, // successfullyProcessed
      );

      this.logger.debug(`强时效缓存命中`, {
        requestId,
        cacheKey,
      });

      return new DataResponseDto(cachedData, metadata);
    } catch (error) {
      this.logger.warn(`强时效缓存获取失败`, {
        requestId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 执行实时数据获取并缓存
   * 🚀 强时效接口专用，自动缓存结果
   */
  private async executeRealtimeDataFetching(
    request: DataRequestDto,
    provider: string,
    mappedSymbols: SymbolTransformationResultDto,
    marketStatus: Record<Market, MarketStatusResult>,
    requestId: string,
  ): Promise<DataResponseDto> {
    // 先执行原有的数据获取逻辑
    const responseData = await this.executeDataFetching(
      request,
      provider,
      mappedSymbols,
      requestId,
    );

    // 缓存到强时效缓存
    try {
      const cacheKey = this.buildRealtimeCacheKey(request, provider);
      const cacheTTL = this.calculateRealtimeCacheTTL(
        request.symbols,
        marketStatus,
      );

      if (cacheTTL > 0) {
        // 关键修复：只缓存纯数据部分(responseData.data)，而不是整个响应对象
        this.cacheService
          .set(cacheKey, responseData.data, { ttl: cacheTTL })
          .catch((error) => {
            this.logger.warn(`强时效缓存存储失败`, {
              requestId,
              cacheKey,
              error: error.message,
            });
          });
      }

      this.logger.debug(`强时效数据已缓存`, {
        requestId,
        cacheKey,
        ttl: cacheTTL,
        symbolsCount: request.symbols.length,
      });
    } catch (error) {
      // 缓存失败不影响业务逻辑
      this.logger.warn(`强时效缓存操作失败`, {
        requestId,
        error: error.message,
      });
    }

    return responseData;
  }

  /**
   * 构建实时缓存键
   */
  private buildRealtimeCacheKey(
    request: DataRequestDto,
    provider: string,
  ): string {
    const symbolsKey = request.symbols.sort().join(",");
    const optionsKey = request.options ? JSON.stringify(request.options) : "";
    return `receiver:realtime:${provider}:${request.capabilityType}:${symbolsKey}:${optionsKey}`;
  }

  /**
   * 计算实时缓存TTL（秒）
   * 🎯 基于市场状态的动态TTL策略
   */
  private calculateRealtimeCacheTTL(
    symbols: string[],
    marketStatus: Record<Market, MarketStatusResult>,
  ): number {
    let minTTL = 60; // 默认60秒

    // 获取所有相关市场的最短TTL
    symbols.forEach((symbol) => {
      const market = this.inferMarketFromSymbol(symbol);
      const status = marketStatus[market];

      if (status && status.realtimeCacheTTL < minTTL) {
        minTTL = status.realtimeCacheTTL;
      }
    });

    return minTTL;
  }

  /**
   * 从股票代码推断市场
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场: .HK 后缀或5位数字
    if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }

    // 美国市场: 1-5位字母
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }

    // 深圳市场: .SZ 后缀或 00/30 前缀
    if (
      upperSymbol.includes(".SZ") ||
      ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }

    // 上海市场: .SH 后缀或 60/68 前缀
    if (
      upperSymbol.includes(".SH") ||
      ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }

    // 默认美股
    return Market.US;
  }

  /**
   * 记录性能指标
   */
  private recordPerformanceMetrics(
    requestId: string,
    processingTime: number,
    symbolsCount: number,
  ): void {
    const avgTimePerSymbol =
      symbolsCount > 0 ? processingTime / symbolsCount : 0;

    if (processingTime > RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      this.logger.warn(
        RECEIVER_WARNING_MESSAGES.SLOW_REQUEST_DETECTED,
        sanitizeLogData({
          requestId,
          processingTime,
          symbolsCount,
          avgTimePerSymbol: Math.round(avgTimePerSymbol * 100) / 100,
          threshold: RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS,
          operation: RECEIVER_OPERATIONS.RECORD_PERFORMANCE,
        }),
      );
    }

    // 记录性能指标到监控系统（如果需要）
    this.logger.debug(
      `性能指标记录`,
      sanitizeLogData({
        requestId,
        processingTime,
        symbolsCount,
        avgTimePerSymbol: Math.round(avgTimePerSymbol * 100) / 100,
        operation: "performanceMetrics",
      }),
    );
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
}
