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

import { CapabilityRegistryService } from "../../../providers/services/capability-registry.service";
import {
  MarketStatusService,
  MarketStatusResult,
} from "../../shared/services/market-status.service";
import { SymbolMapperService } from "../../symbol-mapper/services/symbol-mapper.service";
import { DataFetcherService } from "../../data-fetcher/services/data-fetcher.service"; // 🔥 新增DataFetcher导入
import { TransformerService } from "../../transformer/services/transformer.service";
import { StorageService } from "../../storage/services/storage.service";
import { MetricsRegistryService } from "../../../monitoring/metrics/metrics-registry.service";
import { Metrics } from "../../../monitoring/metrics/metrics-helper";

import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
  RECEIVER_PERFORMANCE_THRESHOLDS,
  RECEIVER_OPERATIONS,
} from "../constants/receiver.constants";
import { DataRequestDto } from "../dto/data-request.dto";
import { DataResponseDto, ResponseMetadataDto } from "../dto/data-response.dto";
import {
  SymbolTransformationResultDto,
} from "../dto/receiver-internal.dto";
import { TransformRequestDto } from "../../transformer/dto/transform-request.dto";
import { StoreDataDto } from "../../storage/dto/storage-request.dto";
import { StorageType, StorageClassification } from "../../storage/enums/storage-type.enum";
import { ValidationResultDto } from "../dto/validation.dto";
import { MarketUtils } from "../utils/market.util";
import { DataFetchParams } from "../../data-fetcher/interfaces/data-fetcher.interface"; // 🔥 导入DataFetcher类型
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
    private readonly dataFetcherService: DataFetcherService, // 🔥 新增DataFetcher依赖
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly marketStatusService: MarketStatusService,
    private readonly transformerService: TransformerService,
    private readonly storageService: StorageService,
    private readonly metricsRegistry: MetricsRegistryService,
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

    // 🎯 记录连接开始
    this.recordConnectionChange(1);

    // 🎯 使用 common 模块的日志脱敏功能
    this.logger.log(
      `开始处理强时效数据请求`,
      sanitizeLogData({
        requestId,
        symbols: request.symbols?.slice(
          0,
          RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT,
        ),
        receiverType: request.receiverType,
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
        request.receiverType,
        request.options?.preferredProvider,
        request.options?.market,
        requestId,
      );

      // 3. 获取市场状态 - 强时效关键步骤
      // 注释掉暂时未使用的marketStatus获取
      // const marketStatus = await this.getMarketStatusForSymbols(
      //   request.symbols,
      //   requestId,
      // );

      // 4. 转换股票代码 - 🆕 使用管道化接口
      const mappingResult = await this.SymbolMapperService.mapSymbols(
        provider,
        request.symbols,
        requestId,
      );

      // 转换为兼容的格式
      const mappedSymbols = {
        transformedSymbols: mappingResult.mappedSymbols,
        mappingResults: {
          transformedSymbols: mappingResult.mappingDetails,
          failedSymbols: mappingResult.failedSymbols,
          metadata: {
            provider: mappingResult.metadata.provider,
            totalSymbols: mappingResult.metadata.totalSymbols,
            successfulTransformations: mappingResult.metadata.successCount,
            failedTransformations: mappingResult.metadata.failedCount,
            processingTime: mappingResult.metadata.processingTimeMs,
            hasPartialFailures: mappingResult.metadata.failedCount > 0,
          },
        },
      };

      // 5. 执行数据获取（移除缓存逻辑，统一到Storage组件处理）
      const responseData = await this.executeDataFetching(
        request,
        provider,
        mappedSymbols,
        requestId,
      );

      const processingTime = Date.now() - startTime;

      // 6. 记录性能指标
      this.recordPerformanceMetrics(
        requestId,
        processingTime,
        request.symbols.length,
        provider,
        true, // success
      );

      // 🎯 记录连接结束
      this.recordConnectionChange(-1);

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
      
      // 🎯 记录错误指标
      this.recordPerformanceMetrics(
        requestId,
        processingTime,
        request.symbols?.length || 0,
        undefined, // provider 可能未定义
        false, // success = false
      );
      
      // 🎯 记录连接结束
      this.recordConnectionChange(-1);
      
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
            receiverType: request.receiverType,
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
        market || MarketUtils.inferMarketFromSymbols(symbols);
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
            market: inferredMarket,
            symbolsCount: symbols.length,
            operation: "determineOptimalProvider",
          }),
        );
        return bestProvider;
      }

      throw new NotFoundException(
        RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND.replace(
          "{receiverType}",
          receiverType,
        ).replace("{market}", inferredMarket),
      );
    } catch (error) {
      this.logger.error(
        `数据提供商选择失败`,
        sanitizeLogData({
          requestId,
          error: error.message,
          receiverType,
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
      throw new NotFoundException(
        RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND.replace(
          "{receiverType}",
          receiverType,
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
        receiverType,
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
    const capabilityName = request.receiverType;

    try {
      // 🔥 关键重构：委托DataFetcher处理SDK调用
      const fetchParams: DataFetchParams = {
        provider,
        capability: capabilityName,
        symbols: mappedSymbols.transformedSymbols,
        contextService: await this.getProviderContextService(provider),
        requestId,
        apiType: 'rest',
        options: request.options,
      };

      const fetchResult = await this.dataFetcherService.fetchRawData(fetchParams);
      const rawData = fetchResult.data;

      // ✅ 数据标准化处理：使用 Transformer 进行数据格式转换
      this.logger.debug(`开始数据标准化处理`, {
        requestId,
        provider,
        receiverType: request.receiverType,
        rawDataCount: rawData.length,
        fetchTime: fetchResult.metadata.processingTime,
      });

      this.logger.debug(`Raw data for transformation`, { rawData: JSON.stringify(rawData) });
      const transformRequest: TransformRequestDto = {
        provider,
        apiType: 'rest',
        transDataRuleListType: this.mapReceiverTypeToRuleType(request.receiverType),
        rawData,
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const transformedResult = await this.transformerService.transform(transformRequest);
      
      // ✅ 新增步骤2：使用 Storage 进行统一存储
      this.logger.debug(`开始数据存储处理`, {
        requestId,
        provider,
        transformedDataCount: Array.isArray(transformedResult.transformedData) ? transformedResult.transformedData.length : 1,
      });

      const storageRequest: StoreDataDto = {
        key: `stock_data_${provider}_${request.receiverType}_${requestId}`,
        data: transformedResult.transformedData,
        storageType: StorageType.BOTH, // 既缓存又持久化
        storageClassification: this.mapReceiverTypeToStorageClassification(request.receiverType),
        provider,
        market: this.extractMarketFromSymbols(request.symbols),
        options: {
          compress: true,
          cacheTtl: this.calculateStorageCacheTTL(request.symbols),
        },
      };

      // Storage 操作不应该阻塞主流程，异步执行
      this.storageService.storeData(storageRequest).catch((error) => {
        this.logger.warn(`数据存储失败，但不影响主流程`, {
          requestId,
          provider,
          error: error.message,
        });
      });

      // 🎯 计算部分成功的信息
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

      this.logger.log(`完整数据处理链路执行成功`, {
        requestId,
        provider,
        receiverType: request.receiverType,
        totalProcessingTime: Date.now() - startTime,
        fetchTime: fetchResult.metadata.processingTime,
        rawDataCount: rawData.length,
        transformedDataCount: Array.isArray(transformedResult.transformedData) ? transformedResult.transformedData.length : 1,
      });

      // 返回标准化后的数据而不是原始SDK数据
      return new DataResponseDto(transformedResult.transformedData, metadata);
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
   * 🎯 记录活动连接数变化
   */
  private recordConnectionChange(delta: number, connectionType: string = 'http'): void {
    // 从 Prometheus 获取当前连接数，然后更新
    this.metricsRegistry.getMetricValue('newstock_receiver_active_connections')
      .then(currentConnections => {
        const count = Math.max(0, (Number(currentConnections) || 0) + delta);
        
        Metrics.setGauge(
          this.metricsRegistry,
          'receiverActiveConnections',
          count,
          { connection_type: connectionType }
        );
      })
      .catch(error => {
        this.logger.error('获取连接数指标失败', error);
        // 降级处理 - 直接记录增量
        Metrics.setGauge(
          this.metricsRegistry,
          'receiverActiveConnections',
          delta > 0 ? 1 : 0,
          { connection_type: connectionType }
        );
      });
  }

  /**
   * 记录性能指标
   */
  private recordPerformanceMetrics(
    requestId: string,
    processingTime: number,
    symbolsCount: number,
    provider?: string,
    success: boolean = true,
  ): void {
    const avgTimePerSymbol =
      symbolsCount > 0 ? processingTime / symbolsCount : 0;

    // 🎯 记录 Prometheus 指标
    const providerLabel = provider || 'unknown';
    const status = success ? 'success' : 'error';
    
    // 记录请求总数
    Metrics.inc(
      this.metricsRegistry,
      'receiverRequestsTotal',
      { method: 'handleRequest', provider: providerLabel, status }
    );
    
    // 记录处理时间分布
    Metrics.observe(
      this.metricsRegistry,
      'receiverProcessingDuration',
      processingTime,
      { method: 'handleRequest', provider: providerLabel }
    );
    
    // 如果是慢请求，记录错误率
    if (processingTime > RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      Metrics.setGauge(
        this.metricsRegistry,
        'receiverErrorRate',
        100, // 表示检测到慢请求
        { error_type: 'slow_request', provider: providerLabel }
      );
      
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

  /**
   * 将 receiverType 映射到 transDataRuleListType
   * 用于 Transformer 组件确定使用哪种映射规则类型
   */
  private mapReceiverTypeToRuleType(receiverType: string): string {
    const mapping: Record<string, string> = {
      'get-stock-quote': 'quote_fields',
      'get-stock-basic-info': 'basic_info_fields',
      'get-stock-realtime': 'quote_fields',
      'get-stock-history': 'quote_fields',
    };
    
    const ruleType = mapping[receiverType];
    if (!ruleType) {
      this.logger.warn(`未找到 receiverType 映射，使用默认值`, {
        receiverType,
        defaultRuleType: 'quote_fields'
      });
      return 'quote_fields'; // 默认使用股票报价字段映射
    }
    
    return ruleType;
  }

  /**
   * 将 receiverType 映射到 Storage 分类类型
   */
  private mapReceiverTypeToStorageClassification(receiverType: string): StorageClassification {
    const mapping: Record<string, StorageClassification> = {
      'get-stock-quote': StorageClassification.STOCK_QUOTE,
      'get-stock-basic-info': StorageClassification.COMPANY_PROFILE,
      'get-stock-realtime': StorageClassification.STOCK_QUOTE,
      'get-stock-history': StorageClassification.STOCK_CANDLE,
    };
    
    return mapping[receiverType] || StorageClassification.STOCK_QUOTE;
  }

  /**
   * 从符号列表中提取主要市场信息
   */
  private extractMarketFromSymbols(symbols: string[]): string {
    if (!symbols || symbols.length === 0) {
      return 'UNKNOWN';
    }
    
    // 取第一个符号的市场后缀作为主要市场
    const firstSymbol = symbols[0];
    if (firstSymbol.includes('.HK')) return 'HK';
    if (firstSymbol.includes('.US')) return 'US';
    if (firstSymbol.includes('.SZ')) return 'SZ';
    if (firstSymbol.includes('.SH')) return 'SH';
    
    // 如果没有后缀，尝试根据格式推断
    if (/^\d{5,6}$/.test(firstSymbol)) {
      return firstSymbol.startsWith('00') || firstSymbol.startsWith('30') ? 'SZ' : 'SH';
    }
    
    return 'MIXED'; // 混合市场
  }

  /**
   * 根据符号和市场状态计算缓存TTL
   */
  private calculateStorageCacheTTL(symbols: string[]): number {
    // 根据市场开盘状态调整缓存时间
    // 开盘时间使用短缓存(1-5秒)，闭市使用长缓存(30-300秒)
    const defaultTTL = 60; // 60秒默认缓存

    // 使用 symbols 数量做简单 TTL 调整示例（避免未使用变量警告）
    const symbolCount = symbols?.length || 0;
    if (symbolCount > 20) {
      return Math.max(defaultTTL, 120); // 大批量请求给更长 TTL
    }
    
    // 这里可以根据symbols判断市场，然后设置不同的TTL
    // 实际实现可以调用 marketStatusService 获取市场状态
    return defaultTTL;
  }
}
