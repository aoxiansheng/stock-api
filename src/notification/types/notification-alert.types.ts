/**
 * Notification模块独立的警告类型定义
 * 🎯 避免对Alert模块的直接依赖，实现完全解耦
 *
 * @description 这些类型仅供notification模块内部使用
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

/**
 * 通知严重程度级别
 * 替代Alert模块的AlertSeverity
 */
export enum NotificationSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * 通知警告状态
 * 替代Alert模块的AlertStatus
 */
export enum NotificationAlertStatus {
  ACTIVE = "ACTIVE",
  RESOLVED = "RESOLVED",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  SUPPRESSED = "SUPPRESSED",
}

/**
 * 通知操作符类型
 * 替代Alert模块的Operator
 */
export enum NotificationOperator {
  GT = "gt", // 大于
  LT = "lt", // 小于
  GTE = "gte", // 大于等于
  LTE = "lte", // 小于等于
  EQ = "eq", // 等于
  NE = "ne", // 不等于
  CONTAINS = "contains", // 包含
  NOT_CONTAINS = "not_contains", // 不包含
}

/**
 * 通知警告数据接口
 * 替代Alert模块的Alert接口
 */
export interface NotificationAlert {
  /**
   * 警告唯一标识
   */
  id: string;

  /**
   * 严重程度
   */
  severity: NotificationSeverity;

  /**
   * 警告状态
   */
  status: NotificationAlertStatus;

  /**
   * 监控指标名称
   */
  metric: string;

  /**
   * 警告描述
   */
  description: string;

  /**
   * 当前指标值
   */
  value?: number;

  /**
   * 阈值
   */
  threshold?: number;

  /**
   * 操作符
   */
  operator?: NotificationOperator;

  /**
   * 标签信息
   */
  tags?: Record<string, string>;

  /**
   * 创建时间
   */
  createdAt: Date;

  /**
   * 更新时间
   */
  updatedAt: Date;

  /**
   * 首次触发时间
   */
  firedAt?: Date;

  /**
   * 解决时间
   */
  resolvedAt?: Date;

  /**
   * 确认时间
   */
  acknowledgedAt?: Date;

  /**
   * 抑制时间
   */
  suppressedAt?: Date;
}

/**
 * 通知警告规则接口
 * 替代Alert模块的AlertRule接口
 */
export interface NotificationAlertRule {
  /**
   * 规则唯一标识
   */
  id: string;

  /**
   * 规则名称
   */
  name: string;

  /**
   * 规则描述
   */
  description?: string;

  /**
   * 监控指标
   */
  metric: string;

  /**
   * 比较操作符
   */
  operator: NotificationOperator;

  /**
   * 阈值
   */
  threshold: number;

  /**
   * 持续时间（秒）
   */
  duration: number;

  /**
   * 严重程度
   */
  severity: NotificationSeverity;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 冷却时间（秒）
   */
  cooldown: number;

  /**
   * 通知渠道配置
   */
  channels: NotificationAlertChannel[];

  /**
   * 标签
   */
  tags?: Record<string, string>;

  /**
   * 创建时间
   */
  createdAt: Date;

  /**
   * 更新时间
   */
  updatedAt: Date;

  /**
   * 创建者
   */
  createdBy?: string;

  /**
   * 更新者
   */
  updatedBy?: string;
}

/**
 * 通知渠道配置接口
 * 替代Alert模块的NotificationChannel接口
 */
export interface NotificationAlertChannel {
  /**
   * 渠道唯一标识
   */
  id: string;

  /**
   * 渠道名称
   */
  name: string;

  /**
   * 渠道类型
   */
  type: string;

  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * 渠道配置参数
   */
  config: Record<string, any>;

  /**
   * 重试次数
   */
  retryCount?: number;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 更新时间
   */
  updatedAt?: Date;
}

/**
 * 通知警告上下文接口
 * 替代Alert模块的AlertContext接口
 */
