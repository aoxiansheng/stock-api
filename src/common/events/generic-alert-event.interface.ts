/**
 * 通用警告事件接口
 * 🎯 提供模块间事件通信的标准化数据结构
 * 
 * @description 为实现Alert和Notification模块完全解耦而设计
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

/**
 * 通用警告严重程度枚举
 * 避免依赖Alert模块的AlertSeverity
 */
export enum GenericAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH', 
  CRITICAL = 'CRITICAL'
}

/**
 * 通用警告状态枚举
 * 避免依赖Alert模块的AlertStatus
 */
export enum GenericAlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SUPPRESSED = 'SUPPRESSED'
}

/**
 * 通用事件类型枚举
 * 定义所有支持的警告事件类型
 */
export enum GenericAlertEventType {
  FIRED = 'FIRED',
  RESOLVED = 'RESOLVED', 
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SUPPRESSED = 'SUPPRESSED',
  ESCALATED = 'ESCALATED'
}

/**
 * 通用通知渠道配置
 * 避免依赖Alert模块的NotificationChannel
 */
export interface GenericNotificationChannel {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  retryCount?: number;
  timeout?: number;
}

/**
 * 通用警告数据结构
 * 包含通知发送所需的所有警告信息
 */
export interface GenericAlert {
  id: string;
  severity: GenericAlertSeverity;
  status: GenericAlertStatus;
  metric: string;
  description: string;
  value?: number;
  threshold?: number;
  tags?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通用警告规则数据结构
 * 包含通知渠道配置信息
 */
export interface GenericAlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  operator: string;
  threshold: number;
  duration: number;
  cooldown: number;
  enabled: boolean;
  channels: GenericNotificationChannel[];
  tags?: Record<string, string>;
}

/**
 * 通用警告上下文数据
 * 包含警告触发时的环境信息
 */
export interface GenericAlertContext {
  metricValue: number;
  threshold: number;
  duration: number;
  operator: string;
  evaluatedAt: Date;
  dataPoints?: Array<{
    timestamp: Date;
    value: number;
  }>;
  metadata?: Record<string, any>;
}

/**
 * 通用警告事件数据结构
 * 所有警告事件的统一数据载体
 */
export interface GenericAlertEvent {
  /**
   * 事件类型
   */
  eventType: GenericAlertEventType;
  
  /**
   * 事件时间戳
   */
  timestamp: Date;
  
  /**
   * 事件关联ID，用于追踪
   */
  correlationId: string;
  
  /**
   * 警告数据
   */
  alert: GenericAlert;
  
  /**
   * 触发规则
   */
  rule: GenericAlertRule;
  
  /**
   * 上下文信息
   */
  context: GenericAlertContext;
  
  /**
   * 事件特定数据
   * 不同事件类型可能包含不同的额外信息
   */
  eventData?: {
    // 解决事件相关
    resolvedBy?: string;
    resolvedAt?: Date;
    resolutionComment?: string;
    
    // 确认事件相关
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    acknowledgmentComment?: string;
    
    // 抑制事件相关
    suppressedBy?: string;
    suppressedAt?: Date;
    suppressionDuration?: number;
    suppressionReason?: string;
    
    // 升级事件相关
    previousSeverity?: GenericAlertSeverity;
    newSeverity?: GenericAlertSeverity;
    escalatedAt?: Date;
    escalationReason?: string;
    
    // 扩展字段
    [key: string]: any;
  };
}

/**
 * 警告事件处理结果
 */
export interface GenericAlertEventResult {
  success: boolean;
  eventId: string;
  handledAt: Date;
  handledBy: string;
  errors?: string[];
  metadata?: Record<string, any>;
}

/**
 * 事件处理器接口
 */
export interface GenericAlertEventHandler {
  /**
   * 处理警告事件
   */
  handle(event: GenericAlertEvent): Promise<GenericAlertEventResult>;
  
  /**
   * 获取支持的事件类型
   */
  getSupportedEventTypes(): GenericAlertEventType[];
}