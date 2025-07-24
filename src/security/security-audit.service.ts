import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Interval } from "@nestjs/schedule";
import { v4 as uuidv4 } from "uuid";

import { createLogger } from "@common/config/logger.config";

import { CacheService } from "../cache/cache.service";
import { securityConfig } from "../common/config/security.config";

import {
  SECURITY_AUDIT_CONFIG,
  SECURITY_AUDIT_EVENT_SEVERITIES,
  SECURITY_AUDIT_EVENT_SOURCES,
  SECURITY_AUDIT_MESSAGES,
  SECURITY_AUDIT_OPERATIONS,
  SECURITY_AUDIT_RECOMMENDATIONS,
  SECURITY_AUDIT_RECOMMENDATION_THRESHOLDS,
  SECURITY_SEVERITY_ORDER,
} from "./constants/security-audit.constants";
import {
  RISK_SCORE_WEIGHTS,
  TAG_GENERATION_RULES,
} from "./constants/security.constants";
import {
  AuditReport,
  SecurityEvent,
} from "./interfaces/security-audit.interface";
import { SecurityAuditLogRepository } from "./repositories/security-audit-log.repository";
import {
  SecurityAuditLog,
  SecurityAuditLogDocument,
} from "./schemas/security-audit-log.schema";

@Injectable()
export class SecurityAuditService implements OnModuleDestroy {
  private readonly logger = createLogger(SecurityAuditService.name);
  // 🎯 使用集中化的配置
  private readonly config = securityConfig.audit;

  constructor(
    // 🎯 移除对 Model 的直接依赖，使用仓储层
    private readonly auditLogRepository: SecurityAuditLogRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  onModuleDestroy() {
    return this.flushAuditLogs().catch((error) => {
      this.logger.error(SECURITY_AUDIT_MESSAGES.MODULE_DESTROY_FLUSH_FAILED, {
        error,
      });
    });
  }

  // --- Public Methods ---

  async logSecurityEvent(
    event: Omit<SecurityEvent, "id" | "timestamp"> & { timestamp?: Date },
  ): Promise<void> {
    const operation = SECURITY_AUDIT_OPERATIONS.LOG_SECURITY_EVENT;
    const securityEvent: SecurityEvent = {
      ...event,
      id: `${SECURITY_AUDIT_CONFIG.EVENT_ID_PREFIX}${Date.now()}_${uuidv4().substring(0, SECURITY_AUDIT_CONFIG.EVENT_ID_UUID_LENGTH)}`,
      timestamp: event.timestamp || new Date(),
    };

    try {
      await this.cacheService.listPush(
        this.config.eventBufferKey,
        JSON.stringify(securityEvent),
      );
      await this.cacheService.listTrim(
        this.config.eventBufferKey,
        0,
        this.config.eventBufferMaxSize - 1,
      );

      await this.updateIPAnalysis(securityEvent);

      if (
        securityEvent.severity === "critical" ||
        securityEvent.severity === "high"
      ) {
        this.processHighSeverityEvent(securityEvent);
      }

      this.logger.debug(SECURITY_AUDIT_MESSAGES.EVENT_LOGGED, {
        operation,
        eventId: securityEvent.id,
        type: securityEvent.type,
      });
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.LOG_EVENT_FAILED, {
        operation,
        error,
        event: securityEvent,
      });
      // 🎯 重新抛出错误，确保上层可以处理
      throw error;
    }
  }

