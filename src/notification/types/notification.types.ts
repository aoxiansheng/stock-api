/**
 * Notification模块类型定义
 * 🎯 通知相关的所有类型定义
 * 
 * @description 从Alert模块拆分出来的通知相关类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知渠道类型枚举
 */
export const NotificationChannelType = {
  EMAIL: "email",
  WEBHOOK: "webhook", 
  SLACK: "slack",
  LOG: "log",
  SMS: "sms",
  DINGTALK: "dingtalk",
} as const;

export type NotificationChannelType =
  (typeof NotificationChannelType)[keyof typeof NotificationChannelType];

/**
 * 通知状态枚举
 */
export const NotificationStatus = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETRY: "retry",
} as const;

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

/**
 * 通知优先级枚举
 */
export const NotificationPriority = {
  LOW: "low",
  NORMAL: "normal", 
  HIGH: "high",
  URGENT: "urgent",
  CRITICAL: "critical",
} as const;

export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

/**
 * 通知渠道配置接口
 */
export interface NotificationChannel extends BaseEntity {
  name: string;
  type: NotificationChannelType;
  config: Record<string, any>;
  enabled: boolean;
  retryCount?: number;
  timeout?: number;
  priority?: NotificationPriority;
  description?: string;
  tags?: Record<string, string>;
}

/**
 * 通知实例接口
 */
export interface Notification extends BaseEntity {
  /** 关联的警告ID */
  alertId: string;
  /** 使用的通知渠道ID */
  channelId: string;
  /** 通知渠道类型 */
  channelType: NotificationChannelType;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  content: string;
  /** 发送状态 */
  status: NotificationStatus;
  /** 优先级 */
  priority: NotificationPriority;
  /** 目标接收者 */
  recipient: string;
  /** 发送时间 */
  sentAt?: Date;
  /** 投递时间 */
  deliveredAt?: Date;
  /** 失败时间 */
  failedAt?: Date;
  /** 错误信息 */
  errorMessage?: string;
  /** 重试次数 */
  retryCount: number;
  /** 发送耗时(ms) */
  duration?: number;
  /** 扩展元数据 */
  metadata?: Record<string, any>;
}

/**
 * 通知日志接口
 */
export interface NotificationLog {
  id: string;
  /** 通知ID */
  notificationId: string;
  /** 警告ID */
  alertId: string;
  /** 渠道ID */
  channelId: string;
  /** 渠道类型 */
  channelType: NotificationChannelType;
  /** 是否成功 */
  success: boolean;
  /** 消息内容 */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 发送时间 */
  sentAt: Date;
  /** 持续时间 */
  duration: number;
  /** 重试次数 */
  retryCount: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 通知结果接口
 */
export interface NotificationResult {
  success: boolean;
  channelId: string;
  channelType: NotificationChannelType;
  message?: string;
  error?: string;
  sentAt: Date;
  duration: number;
  retryCount?: number;
  deliveryId?: string; // 第三方服务返回的投递ID
}

/**
 * 批量通知结果接口
 */
export interface BatchNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
  duration: number;
  summary: {
    byChannel: Record<NotificationChannelType, {
      total: number;
      successful: number;
      failed: number;
    }>;
    byStatus: Record<NotificationStatus, number>;
  };
}

/**
 * 通知发送器接口
 */
export interface NotificationSender {
  type: NotificationChannelType;
  
  /**
   * 发送通知
   */
  send(
    notification: Notification,
    channelConfig: Record<string, any>,
  ): Promise<NotificationResult>;
  
  /**
   * 测试通知渠道
   */
  test(config: Record<string, any>): Promise<boolean>;
  
  /**
   * 验证渠道配置
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  };
  
  /**
   * 获取发送器支持的配置选项
   */
  getConfigSchema(): Record<string, any>;
}

/**
 * 通知模板接口
 */
export interface NotificationTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板类型 */
  type: 'alert_fired' | 'alert_resolved' | 'alert_acknowledged' | 'alert_suppressed' | 'alert_escalated';
  /** 适用的通知渠道 */
  channels: NotificationChannelType[];
  /** 标题模板 */
  titleTemplate: string;
  /** 内容模板 */
  contentTemplate: string;
  /** 模板变量 */
  variables: Record<string, {
    type: 'string' | 'number' | 'date' | 'boolean';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  /** 模板格式 */
  format?: "text" | "html" | "markdown";
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 通知查询条件接口
 */
export interface NotificationQuery {
  alertId?: string;
  channelId?: string;
  channelType?: NotificationChannelType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  recipient?: string;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * 通知统计接口
 */
export interface NotificationStats {
  /** 统计时间 */
  timestamp: Date;
  /** 统计周期 */
  period: string;
  /** 总通知数 */
  totalNotifications: number;
  /** 成功发送数 */
  successfulNotifications: number;
  /** 失败发送数 */
  failedNotifications: number;
  /** 平均发送时间 */
  averageSendTime: number;
  /** 按渠道统计 */
  byChannel: Record<NotificationChannelType, {
    total: number;
    successful: number;
    failed: number;
    averageSendTime: number;
  }>;
  /** 按优先级统计 */
  byPriority: Record<NotificationPriority, {
    total: number;
    successful: number;
    failed: number;
  }>;
  /** 按状态统计 */
  byStatus: Record<NotificationStatus, number>;
}