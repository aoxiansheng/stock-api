/**
 * 安全事件接口
 */
export interface SecurityEvent {
  id: string;
  type:
    | "authentication"
    | "authorization"
    | "data_access"
    | "system"
    | "suspicious_activity";
  severity: "critical" | "high" | "medium" | "low" | "info";
  action: string;
  userId?: string;
  apiKeyId?: string;
  clientIP: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
  source: string;
  outcome: "success" | "failure" | "blocked";
}

/**
 * 安全审计日志数据库记录接口
 */
export interface SecurityAuditLog {
  _id?: string;
  eventId: string;
  type: string;
  severity: string;
  action: string;
  userId?: string;
  apiKeyId?: string;
  clientIP: string;
  userAgent: string;
  requestUrl?: string;
  requestMethod?: string;
  responseStatus?: number;
  details: Record<string, any>;
  timestamp: Date;
  source: string;
  outcome: string;
  riskScore: number; // 0-100 风险评分
  tags: string[];
}

/**
 * 审计报告接口
 */
export interface AuditReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    failedAuthentications: number;
    suspiciousActivities: number;
    dataAccessEvents: number;
    uniqueIPs: number;
    uniqueUsers: number;
  };
  topRisks: SecurityEvent[];
  trends: {
    authenticationFailures: number[];
    suspiciousActivities: number[];
    dataAccess: number[];
  };
  recommendations: string[];
}

/**
 * 安全事件类型枚举值
 */
export type SecurityEventType =
  | "authentication"
  | "authorization"
  | "data_access"
  | "system"
  | "suspicious_activity";

/**
 * 安全事件严重程度枚举值
 */
export type SecurityEventSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

/**
 * 安全事件结果枚举值
 */
export type SecurityEventOutcome = "success" | "failure" | "blocked";

/**
 * IP 分析结果接口
 */
export interface IPAnalysisResult {
  requestCount: number;
  failureCount: number;
  lastSeen: Date;
}

/**
 * 安全审计统计接口
 */
export interface SecurityAuditStats {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  eventsByOutcome: Record<SecurityEventOutcome, number>;
  suspiciousIPs: number;
  period: {
    start: Date;
    end: Date;
  };
}
