import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createLogger, sanitizeLogData } from '@app/config/logger.config';
import { CapabilityRegistryService } from '../../../../providers/services/capability-registry.service';
import { CollectorService } from '../../../../monitoring/collector/collector.service';
import {
  IDataFetcher,
  DataFetchParams,
  RawDataResult,
} from '../interfaces/data-fetcher.interface';
import { CapabilityExecuteResult } from '../interfaces/capability-execute-result.interface';
import {
  DataFetchRequestDto,
  DataFetchResponseDto,
  DataFetchMetadataDto,
} from '../dto';
import {
  DATA_FETCHER_ERROR_MESSAGES,
  DATA_FETCHER_WARNING_MESSAGES,
  DATA_FETCHER_PERFORMANCE_THRESHOLDS,
  DATA_FETCHER_OPERATIONS,
  DATA_FETCHER_DEFAULT_CONFIG,
} from '../constants/data-fetcher.constants';

/**
 * 遗留原始数据类型定义 - 向后兼容
 */
interface LegacyRawData {
  [key: string]: any;
}

/**
 * processRawData方法的输入类型联合
 * 支持新的CapabilityExecuteResult格式和向后兼容的遗留格式
 */
type ProcessRawDataInput = CapabilityExecuteResult | LegacyRawData | any[];

/**
 * 数据获取服务
 * 
 * 专门负责从第三方SDK获取原始数据，解耦Receiver组件的职责
 * 支持多种数据提供商和能力类型
 */
@Injectable()
export class DataFetcherService implements IDataFetcher {
  private readonly logger = createLogger(DataFetcherService.name);
  
  /**
   * 批处理并发限制数量 - 通过环境变量配置，防止高并发场景资源耗尽
   */
  private readonly BATCH_CONCURRENCY_LIMIT = parseInt(
    process.env.DATA_FETCHER_BATCH_CONCURRENCY || '10'
  );

  constructor(
    private readonly capabilityRegistryService: CapabilityRegistryService,
    private readonly collectorService: CollectorService,
  ) {}

  /**
   * 从第三方SDK获取原始数据
   * 
   * @param params 获取参数
   * @returns 原始数据结果
   */
  async fetchRawData(params: DataFetchParams): Promise<RawDataResult> {
    const startTime = Date.now();
    const { provider, capability, symbols, contextService, requestId } = params;

    this.logger.debug('开始获取原始数据', 
      sanitizeLogData({
        requestId,
        provider,
        capability,
        symbolsCount: symbols.length,
        symbols: symbols.slice(0, DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT),
        operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      })
    );

    try {
      // 1. 验证提供商能力
      const cap = await this.getCapability(provider, capability);
      
      // 2. 准备执行参数 - 简化：统一通过options传递，移除重复参数
      const executionParams = {
        symbols,
        contextService,
        requestId,
        options: {
          apiType: params.apiType || DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE,
          ...params.options, // 合并用户传入的options
        },
      };

      // 3. 执行SDK调用 - 标准化监控：记录外部API调用
      const apiStartTime = Date.now();
      const rawData = await cap.execute(executionParams);
      const apiDuration = Date.now() - apiStartTime;
      
      // 记录API调用指标
      this.collectorService.recordRequest(
        'external_api',
        `${provider}/${capability}`,
        200, // 成功状态码
        apiDuration,
        { requestId, symbolsCount: symbols.length }
      );
      
      // 4. 处理返回数据格式
      const processedData = this.processRawData(rawData);
      
      const processingTime = Date.now() - startTime;
      
      // 💡 系统级性能监控由 src/monitoring/ 全局监控组件统一处理
      // 📁 不得在业务组件中重复实现系统级监控功能
      // 🎯 组件级监控只记录业务相关的性能指标
      
      // 记录额外的性能数据
      this.collectorService.recordRequest(
        '/internal/data-fetcher-metrics',
        'POST',
        200,
        processingTime,
        {
          symbolsCount: symbols.length,
          timePerSymbol: symbols.length > 0 ? processingTime / symbols.length : 0,
          provider,
          capability,
          componentType: 'data_fetcher'
        }
      );
      
      // 6. 构建结果
      const result: RawDataResult = {
        data: processedData,
        metadata: {
          provider,
          capability,
          processingTime,
          symbolsProcessed: symbols.length,
        },
      };

      this.logger.debug('原始数据获取成功', 
        sanitizeLogData({
          requestId,
          provider,
          capability,
          processingTime,
          symbolsProcessed: symbols.length,
          dataCount: processedData.length,
          operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
        })
      );

      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 记录失败的外部API调用
      try {
        this.collectorService.recordRequest(
          'external_api_error',
          `${provider}/${capability}`,
          500, // 错误状态码
          processingTime,
          { 
            requestId, 
            error: error.message, 
            symbolsCount: symbols.length 
          }
        );
      } catch(monitorError) {
        // 忽略监控记录失败
      }
      
      this.logger.error('原始数据获取失败', 
        sanitizeLogData({
          requestId,
          provider,
          capability,
          error: error.message,
          processingTime,
          symbolsCount: symbols.length,
          operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
        })
      );
      
      throw new BadRequestException(
        DATA_FETCHER_ERROR_MESSAGES.DATA_FETCH_FAILED.replace(
          '{error}', 
          error.message
        )
      );
    }
  }

