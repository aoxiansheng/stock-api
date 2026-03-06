import { Injectable, HttpStatus } from "@nestjs/common";
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

/**
 * 原始数据类型定义
 *
 * �� 用户体验价值：支持多Provider格式的数据源
 * - 允许用户使用统一的字段名（如"symbol"）而不必了解每个Provider的特定格式
 * - 自动处理复杂的嵌套数据结构，用户无需关心数据来源的技术细节
 * - 简化配置：用户只需要关心业务字段，无需学习Provider特定的API结构
 *
 * 支持的数据格式示例：
 * - LongPort: { secu_quote: [...] }
 * - 通用格式: { quote_data: [...] }
 * - 扁平数组: [...]
 * - 单个对象: { symbol: "AAPL", price: 150 }
 */
interface RawData {
  [key: string]: any;
}

const STREAM_CAPABILITY_NAMES = new Set<string>([
  CAPABILITY_NAMES.STREAM_STOCK_QUOTE.toLowerCase(),
]);

/**
 * processRawData方法的输入类型联合
 * 支持通用对象格式，通过智能字段检测实现格式自适应
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

  constructor(
    private readonly capabilityRegistryService: ProviderRegistryService,
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
      const rawData = await this.executeCapability(provider, capability, executionParams);
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
   * 处理原始数据格式 - 用户配置简化的核心组件
   *
   * 🎯 用户体验价值：
   * ✅ 配置简化：用户只需配置简单的字段名，无需了解Provider的复杂API结构
   *    - 用户配置：symbol, price, volume
   *    - 而非：secu_quote[0].symbol, secu_quote[0].last_done, secu_quote[0].volume
   * ✅ 多Provider支持：自动适配不同Provider的数据格式，用户无需关心技术差异
   * ✅ 配置保护：保护用户现有配置投资，无需修改已有的字段映射规则
   * ✅ 错误容忍：智能处理异常数据格式，降低系统集成复杂度
   *
   * 支持的数据格式转换：
   * 1. 标准格式：{data: [...]} → 智能检测data字段并提取数组
   * 2. 数组格式：[{symbol: "AAPL"}...] → 保持不变
   * 3. 嵌套格式：{quote_data: [...]} → 基于优先级提取第一个数组字段
   * 4. 对象格式：{symbol: "AAPL", price: 150} → 包装为数组
   * 5. 多层嵌套：{response: {data: [...]}} → 递归解析
   * 6. 空值处理：null/undefined → 返回空数组
   *
   * Phase 2改进：
   * - 移除了特定接口依赖，改为通用的智能字段检测
   * - 支持优先级字段匹配，提升处理效率
   * - 添加多层嵌套数据结构支持
   * - 这使得新Provider接入更简单，用户配置体验更一致
   *
   * @param rawData SDK返回的任意格式原始数据
   * @returns 标准化的数据数组，供后续组件统一处理
   */
  private processRawData(rawData: ProcessRawDataInput): any[] {
    // 确保返回数组格式 - 优先检查数组类型
    if (Array.isArray(rawData)) {
      return rawData.map((item) => this.normalizeRecord(item));
    }

    // 向后兼容：处理旧格式数据
    // 注意：LongPort的secu_quote特定逻辑已移除，改为通用处理

    // 处理legacy格式: 检查是否有嵌套数据结构
    if (rawData && typeof rawData === "object") {
      // Phase 2 增强：支持更多Provider数据格式的智能识别
      const keys = Object.keys(rawData);

      // 优先级排序：常见的数据字段名优先处理，提升性能
      const priorityKeys = [
        'data',           // 通用数据字段
        'quote_data',     // 报价数据字段
        'secu_quote',     // LongPort特定字段
        'results',        // 结果集字段
        'items',          // 项目列表字段
        'records',        // 记录字段
        'list',           // 列表字段
        'quotes',         // 报价列表字段
        'stocks',         // 股票列表字段
      ];

      // 首先检查优先级字段
      for (const priorityKey of priorityKeys) {
        if (keys.includes(priorityKey)) {
          const value = rawData[priorityKey];
          if (Array.isArray(value)) {
            this.logger.debug(`检测到优先级数据格式，使用字段: ${priorityKey}`, {
              operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
              sourceFormat: priorityKey,
              dataSize: value.length,
            });
            return value.map((item) => this.normalizeRecord(item));
          }
          if (value && typeof value === "object") {
            this.logger.debug(`检测到优先级对象格式，数组化处理: ${priorityKey}`, {
              operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
              sourceFormat: priorityKey,
            });
            return [this.normalizeRecord(value)];
          }
        }
      }

      // 其次处理其他字段（保持向后兼容）
      const remainingKeys = keys.filter(key => !priorityKeys.includes(key));

      // 首先处理数组字段
      for (const key of remainingKeys) {
        const value = rawData[key];
        if (Array.isArray(value)) {
          this.logger.debug(`检测到嵌套数据结构，使用字段: ${key}`, {
            operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
            sourceFormat: key,
            dataSize: value.length,
          });
          return value.map((item) => this.normalizeRecord(item));
        }
      }

      // Phase 2 增强：支持多层嵌套数据结构（在对象包装之前）
      // 例如: { response: { data: { quotes: [...] } } }
      for (const key of remainingKeys) {
        const value = rawData[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nestedResult = this.processRawData(value);
          if (nestedResult.length > 0) {
            this.logger.debug(`检测到多层嵌套结构，通过字段解析: ${key}`, {
              operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
              sourceFormat: `nested_${key}`,
              dataSize: nestedResult.length,
            });
            return nestedResult;
          }
        }
      }

      // 最后处理单个对象包装（兜底逻辑）
      for (const key of remainingKeys) {
        const value = rawData[key];
        if (value && typeof value === "object") {
          // 对于单个嵌套对象，也数组化（仅在多层解析失败时执行）
          this.logger.debug(`检测到嵌套对象，数组化处理: ${key}`, {
            operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
            sourceFormat: key,
          });
          return [this.normalizeRecord(value)];
        }
      }
    }

    return rawData ? [this.normalizeRecord(rawData)] : [];
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
