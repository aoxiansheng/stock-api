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
   * API类型 ('rest' | 'stream') - 系统核心架构字段
   *
   * 🎯 核心功能：控制数据获取策略和路由分发
   * ✅ 智能调度：系统根据apiType选择REST或WebSocket处理路径
   * ✅ 性能优化：实时数据使用stream，历史数据使用rest
   * ✅ 架构解耦：Receiver组件根据此字段选择处理器
   *
   * 🔧 技术实现：
   * - REST路径：data-fetcher.service.ts 处理
   * - Stream路径：stream-data-fetcher.service.ts 处理
   * - 上层调度：receiver.service.ts 根据apiType进行路由分发
   *
   * ⚠️ 重要：被24个核心组件依赖，是系统架构的基础字段
   */
  apiType?: "rest" | "stream";

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

    /** 处理时间（毫秒） */
    processingTimeMs: number;

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
