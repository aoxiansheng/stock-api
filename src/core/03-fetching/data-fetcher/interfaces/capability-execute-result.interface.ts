/**
 * 能力层执行结果标准接口
 *
 * 为确保Phase 2迁移成功，所有Provider能力必须遵循此输出格式
 * 这个接口规范将解决供应商特定结构泄漏到通用服务层的问题
 */

/**
 * 能力层执行结果标准接口
 * 所有Provider能力必须遵循此输出格式
 */
export interface CapabilityExecuteResult {
  /** 数据数组，强制数组化输出 */
  data: any[];

  /** 可选元数据信息 */
  metadata?: {
    /** 提供商名称 */
    provider: string;

    /** 处理时间 (毫秒) */
    processingTimeMs: number;

    /** 原始数据格式标识 (如: secu_quote, array, object) */
    sourceFormat?: string;

    /** 数据源版本或API版本 */
    sourceVersion?: string;

    /** 额外的调试信息 */
    debugInfo?: Record<string, any>;
  };

  /** 错误信息（如果有） */
  errors?: string[];

  /** 警告信息（如果有） */
  warnings?: string[];
}

/**
 * Provider能力基础接口
 *
 * 所有Provider能力都应该实现这个接口，确保输出格式一致
 */
export interface IProviderCapability {
  /**
   * 执行能力调用
   *
   * @param params 执行参数
   * @returns 标准化的执行结果
   */
  execute(params: any): Promise<CapabilityExecuteResult>;

  /**
   * 能力名称
   */
  readonly name: string;

  /**
   * 能力描述
   */
  readonly description: string;

  /**
   * 支持的市场列表
   */
  readonly supportedMarkets?: string[];

  /**
   * 支持的符号格式
   */
  readonly supportedSymbolFormats?: string[];
}