  /**
   * 检查提供商是否支持指定的能力
   * 
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 是否支持
   */
  async supportsCapability(provider: string, capability: string): Promise<boolean> {
    try {
      const cap = this.capabilityRegistryService.getCapability(provider, capability);
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
      const providerInstance = this.capabilityRegistryService.getProvider(provider);
      
      if (!providerInstance) {
        throw new NotFoundException(`Provider ${provider} not registered`);
      }

      if (typeof providerInstance.getContextService !== 'function') {
        throw new NotFoundException(`Provider ${provider} context service not available`);
      }

      // 记录数据库操作 - 获取provider上下文可能涉及数据库查询
      const startTime = Date.now();
      const result = await providerInstance.getContextService();
      const duration = Date.now() - startTime;

      // 记录数据库操作性能指标
      this.collectorService.recordDatabaseOperation(
        'provider_context_query',
        duration,
        true, // 成功标志
        {
          provider,
          operation: 'get_context_service'
        }
      );
      
      return result;
      
    } catch (error) {
      // 简化的错误处理：增强现有异常信息
      if (error instanceof NotFoundException) {
        // 保持原异常类型，增强错误信息
        throw new NotFoundException(
          `${error.message} [Context: DataFetcher.getProviderContext]`
        );
      }
      
      // 增强日志信息
      this.logger.error('Provider context service error', {
        provider,
        error: error.message,
        stack: error.stack, // 添加堆栈信息
        operation: DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT,
      });
      
      throw new ServiceUnavailableException(
        `Provider ${provider} context service failed: ${error.message}`
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
  async fetchBatch(requests: DataFetchRequestDto[]): Promise<DataFetchResponseDto[]> {
    const results: DataFetchResponseDto[] = [];
    
    // 获取动态并发限制
    const concurrencyLimit = this.getBatchConcurrencyLimit();
    
    this.logger.debug('开始批量数据获取', {
      totalRequests: requests.length,
      concurrencyLimit,
      rawLimit: this.BATCH_CONCURRENCY_LIMIT,
      operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
    });
    
    // 分批处理，控制并发数量
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);
      
      this.logger.debug('处理批次', {
        batchIndex: Math.floor(i / concurrencyLimit) + 1,
        batchSize: batch.length,
        concurrencyLimit,
        operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
      });
      
      const batchResults = await Promise.allSettled(
        batch.map(async (request) => this.processSingleRequest(request))
      );
      
      // 转换结果
      const processedResults = batchResults.map(result => 
        result.status === 'fulfilled' 
          ? result.value 
          : this.createErrorResponse(result.reason)
      );
      
      results.push(...processedResults);
    }
    
    // 💡 批量操作的系统级监控由 src/monitoring/ 全局监控组件统一处理
    // 📁 复用现有监控组件，不得新建系统级监控功能
    // 🎯 此处保留业务级监控指标即可
    
    // 记录批量处理详细指标
    this.collectorService.recordRequest(
      '/internal/batch-metrics',
      'POST',
      200,
      0, // 无耗时
      {
        totalRequests: requests.length,
        successCount: results.filter(r => !r.hasPartialFailures).length,
        partialFailuresCount: results.filter(r => r.hasPartialFailures).length,
        componentType: 'data_fetcher',
        operation: 'batch_processing'
      }
    );
    
    this.logger.debug('批量数据获取完成', {
      totalRequests: requests.length,
      successCount: results.filter(r => !r.hasPartialFailures).length,
      partialFailuresCount: results.filter(r => r.hasPartialFailures).length,
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
  private async processSingleRequest(request: DataFetchRequestDto): Promise<DataFetchResponseDto> {
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
      
      const result = await this.fetchRawData(params);
      return DataFetchResponseDto.success(
        result.data,
        result.metadata.provider,
        result.metadata.capability,
        result.metadata.processingTime,
        result.metadata.symbolsProcessed,
      );
    } catch (error) {
      // 统一异常处理：将异常转换为错误响应
      this.logger.error('Single request failed', {
        provider: request.provider,
        capability: request.capability,
        requestId: request.requestId,
        error: error.message,
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
  private async getCapability(provider: string, capability: string): Promise<any> {
    const cap = this.capabilityRegistryService.getCapability(provider, capability);
    
    if (!cap) {
      const errorMessage = DATA_FETCHER_ERROR_MESSAGES.CAPABILITY_NOT_SUPPORTED
        .replace('{provider}', provider)
        .replace('{capability}', capability);
        
      throw new NotFoundException(errorMessage);
    }
    
    return cap;
  }

  /**
   * 处理原始数据格式
   * 
   * 支持新的CapabilityExecuteResult格式，同时保持向后兼容
   * Phase 2: 移除了LongPort特定的secu_quote处理逻辑，改为统一处理
   * 
   * @param rawData SDK返回的原始数据或CapabilityExecuteResult
   * @returns 处理后的数据数组
   */
  private processRawData(rawData: ProcessRawDataInput): any[] {
    // 类型守卫：优先处理新的CapabilityExecuteResult格式
    if (this.isCapabilityExecuteResult(rawData)) {
      const result = rawData as CapabilityExecuteResult;
      
      // 如果是标准CapabilityExecuteResult，直接返回data字段（已经是数组）
      if (Array.isArray(result.data)) {
        return result.data;
      }
      
      // 兜底：如果data不是数组，强制数组化
      return result.data ? [result.data] : [];
    }
    
    // 确保返回数组格式 - 优先检查数组类型
    if (Array.isArray(rawData)) {
      return rawData;
    }
    
    // 向后兼容：处理旧格式数据
    // 注意：LongPort的secu_quote特定逻辑已移除，改为通用处理
    
    // 处理legacy格式: 检查是否有嵌套数据结构
    if (rawData && typeof rawData === 'object') {
      // 通用嵌套数据处理：寻找第一个数组字段
      const keys = Object.keys(rawData);
      for (const key of keys) {
        const value = rawData[key];
        if (Array.isArray(value)) {
          this.logger.debug(`检测到嵌套数据结构，使用字段: ${key}`, {
            operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
            sourceFormat: key,
          });
          return value;
        }
        if (value && typeof value === 'object') {
          // 对于单个嵌套对象，也数组化
          this.logger.debug(`检测到嵌套对象，数组化处理: ${key}`, {
            operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
            sourceFormat: key,
          });
          return [value];
        }
      }
    }
    
    return rawData ? [rawData] : [];
  }

  /**
   * 类型守卫：检查数据是否为CapabilityExecuteResult格式
   * 
   * @param data 待检查的数据
   * @returns 是否为CapabilityExecuteResult类型
   */
  private isCapabilityExecuteResult(data: any): data is CapabilityExecuteResult {
    return data && 
           typeof data === 'object' && 
           'data' in data &&
           (Array.isArray(data.data) || data.data !== undefined);
  }

  /**
   * 创建错误响应
   * 
   * @param error 错误信息
   * @returns 错误响应DTO
   */
  private createErrorResponse(error: any): DataFetchResponseDto {
    const metadata = new DataFetchMetadataDto(
      'unknown',
      'unknown',
      0,
      0,
      [],
      [error.message || '未知错误'],
    );
    
    return new DataFetchResponseDto([], metadata, true);
  }
}