import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { createLogger, sanitizeLogData } from "@app/config/logger.config";
// import { MarketStatus } from "@common/constants/market-trading-hours.constants";
// import { Market } from "@common/constants/market.constants"; // 已由cache-request.utils提供

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SYSTEM_STATUS_EVENTS } from '../../../../monitoring/contracts/events/system-status.events';

import { RequestContext } from "../interfaces/request-context.interface";

import { CapabilityRegistryService } from "../../../../providers/services/capability-registry.service";
import {
  MarketStatusService,
  // MarketStatusResult,
} from "../../../shared/services/market-status.service";
import { SymbolTransformerService } from "../../../02-processing/symbol-transformer/services/symbol-transformer.service";
import { SmartCacheOrchestrator } from "../../../05-caching/smart-cache/services/smart-cache-orchestrator.service";
import { CacheStrategy } from "../../../05-caching/smart-cache/interfaces/smart-cache-orchestrator.interface";
import { buildCacheOrchestratorRequest } from "../../../05-caching/smart-cache/utils/smart-cache-request.utils";
import { DataFetcherService } from "../../../03-fetching/data-fetcher/services/data-fetcher.service"; // 🔥 新增DataFetcher导入
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { StorageService } from "../../../04-storage/storage/services/storage.service";

import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
  RECEIVER_PERFORMANCE_THRESHOLDS,
  RECEIVER_OPERATIONS,
} from "../constants/receiver.constants";
import { DataRequestDto } from "../dto/data-request.dto";
import { DataResponseDto, ResponseMetadataDto, FailureDetailDto } from "../dto/data-response.dto";
import {
  SymbolTransformationResultDto,
} from "../dto/receiver-internal.dto";
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import { StoreDataDto } from "../../../04-storage/storage/dto/storage-request.dto";
import { StorageType } from '../../../04-storage/storage/enums/storage-type.enum';
import { StorageClassification } from '../../../shared/types/storage-classification.enum';
import { ValidationResultDto } from "../dto/validation.dto";
import { MarketUtils } from "../utils/market.util";
import { DataFetchParams } from "../../../03-fetching/data-fetcher/interfaces/data-fetcher.interface"; // 🔥 导入DataFetcher类型
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
  private activeConnections = 0;

  // 🎯 使用 common 模块的常量，无需重复定义

  constructor(
    // 🔄 数据处理核心依赖
    private readonly symbolTransformerService: SymbolTransformerService, // 🆕 新增SymbolTransformer依赖
    private readonly dataFetcherService: DataFetcherService, // 🔥 新增DataFetcher依赖
    private readonly dataTransformerService: DataTransformerService,
    private readonly storageService: StorageService,
    
    // 🎯 服务注册与状态依赖  
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly marketStatusService: MarketStatusService,
    
    // ✅ 事件化监控依赖 - 符合监控组件集成规范
    private readonly eventBus: EventEmitter2, // 替换CollectorService，使用事件驱动监控
    private readonly smartCacheOrchestrator: SmartCacheOrchestrator,  // 🔑 关键: 注入智能缓存编排器
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

    // ✅ 记录连接开始
    this.updateActiveConnections(1);

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

      // 3. 🔑 智能缓存编排器集成 - 强时效缓存策略
      const useSmartCache = request.options?.useSmartCache !== false; // 默认启用
      if (useSmartCache) {
        // 获取市场状态用于缓存策略决策
        const { inferMarketFromSymbol } = await import("../../../05-caching/smart-cache/utils/smart-cache-request.utils.js");
        const markets = [...new Set(request.symbols.map(symbol => inferMarketFromSymbol(symbol)))];
        const marketStatus = await this.marketStatusService.getBatchMarketStatus(markets);

        // 构建编排器请求
        const orchestratorRequest = buildCacheOrchestratorRequest({
          symbols: request.symbols,
          receiverType: request.receiverType,
          provider,
          queryId: requestId,
          marketStatus,
          strategy: CacheStrategy.STRONG_TIMELINESS, // Receiver 强时效策略
          executeOriginalDataFlow: () => this.executeOriginalDataFlow(request, requestId),
        });

        // 使用编排器获取数据
        const result = await this.smartCacheOrchestrator.getDataWithSmartCache(orchestratorRequest);

        const processingTime = Date.now() - startTime;

        // ✅ 事件化监控 - 记录成功请求
        this.emitRequestMetrics(
          '/api/v1/receiver/data',    // endpoint
          'POST',                     // method
          200,                        // statusCode
          processingTime,             // duration
          {                          // metadata
            requestId,
            operation: request.receiverType,
            provider: provider || 'unknown',
            symbolsCount: request.symbols.length,
            avgTimePerSymbol: request.symbols.length > 0 ? processingTime / request.symbols.length : 0,
            componentType: 'receiver',
            market: this.extractMarketFromSymbols(request.symbols)
          }
        );

        return new DataResponseDto(
          result.data,
          new ResponseMetadataDto(
            provider,
            request.receiverType,
            requestId,
            processingTime,
            false, // hasPartialFailures
            request.symbols.length, // totalRequested
            request.symbols.length  // successfullyProcessed
          )
        );
      }

      // 4. 传统数据流 - 转换股票代码
      const mappingResult = await this.symbolTransformerService.transformSymbols(
        provider,
        request.symbols,
        'from_standard'
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

      // ✅ 事件化监控 - 记录成功请求
      this.emitRequestMetrics(
        '/api/v1/receiver/data',    // endpoint
        'POST',                     // method
        200,                        // statusCode
        processingTime,             // duration
        {                          // metadata
          requestId,
          operation: request.receiverType,
          provider: provider || 'unknown',
          symbolsCount: request.symbols.length,
          avgTimePerSymbol: request.symbols.length > 0 ? processingTime / request.symbols.length : 0,
          componentType: 'receiver',
          market: this.extractMarketFromSymbols(request.symbols)
        }
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

      // ✅ 事件化监控 - 记录失败请求
      this.emitRequestMetrics(
        '/api/v1/receiver/data',    // endpoint
        'POST',                     // method
        500,                        // statusCode
        processingTime,             // duration
        {                          // metadata
          requestId,
          operation: request.receiverType,
          error: error.message,
          symbolsCount: request.symbols?.length || 0,
          componentType: 'receiver'
        }
      );
      
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
    
    return {
      requestId,
      startTime,
      useSmartCache: request.options?.useSmartCache !== false, // 默认启用
      metadata: {
        symbolsCount: request.symbols?.length || 0,
        receiverType: request.receiverType,
        market: this.extractMarketFromSymbols(request.symbols),
      },
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
      request.options?.market,
      context.requestId,
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

      throw new BadRequestException(
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
   * 🔑 原始数据流执行方法 - 供智能缓存编排器调用
   * 封装了完整的数据获取、转换和存储流程
   */
  private async executeOriginalDataFlow(
    request: DataRequestDto,
    requestId: string,
  ): Promise<any> {
    // 1. 提供商选择
    const provider = await this.determineOptimalProvider(
      request.symbols,
      request.receiverType,
      request.options?.preferredProvider,
      request.options?.market,
      requestId,
    );

    // 2. 符号映射
    const mappingResult = await this.symbolTransformerService.transformSymbols(
      provider,
      request.symbols,
      'from_standard'
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

    // 3. 执行数据获取流程
    const response = await this.executeDataFetching(request, provider, mappedSymbols, requestId);

    // 4. 返回数据（编排器期望的格式）
    return response.data;
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
      const transformRequest: DataTransformRequestDto = {
        provider,
        apiType: 'rest',
        transDataRuleListType: this.mapReceiverTypeToTransDataRuleListType(request.receiverType),
        rawData,
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const transformedResult = await this.dataTransformerService.transform(transformRequest);

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

      // 条件存储：检查storageMode是否允许存储
      if (request.options?.storageMode !== 'none') {
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

      // 构造响应对象，包含失败明细
      const response = new DataResponseDto(transformedResult.transformedData, metadata);
      if (mappedSymbols.mappingResults.metadata.hasPartialFailures && mappedSymbols.mappingResults.failedSymbols?.length > 0) {
        response.failures = mappedSymbols.mappingResults.failedSymbols.map(symbol => ({
          symbol,
          reason: '符号映射失败或数据获取失败',
        } as FailureDetailDto));
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

      throw new BadRequestException(
        RECEIVER_ERROR_MESSAGES.VALIDATION_FAILED.replace(
          "{error}",
          error.message,
        ),
      );
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
    processingTime: number,
    metadata: Record<string, any>
  ): void {
    // ✅ 使用 setImmediate 确保异步处理，不阻塞业务逻辑
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: 'receiver',
        metricType: 'api',
        metricName: 'request_processed',
        metricValue: processingTime,
        tags: {
          endpoint,
          method,
          status_code: statusCode,
          component: 'receiver',
          operation: metadata.operation || 'unknown',
          provider: metadata.provider || 'unknown',
          symbols_count: metadata.symbolsCount || 0,
          market: metadata.market || 'unknown'
        }
      });
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
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: 'receiver',
        metricType: 'connection',
        metricName: 'active_connections',
        metricValue: this.activeConnections,
        tags: {
          component: 'receiver',
          operation: delta > 0 ? 'connect' : 'disconnect',
          connection_delta: delta,
          uptime: process.uptime()
        }
      });
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
    const mapping: Record<string, string> = {
      'get-stock-quote': 'quote_fields',
      'get-stock-basic-info': 'basic_info_fields',
      'get-stock-realtime': 'quote_fields',
      'get-stock-history': 'quote_fields',
      'get-index-quote': 'index_fields',
      'get-market-status': 'market_status_fields'

    };

    const transDataRuleListType = mapping[receiverType];
    if (!transDataRuleListType) {
      this.logger.warn(`未找到 receiverType 映射，使用默认值`, {
        receiverType,
        defaultTransDataRuleListType: 'quote_fields'
      });
      return 'quote_fields'; // 默认使用股票报价字段映射
    }

    return transDataRuleListType;
  }

  /**
   * 将 receiverType 映射到 Storage 分类类型
   */
  private mapReceiverTypeToStorageClassification(receiverType: string): StorageClassification {
    const mapping: Record<string, StorageClassification> = {
      'get-stock-quote': StorageClassification.STOCK_QUOTE,
      'get-stock-basic-info': StorageClassification.STOCK_BASIC_INFO,
      'get-stock-realtime': StorageClassification.STOCK_QUOTE,
      'get-stock-history': StorageClassification.STOCK_CANDLE,
      'get-index-quote': StorageClassification.INDEX_QUOTE,
      'get-market-status': StorageClassification.MARKET_STATUS,
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
