import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createLogger, sanitizeLogData } from '@common/config/logger.config';
import { CapabilityRegistryService } from '../../../../providers/services/capability-registry.service';
import {
  IDataFetcher,
  DataFetchParams,
  RawDataResult,
} from '../interfaces/data-fetcher.interface';
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
} from '../constants/data-fetcher.constants';

/**
 * 数据获取服务
 * 
 * 专门负责从第三方SDK获取原始数据，解耦Receiver组件的职责
 * 支持多种数据提供商和能力类型
 */
@Injectable()
export class DataFetcherService implements IDataFetcher {
  private readonly logger = createLogger(DataFetcherService.name);

  constructor(
    private readonly capabilityRegistryService: CapabilityRegistryService,
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
      
      // 2. 准备执行参数
      const executionParams = {
        symbols,
        contextService,
        requestId,
        context: { 
          apiType: params.apiType || 'rest',
          options: params.options,
        },
        options: params.options,
      };

      // 3. 执行SDK调用
      const rawData = await cap.execute(executionParams);
      
      // 4. 处理返回数据格式
      const processedData = this.processRawData(rawData);
      
      const processingTime = Date.now() - startTime;
      
      // 5. 性能监控
      this.checkPerformance(processingTime, symbols.length, requestId);
      
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
      
      if (providerInstance && typeof providerInstance.getContextService === 'function') {
        return await providerInstance.getContextService();
      }

      this.logger.debug(`提供商 ${provider} 未注册或不支持getContextService方法`, {
        provider,
        hasProvider: !!providerInstance,
        hasContextService: providerInstance && 
          typeof providerInstance.getContextService === 'function',
        operation: DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT,
      });

      return undefined;
      
    } catch (error) {
      this.logger.warn(
        DATA_FETCHER_WARNING_MESSAGES.CONTEXT_SERVICE_WARNING.replace(
          '{warning}', 
          error.message
        ), 
        {
          provider,
          error: error.message,
          operation: DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT,
        }
      );
      
      return undefined;
    }
  }

  /**
   * 批量获取数据 (为未来扩展预留)
   * 
   * @param requests 批量请求
   * @returns 批量结果
   */
  async fetchBatch(requests: DataFetchRequestDto[]): Promise<DataFetchResponseDto[]> {
    const results = await Promise.allSettled(
      requests.map(async (request) => {
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
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : this.createErrorResponse(result.reason)
    );
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
   * @param rawData SDK返回的原始数据
   * @returns 处理后的数据数组
   */
  private processRawData(rawData: any): any[] {
    // 处理特定提供商的嵌套结构，如LongPort的secu_quote
    if (rawData && rawData.secu_quote) {
      return Array.isArray(rawData.secu_quote) ? rawData.secu_quote : [rawData.secu_quote];
    }
    
    // 确保返回数组格式
    if (Array.isArray(rawData)) {
      return rawData;
    }
    
    return rawData ? [rawData] : [];
  }

  /**
   * 检查性能指标
   * 
   * @param processingTime 处理时间
   * @param symbolsCount 符号数量
   * @param requestId 请求ID
   */
  private checkPerformance(
    processingTime: number, 
    symbolsCount: number, 
    requestId: string
  ): void {
    const timePerSymbol = symbolsCount > 0 ? processingTime / symbolsCount : 0;
    
    if (processingTime > DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS) {
      this.logger.warn(
        DATA_FETCHER_WARNING_MESSAGES.SLOW_RESPONSE.replace(
          '{processingTime}', 
          processingTime.toString()
        ),
        sanitizeLogData({
          requestId,
          processingTime,
          symbolsCount,
          timePerSymbol: Math.round(timePerSymbol * 100) / 100,
          threshold: DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS,
          operation: DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA,
        })
      );
    }
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