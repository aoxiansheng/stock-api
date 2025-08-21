/**
 * 数据获取服务接口定义
 * 
 * 定义第三方SDK数据获取的标准接口，支持多种数据源和获取方式
 */

/**
 * 数据获取参数接口
 */
export interface DataFetchParams {
  /** 数据提供商名称 */
  provider: string;

  /** 能力名称 (如: get-stock-quote) */
  capability: string;

  /** 股票代码列表 */
  symbols: string[];

  /**
   * API类型 ('rest' | 'stream')
   * @deprecated 后端已拆分REST与流式能力，请使用专用的stream-data-fetcher服务处理流式数据
   */
  apiType?: 'rest' | 'stream';

  /** 提供商上下文服务 */
  contextService?: any;

  /** 请求ID，用于日志追踪 */
  requestId: string;


  /** 其他选项 */
  options?: Record<string, any>;
}

/**
 * 原始数据获取结果接口
 */
export interface RawDataResult {
  /** 原始数据 */
  data: any[];

  /** 元数据信息 */
  metadata: {
    /** 提供商名称 */
    provider: string;

    /** 能力名称 */
    capability: string;

    /** 处理时间戳 */
    processingTime: number;

    /** 成功处理的股票代码数量 */
    symbolsProcessed: number;

    /** 失败的股票代码列表 */
    failedSymbols?: string[];

    /** 错误信息 */
    errors?: string[];
  };
}

/**
 * 数据获取器接口
 */
export interface IDataFetcher {
  /**
   * 从第三方SDK获取原始数据
   * 
   * @param params 获取参数
   * @returns 原始数据结果
   */
  fetchRawData(params: DataFetchParams): Promise<RawDataResult>;

  /**
   * 检查提供商是否支持指定的能力
   * 
   * @param provider 提供商名称
   * @param capability 能力名称
   * @returns 是否支持
   */
  supportsCapability(provider: string, capability: string): Promise<boolean>;

  /**
   * 获取提供商的上下文服务
   * 
   * @param provider 提供商名称
   * @returns 上下文服务实例
   */
  getProviderContext(provider: string): Promise<any>;
}