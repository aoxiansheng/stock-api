/**
 * 事件总线接口
 * 🎯 提供统一的事件通信机制
 *
 * @description 支持模块间松耦合的事件驱动通信
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

/**
 * 事件总线消息包装器
 * 为所有跨模块事件提供统一的消息格式
 */
export interface EventBusMessage<TPayload = any> {
  /**
   * 事件类型标识符
   * 格式: {source}.{action} 如: 'alert.fired', 'notification.sent'
   */
  eventType: string;

  /**
   * 事件来源模块
   */
  source: string;

  /**
   * 目标模块（可选）
   * 为空表示广播事件
   */
  target?: string;

  /**
   * 事件发生时间
   */
  timestamp: Date;

  /**
   * 关联ID，用于追踪事件链
   */
  correlationId: string;

  /**
   * 事件数据载荷
   */
  payload: TPayload;

  /**
   * 事件元数据
   */
  metadata?: {
    /**
     * 事件版本，支持向后兼容
     */
    version?: string;

    /**
     * 事件优先级
     */
    priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

    /**
     * 重试配置
     */
    retry?: {
      maxAttempts: number;
      backoffMs: number;
    };

    /**
     * 扩展属性
     */
    [key: string]: any;
  };
}

/**
 * 事件处理结果
 */
export interface EventHandleResult {
  /**
   * 处理是否成功
   */
  success: boolean;

  /**
   * 处理器标识
   */
  handlerId: string;

  /**
   * 处理时间戳
   */
  handledAt: Date;

  /**
   * 处理耗时（毫秒）
   */
  duration: number;

  /**
   * 错误信息（如果失败）
   */
  error?: string;

  /**
   * 处理结果数据
   */
  result?: any;
}

/**
 * 事件处理器接口
 */
export interface EventHandler<TPayload = any> {
  /**
   * 处理器唯一标识
   */
  readonly handlerId: string;

  /**
   * 支持的事件类型列表
   */
  readonly supportedEvents: string[];

  /**
   * 处理事件
   */
  handle(message: EventBusMessage<TPayload>): Promise<EventHandleResult>;

  /**
   * 判断是否能处理指定事件
   */
  canHandle(eventType: string): boolean;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  /**
   * 发布事件
   */
  publish<TPayload = any>(message: EventBusMessage<TPayload>): Promise<void>;

  /**
   * 订阅事件
   */
  subscribe<TPayload = any>(
    eventType: string,
    handler: EventHandler<TPayload>,
  ): Promise<void>;

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handlerId: string): Promise<void>;

  /**
   * 获取订阅统计
   */
  getSubscriptionStats(): Promise<Record<string, number>>;
}

/**
 * 事件总线配置
 */
export interface EventBusConfig {
  /**
   * 最大重试次数
   */
  maxRetries: number;

  /**
   * 重试退避时间（毫秒）
   */
  retryBackoffMs: number;

  /**
   * 事件处理超时时间（毫秒）
   */
  handlerTimeoutMs: number;

  /**
   * 是否启用事件持久化
   */
  enablePersistence: boolean;

  /**
   * 是否启用死信队列
   */
  enableDeadLetterQueue: boolean;
}

/**
 * 常用事件类型常量
 */
export const EVENT_TYPES = {
  ALERT: {
    FIRED: "alert.fired",
    RESOLVED: "alert.resolved",
    ACKNOWLEDGED: "alert.acknowledged",
    SUPPRESSED: "alert.suppressed",
    ESCALATED: "alert.escalated",
  },
  NOTIFICATION: {
    SENT: "notification.sent",
    FAILED: "notification.failed",
    DELIVERED: "notification.delivered",
    CHANNEL_TESTED: "notification.channel_tested",
  },
  SYSTEM: {
    HEALTH_CHECK: "system.health_check",
    MAINTENANCE: "system.maintenance",
    SHUTDOWN: "system.shutdown",
  },
} as const;