  /**
   * 记录认证事件
   */
  async logAuthenticationEvent(
    action: string,
    outcome: "success" | "failure",
    clientIP: string,
    userAgent: string,
    userId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "authentication",
      severity:
        outcome === "failure"
          ? SECURITY_AUDIT_EVENT_SEVERITIES.MEDIUM
          : SECURITY_AUDIT_EVENT_SEVERITIES.INFO,
      action,
      userId,
      clientIP,
      userAgent,
      details: details || {},
      source: SECURITY_AUDIT_EVENT_SOURCES.AUTH_SERVICE,
      outcome,
    });
  }

  /**
   * 记录授权事件
   */
  async logAuthorizationEvent(
    action: string,
    outcome: "success" | "failure" | "blocked",
    clientIP: string,
    userAgent: string,
    userId?: string,
    apiKeyId?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "authorization",
      severity:
        outcome === "blocked"
          ? SECURITY_AUDIT_EVENT_SEVERITIES.HIGH
          : outcome === "failure"
            ? SECURITY_AUDIT_EVENT_SEVERITIES.MEDIUM
            : SECURITY_AUDIT_EVENT_SEVERITIES.INFO,
      action,
      userId,
      apiKeyId,
      clientIP,
      userAgent,
      details: details || {},
      source: SECURITY_AUDIT_EVENT_SOURCES.AUTHORIZATION_SERVICE,
      outcome,
    });
  }

  /**
   * 记录数据访问事件
   */
  async logDataAccessEvent(
    action: string,
    resource: string,
    clientIP: string,
    userAgent: string,
    userId?: string,
    apiKeyId?: string,
    outcome: "success" | "failure" | "blocked" = "success",
    details?: Record<string, any>,
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "data_access",
      severity:
        outcome === "blocked"
          ? SECURITY_AUDIT_EVENT_SEVERITIES.HIGH
          : SECURITY_AUDIT_EVENT_SEVERITIES.INFO,
      action: action, // 保持action语义清晰，不拼接resource
      userId,
      apiKeyId,
      clientIP,
      userAgent,
      details: { resource, endpoint: resource, ...details }, // 详细信息放到details中
      source: SECURITY_AUDIT_EVENT_SOURCES.DATA_ACCESS_SERVICE,
      outcome,
    });
  }

  /**
   * 记录可疑活动
   */
  async logSuspiciousActivity(
    action: string,
    clientIP: string,
    userAgent: string,
    details: Record<string, any>,
    severity: "critical" | "high" | "medium" = "high",
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "suspicious_activity",
      severity,
      action,
      clientIP,
      userAgent,
      details,
      source: SECURITY_AUDIT_EVENT_SOURCES.SECURITY_MIDDLEWARE,
      outcome: "blocked",
    });

    // 将IP标记为可疑
    await this.cacheService.setAdd(this.config.suspiciousIpSetKey, clientIP);
  }

  /**
   * 记录系统事件
   */
  async logSystemEvent(
    action: string,
    severity: "critical" | "high" | "medium" | "low" | "info",
    details: Record<string, any>,
    outcome: "success" | "failure" = "success",
  ): Promise<void> {
    await this.logSecurityEvent({
      type: "system",
      severity,
      action,
      clientIP: "system",
      userAgent: "system",
      details,
      source: SECURITY_AUDIT_EVENT_SOURCES.SYSTEM_SERVICE,
      outcome,
    });
  }

  async getAuditLogs(
    filters: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      severity?: string;
      clientIP?: string;
      userId?: string;
      outcome?: string;
    } = {},
    limit: number = SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_LIMIT,
    offset: number = SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_OFFSET,
  ): Promise<SecurityAuditLogDocument[]> {
    const operation = SECURITY_AUDIT_OPERATIONS.GET_AUDIT_LOGS;

    try {
      // 🎯 使用仓储层方法
      const results = await this.auditLogRepository.findWithFilters(
        filters,
        limit,
        offset,
      );

      this.logger.debug("获取审计日志成功", {
        operation,
        filterCount: Object.keys(filters).length,
        limit,
        offset,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.GET_AUDIT_LOGS_FAILED, {
        operation,
        filters,
        limit,
        offset,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 生成审计报告
   */
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
  ): Promise<AuditReport> {
    const operation = SECURITY_AUDIT_OPERATIONS.GENERATE_AUDIT_REPORT;
    try {
      const events = await this.getAuditLogs(
        { startDate, endDate },
        SECURITY_AUDIT_CONFIG.REPORT_MAX_EVENTS,
        0,
      );

      const summary = {
        totalEvents: events.length,
        criticalEvents: events.filter((e) => e.severity === "critical").length,
        failedAuthentications: events.filter(
          (e) => e.type === "authentication" && e.outcome === "failure",
        ).length,
        suspiciousActivities: events.filter(
          (e) => e.type === "suspicious_activity",
        ).length,
        dataAccessEvents: events.filter((e) => e.type === "data_access").length,
        uniqueIPs: new Set(events.map((e) => e.clientIP)).size,
        uniqueUsers: new Set(
          events.filter((e) => e.userId).map((e) => e.userId),
        ).size,
      };

      const topRisks = events
        .filter((e) => e.severity === "critical" || e.severity === "high")
        .sort((a, b) => {
          return (
            SECURITY_SEVERITY_ORDER[b.severity] -
            SECURITY_SEVERITY_ORDER[a.severity]
          );
        })
        .slice(0, SECURITY_AUDIT_CONFIG.TOP_RISKS_LIMIT)
        // Map back to SecurityEvent for consistent reporting interface
        .map((log) => this.mapLogToEvent(log));

      const recommendations = this.generateSecurityRecommendations(summary);

      const report = {
        period: { start: startDate, end: endDate },
        summary,
        topRisks,
        trends: {
          authenticationFailures: [], // Trend calculation requires more complex aggregation
          suspiciousActivities: [],
          dataAccess: [],
        },
        recommendations,
      };

      this.logger.log(SECURITY_AUDIT_MESSAGES.AUDIT_REPORT_GENERATED, {
        operation,
        period: { start: startDate, end: endDate },
        eventCount: events.length,
        topRiskCount: topRisks.length,
        recommendationCount: recommendations.length,
      });

      return report;
    } catch (error) {
      this.logger.error(
        { operation, error: error.stack },
        SECURITY_AUDIT_MESSAGES.GENERATE_REPORT_FAILED,
      );
      throw new InternalServerErrorException(
        SECURITY_AUDIT_MESSAGES.GENERATE_REPORT_FAILED,
      );
    }
  }

  isIPSuspicious(ip: string): Promise<boolean> {
    return this.cacheService.setIsMember(this.config.suspiciousIpSetKey, ip);
  }

  async getIPAnalysis(ip: string): Promise<{
    requestCount: number;
    failureCount: number;
    lastSeen: Date;
  } | null> {
    const data = await this.cacheService.hashGetAll(
      `${this.config.ipAnalysisHashPrefix}${ip}`,
    );
    if (!data || Object.keys(data).length === 0) return null;
    return {
      requestCount: parseInt(data.requestCount, 10) || 0,
      failureCount: parseInt(data.failureCount, 10) || 0,
      lastSeen: new Date(data.lastSeen),
    };
  }

  getSuspiciousIPs(): Promise<string[]> {
    return this.cacheService.setMembers(this.config.suspiciousIpSetKey);
  }

  clearSuspiciousIP(ip: string): void {
    this.cacheService.setRemove(this.config.suspiciousIpSetKey, ip);
    this.logger.log(SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_CLEARED, { ip });
  }

  // --- Event Listeners ---
  @OnEvent("auth.login.success")
  async handleLoginSuccess(data: {
    userId: string;
    clientIP: string;
    userAgent: string;
  }) {
    await this.logAuthenticationEvent(
      "user_login",
      "success",
      data.clientIP,
      data.userAgent,
      data.userId,
    );
  }

  @OnEvent("auth.login.failure")
  async handleLoginFailure(data: {
    username: string;
    clientIP: string;
    userAgent: string;
    reason: string;
  }): Promise<void> {
    await this.logAuthenticationEvent(
      "user_login_failed",
      "failure",
      data.clientIP,
      data.userAgent,
      undefined,
      { username: data.username, reason: data.reason },
    );
  }

  @OnEvent("auth.apikey.used")
  async handleAPIKeyUsed(data: {
    apiKeyId: string;
    clientIP: string;
    userAgent: string;
    endpoint: string;
  }): Promise<void> {
    await this.logDataAccessEvent(
      "api_access",
      data.endpoint,
      data.clientIP,
      data.userAgent,
      undefined,
      data.apiKeyId,
    );
  }

  // --- Periodic Tasks ---

  @Interval(securityConfig.audit.flushInterval)
  async flushAuditLogs(): Promise<void> {
    const operation = SECURITY_AUDIT_OPERATIONS.FLUSH_AUDIT_LOGS;
    try {
      const eventsJson = await this.cacheService.listRange(
        this.config.eventBufferKey,
        0,
        -1,
      );
      if (eventsJson.length === 0) {
        this.logger.debug(SECURITY_AUDIT_MESSAGES.EVENT_BUFFER_EMPTY, {
          operation,
        });
        return;
      }

      await this.cacheService.listTrim(
        this.config.eventBufferKey,
        eventsJson.length,
        -1,
      );

      const events: SecurityEvent[] = eventsJson.map((e) => JSON.parse(e));

      const auditLogs: Partial<SecurityAuditLog>[] = await Promise.all(
        events.map(async (event) => ({
          eventId: event.id,
          type: event.type,
          severity: event.severity,
          action: event.action,
          userId: event.userId,
          apiKeyId: event.apiKeyId,
          clientIP: event.clientIP,
          userAgent: event.userAgent,
          details: event.details,
          timestamp: new Date(event.timestamp),
          source: event.source,
          outcome: event.outcome,
          riskScore: await this.calculateRiskScore(event),
          tags: await this.generateTags(event),
        })),
      );
      // 🎯 使用仓储层方法
      await this.auditLogRepository.insertMany(auditLogs);

      this.logger.log(SECURITY_AUDIT_MESSAGES.AUDIT_LOGS_FLUSHED, {
        operation,
        eventCount: events.length,
        logCount: auditLogs.length,
      });
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.FLUSH_LOGS_FAILED, {
        operation,
        error: error.stack,
      });
      // 🎯 重新抛出错误
      throw error;
    }
  }

  @Interval(securityConfig.audit.analysisInterval)
  async analyzeSuspiciousActivity(): Promise<void> {
    // Implementation is complex and omitted for brevity
  }

  @Interval(securityConfig.audit.cleanupInterval)
  async cleanupOldData(): Promise<void> {
    const operation = SECURITY_AUDIT_OPERATIONS.CLEANUP_OLD_DATA;
    this.logger.debug(SECURITY_AUDIT_MESSAGES.CLEANUP_AUTO_HANDLED, {
      operation,
    });
  }

  // --- Private Methods ---

  private async updateIPAnalysis(event: SecurityEvent): Promise<void> {
    const operation = SECURITY_AUDIT_OPERATIONS.UPDATE_IP_ANALYSIS;

    try {
      const ip = event.clientIP;
      const key = `${this.config.ipAnalysisHashPrefix}${ip}`;

      const [reqCount, failCount] = await Promise.all([
        this.cacheService.hashIncrementBy(key, "requestCount", 1),
        event.outcome === "failure" || event.outcome === "blocked"
          ? this.cacheService.hashIncrementBy(key, "failureCount", 1)
          : this.cacheService
              .hashGetAll(key)
              .then((res) => parseInt(res?.failureCount, 10) || 0),
      ]);
      await this.cacheService.hashSet(
        key,
        "lastSeen",
        (event.timestamp || new Date()).toISOString(),
      );
      await this.cacheService.expire(key, this.config.ipAnalysisTtlSeconds);

      // 检查是否需要标记为可疑IP
      const shouldMarkSuspicious =
        failCount > this.config.highFailureCountThreshold ||
        (reqCount > 0 &&
          failCount / reqCount > this.config.highFailureRateThreshold);

      if (shouldMarkSuspicious) {
        await this.cacheService.setAdd(this.config.suspiciousIpSetKey, ip);
        this.logger.warn(SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_DETECTED, {
          operation,
          ip,
          requestCount: reqCount,
          failureCount: failCount,
          failureRate: reqCount > 0 ? failCount / reqCount : 0,
        });
      }

      this.logger.debug(SECURITY_AUDIT_MESSAGES.IP_ANALYSIS_UPDATED, {
        operation,
        ip,
        requestCount: reqCount,
        failureCount: failCount,
      });
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.IP_ANALYSIS_UPDATE_FAILED, {
        operation,
        ip: event.clientIP,
        error: error.message,
      });
      // 不重新抛出错误，避免影响主流程
    }
  }

  private processHighSeverityEvent(event: SecurityEvent): void {
    const operation = SECURITY_AUDIT_OPERATIONS.PROCESS_HIGH_SEVERITY_EVENT;

    this.eventEmitter.emit("security.high_severity_event", event);

    // 记录严重事件检测
    this.logger.warn(SECURITY_AUDIT_MESSAGES.CRITICAL_EVENT_DETECTED, {
      operation,
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      clientIP: event.clientIP,
    });

    if (event.severity === "critical" && event.type === "suspicious_activity") {
      this.cacheService.setAdd(this.config.suspiciousIpSetKey, event.clientIP);
      this.logger.error(
        SECURITY_AUDIT_MESSAGES.HIGH_SEVERITY_EVENT_AUTO_BLOCK,
        { operation, eventId: event.id, clientIP: event.clientIP },
      );
    }
  }

  private async calculateRiskScore(event: SecurityEvent): Promise<number> {
    const operation = SECURITY_AUDIT_OPERATIONS.CALCULATE_RISK_SCORE;

    try {
      let score = 0;
      const weights = RISK_SCORE_WEIGHTS;

      // 基于严重程度
      score += weights.severity[event.severity] || 0;

      // 基于事件类型
      score += weights.type[event.type] || 0;

      // 基于事件结果
      score += weights.outcome[event.outcome] || 0;

      // 基于IP可疑程度
      if (await this.isIPSuspicious(event.clientIP)) {
        score += weights.factors.suspicious_ip;
      }

      // 基于失败频率
      const ipAnalysis = await this.getIPAnalysis(event.clientIP);
      if (
        ipAnalysis &&
        ipAnalysis.failureCount > SECURITY_AUDIT_CONFIG.HIGH_FAILURE_THRESHOLD
      ) {
        score += Math.min(
          weights.factors.high_failure_rate,
          ipAnalysis.failureCount,
        );
      }

      const finalScore = Math.min(100, score);

      this.logger.debug(SECURITY_AUDIT_MESSAGES.RISK_SCORE_CALCULATED, {
        operation,
        eventId: event.id,
        severity: event.severity,
        type: event.type,
        outcome: event.outcome,
        clientIP: event.clientIP,
        finalScore,
      });

      return finalScore;
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.RISK_SCORE_CALCULATION_FAILED, {
        operation,
        eventId: event.id,
        error: error.message,
      });
      return 0; // 返回最低分数作为安全措施
    }
  }

  private async generateTags(event: SecurityEvent): Promise<string[]> {
    const operation = SECURITY_AUDIT_OPERATIONS.GENERATE_TAGS;

    try {
      const tags: string[] = [];
      const rules = TAG_GENERATION_RULES;

      // 直接映射
      rules.directMap.forEach((prop) => {
        if (event[prop]) {
          tags.push(event[prop]);
        }
      });

      // 条件映射
      if (await this.isIPSuspicious(event.clientIP)) {
        tags.push(rules.conditions.isSuspiciousIp);
      }
      if (event.outcome === "failure" || event.outcome === "blocked") {
        tags.push(rules.conditions.isIncident);
      }
      if (event.type === "authentication" && event.outcome === "failure") {
        tags.push(rules.conditions.isAuthFailure);
      }

      // 去重后返回
      const uniqueTags = [...new Set(tags)];

      this.logger.debug(SECURITY_AUDIT_MESSAGES.TAGS_GENERATED, {
        operation,
        eventId: event.id,
        tagCount: uniqueTags.length,
        tags: uniqueTags,
      });

      return uniqueTags;
    } catch (error) {
      this.logger.error(SECURITY_AUDIT_MESSAGES.TAGS_GENERATION_FAILED, {
        operation,
        eventId: event.id,
        error: error.message,
      });
      return []; // 返回空数组作为安全措施
    }
  }

  private generateSecurityRecommendations(summary: any): string[] {
    const operation =
      SECURITY_AUDIT_OPERATIONS.GENERATE_SECURITY_RECOMMENDATIONS;
    const recommendations: string[] = [];
    const thresholds = SECURITY_AUDIT_RECOMMENDATION_THRESHOLDS;

    try {
      // 基于失败认证的推荐
      if (summary.failedAuthentications > thresholds.FAILED_AUTHENTICATIONS) {
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.STRICT_ACCOUNT_LOCKOUT,
        );
        recommendations.push(SECURITY_AUDIT_RECOMMENDATIONS.ENABLE_MFA);
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.STRENGTHEN_PASSWORD_POLICY,
        );
        recommendations.push(SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_CAPTCHA);
      }

      // 基于可疑活动的推荐
      if (summary.suspiciousActivities > thresholds.SUSPICIOUS_ACTIVITIES) {
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.STRENGTHEN_IP_BLACKLIST,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.USE_WAF_DDOS_PROTECTION,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_RATE_LIMITING,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.ENHANCE_NETWORK_MONITORING,
        );
      }

      // 基于严重事件的推荐
      if (summary.criticalEvents > thresholds.CRITICAL_EVENTS) {
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.INVESTIGATE_CRITICAL_EVENTS,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.REVIEW_SECURITY_POLICIES,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.ENHANCE_INCIDENT_RESPONSE,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.CONDUCT_SECURITY_TRAINING,
        );
      }

      // 基于数据访问量的推荐
      if (summary.dataAccessEvents > thresholds.DATA_ACCESS_THRESHOLD) {
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.REVIEW_ACCESS_PERMISSIONS,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_SECURITY_MONITORING,
        );
      }

      // 基于唯一IP数量的推荐
      if (summary.uniqueIPs > thresholds.UNIQUE_IP_THRESHOLD) {
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.ENHANCE_NETWORK_MONITORING,
        );
        recommendations.push(
          SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_RATE_LIMITING,
        );
      }

      // 通用推荐
      recommendations.push(
        SECURITY_AUDIT_RECOMMENDATIONS.UPDATE_SECURITY_PATCHES,
      );
      recommendations.push(
        SECURITY_AUDIT_RECOMMENDATIONS.CONDUCT_SECURITY_AUDIT,
      );
      recommendations.push(SECURITY_AUDIT_RECOMMENDATIONS.BACKUP_SECURITY_LOGS);

      // 去重
      const uniqueRecommendations = [...new Set(recommendations)];

      this.logger.debug("安全推荐生成完成", {
        operation,
        summaryStats: {
          failedAuthentications: summary.failedAuthentications,
          suspiciousActivities: summary.suspiciousActivities,
          criticalEvents: summary.criticalEvents,
          dataAccessEvents: summary.dataAccessEvents,
          uniqueIPs: summary.uniqueIPs,
        },
        recommendationCount: uniqueRecommendations.length,
      });

      return uniqueRecommendations;
    } catch (error) {
      this.logger.error("安全推荐生成失败", {
        operation,
        error: error.message,
      });
      // 返回基本推荐作为兜底
      return [
        SECURITY_AUDIT_RECOMMENDATIONS.CONDUCT_SECURITY_AUDIT,
        SECURITY_AUDIT_RECOMMENDATIONS.UPDATE_SECURITY_PATCHES,
        SECURITY_AUDIT_RECOMMENDATIONS.REVIEW_SECURITY_POLICIES,
      ];
    }
  }

  private mapLogToEvent(log: SecurityAuditLogDocument): SecurityEvent {
    return {
      id: log.eventId,
      type: log.type as any,
      severity: log.severity as any,
      action: log.action,
      userId: log.userId,
      apiKeyId: log.apiKeyId,
      clientIP: log.clientIP,
      userAgent: log.userAgent,
      details: log.details,
      timestamp: log.timestamp,
      source: log.source,
      outcome: log.outcome as any,
    };
  }
}