export interface NotificationAlertContext {
  /**
   * 指标当前值
   */
  metricValue: number;

  /**
   * 阈值
   */
  threshold: number;

  /**
   * 持续时间（秒）
   */
  duration: number;

  /**
   * 比较操作符
   */
  operator: NotificationOperator;

  /**
   * 评估时间
   */
  evaluatedAt: Date;

  /**
   * 历史数据点
   */
  dataPoints?: Array<{
    timestamp: Date;
    value: number;
  }>;

  /**
   * 扩展元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 通知事件数据接口
 * 用于不同类型的事件传递特定信息
 */
export interface NotificationEventData {
  /**
   * 事件类型
   */
  type: "FIRED" | "RESOLVED" | "ACKNOWLEDGED" | "SUPPRESSED" | "ESCALATED";

  /**
   * 事件时间戳
   */
  timestamp: Date;

  /**
   * 操作者（可选）
   */
  operatedBy?: string;

  /**
   * 操作备注（可选）
   */
  comment?: string;

  /**
   * 扩展数据
   */
  additionalData?: Record<string, any>;

  /**
   * 针对特定事件类型的数据
   */
  eventSpecificData?: {
    // 解决事件
    resolvedAt?: Date;
    resolutionComment?: string;

    // 确认事件
    acknowledgedAt?: Date;
    acknowledgmentComment?: string;

    // 抑制事件
    suppressedAt?: Date;
    suppressionDuration?: number;
    suppressionReason?: string;

    // 升级事件
    previousSeverity?: NotificationSeverity;
    newSeverity?: NotificationSeverity;
    escalatedAt?: Date;
    escalationReason?: string;
  };
}

/**
 * 严重程度颜色映射
 */
export const SEVERITY_COLORS = {
  [NotificationSeverity.LOW]: "#28a745", // 绿色
  [NotificationSeverity.MEDIUM]: "#ffc107", // 黄色
  [NotificationSeverity.HIGH]: "#fd7e14", // 橙色
  [NotificationSeverity.CRITICAL]: "#dc3545", // 红色
} as const;

/**
 * 严重程度优先级映射
 */
export const SEVERITY_PRIORITY = {
  [NotificationSeverity.LOW]: 1,
  [NotificationSeverity.MEDIUM]: 2,
  [NotificationSeverity.HIGH]: 3,
  [NotificationSeverity.CRITICAL]: 4,
} as const;

/**
 * 类型工具函数
 */
export class NotificationAlertTypeUtil {
  /**
   * 获取严重程度颜色
   */
  static getSeverityColor(severity: NotificationSeverity): string {
    return (
      SEVERITY_COLORS[severity] || SEVERITY_COLORS[NotificationSeverity.LOW]
    );
  }

  /**
   * 获取严重程度优先级
   */
  static getSeverityPriority(severity: NotificationSeverity): number {
    return (
      SEVERITY_PRIORITY[severity] || SEVERITY_PRIORITY[NotificationSeverity.LOW]
    );
  }

  /**
   * 比较严重程度
   */
  static compareSeverity(
    a: NotificationSeverity,
    b: NotificationSeverity,
  ): number {
    return this.getSeverityPriority(a) - this.getSeverityPriority(b);
  }

  /**
   * 检查操作符是否为数值比较
   */
  static isNumericOperator(operator: NotificationOperator): boolean {
    return [
      NotificationOperator.GT,
      NotificationOperator.LT,
      NotificationOperator.GTE,
      NotificationOperator.LTE,
      NotificationOperator.EQ,
      NotificationOperator.NE,
    ].includes(operator);
  }

  /**
   * 检查操作符是否为字符串比较
   */
  static isStringOperator(operator: NotificationOperator): boolean {
    return [
      NotificationOperator.CONTAINS,
      NotificationOperator.NOT_CONTAINS,
      NotificationOperator.EQ,
      NotificationOperator.NE,
    ].includes(operator);
  }
}
