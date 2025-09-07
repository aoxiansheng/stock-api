/**
 * 告警上下文和元数据类型定义
 * 用于增强类型安全性，替代 Record<string, any>
 */

/**
 * 告警业务上下文
 * 包含告警触发时的业务场景和环境信息
 */
export interface AlertContext {
  // 触发告警的数据源
  dataSource?: string;
  // 触发告警的市场
  market?: string;
  // 触发告警的股票代码
  symbol?: string;
  // 触发告警的指标值
  triggerValue?: number | string;
  // 告警阈值
  threshold?: number | string;
  // 比较操作符
  operator?: string;
  // 触发时间戳
  triggeredAt?: Date | string;
  // 环境信息
  environment?: {
    hostname?: string;
    ip?: string;
    region?: string;
  };
  // 额外的自定义字段
  [key: string]: any;
}

/**
 * 通知运行时元数据
 * 包含通知发送过程中的技术指标和状态信息
 */
export interface NotificationMetadata {
  // 发送开始时间
  sendStartTime?: Date | string;
  // 发送结束时间
  sendEndTime?: Date | string;
  // 发送耗时（毫秒）
  sendDuration?: number;
  // 重试次数
  retryCount?: number;
  // HTTP状态码（适用于webhook）
  httpStatusCode?: number;
  // 响应体（适用于webhook）
  responseBody?: string | object;
  // 错误信息
  errorMessage?: string;
  // 错误堆栈
  errorStack?: string;
  // 通知渠道特定的元数据
  channelSpecific?: {
    // Email相关
    messageId?: string;
    // Slack相关
    channelId?: string;
    threadTs?: string;
    // SMS相关
    phoneNumber?: string;
    // 其他渠道特定字段
    [key: string]: any;
  };
  // 额外的自定义字段
  [key: string]: any;
}

/**
 * 统计元数据
 * 用于告警统计信息
 */
export interface StatsMetadata {
  // 计算时间
  calculatedAt?: Date | string;
  // 统计周期
  period?: string;
  // 数据点数量
  dataPoints?: number;
  // 缓存命中率
  cacheHitRate?: number;
  // 性能指标
  performance?: {
    queryTime?: number;
    processingTime?: number;
    totalTime?: number;
  };
  // 额外的自定义字段
  [key: string]: any;
}