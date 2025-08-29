/**
 * 请求上下文接口
 * 用于在handleRequest方法的各个子方法间传递共享数据
 */

export interface RequestContext {
  /** 请求唯一标识符 */
  requestId: string;

  /** 请求开始时间戳 */
  startTime: number;

  /** 选择的数据提供商 */
  provider?: string;

  /** 处理时长(毫秒) */
  processingTime?: number;

  /** 是否使用智能缓存 */
  useSmartCache: boolean;

  /** 请求来源信息 */
  metadata: {
    symbolsCount: number;
    receiverType: string;
    market?: string;
  };
}