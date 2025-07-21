import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { ApiStandardResponses, ApiSuccessResponse, ApiKeyAuthResponses } from "@common/decorators/swagger-responses.decorator";


import { ApiKeyAuth } from "../auth/decorators/auth.decorator";
import { Permission } from "../auth/enums/user-role.enum";
import { RATE_LIMIT_CONFIG } from "../common/constants/rate-limit.constants";

import {
  GetAuditEventsQueryDto,
  GetVulnerabilitiesQueryDto,
  RecordManualEventDto,
} from "./dto/security-query.dto";
import {
  SecurityVulnerability,
} from "./interfaces/security-scanner.interface";
import { SecurityAuditService } from "./security-audit.service";
import { SecurityScannerService } from "./security-scanner.service";


export class SecurityScanResponseDto {
  scanId: string;
  timestamp: string;
  duration: number;
  totalChecks: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  securityScore: number;
  recommendations: string[];
}

export class SecurityEventDto {
  id: string;
  type: string;
  severity: string;
  action: string;
  userId?: string;
  apiKeyId?: string;
  clientIP: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: string;
  source: string;
  outcome: string;
}

export class AuditReportDto {
  period: {
    start: string;
    end: string;
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
  topRisks: SecurityEventDto[];
  recommendations: string[];
}

// 使用标准化认证装饰器 - 仅允许管理员访问安全管理功能
@ApiTags("安全管理")
@Controller("security")
export class SecurityController {
  constructor(
    private readonly securityScanner: SecurityScannerService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Post("scan")
  @ApiOperation({
    summary: "🔍 执行安全扫描",
    description: `
### 功能说明
对系统进行全面的安全漏洞扫描，检查认证、授权、数据暴露等安全风险。

### 权限要求
需要 SYSTEM_ADMIN 权限（系统管理员）

### 扫描内容
- **🔐 认证安全**: JWT配置、密码策略、API Key管理
- **🔒 授权检查**: 权限控制、角色管理、访问控制
- **📊 数据保护**: 敏感数据暴露、数据加密
- **⚙️ 配置安全**: 系统配置、环境变量、服务配置
- **🚀 注入防护**: SQL注入、NoSQL注入、命令注入

### 扫描结果
- 安全评分（0-100分）
- 漏洞统计和分级
- 具体修复建议
- 扫描报告详情
    `,
  })
  @ApiResponse({
    status: 200,
    description: "安全扫描完成",
    type: SecurityScanResponseDto,
  })
  @ApiSuccessResponse({ type: SecurityScanResponseDto })
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  async performSecurityScan(): Promise<SecurityScanResponseDto> {
    const scanResult = await this.securityScanner.performSecurityScan();

    return {
      scanId: scanResult.scanId,
      timestamp: scanResult.timestamp.toISOString(),
      duration: scanResult.duration,
      totalChecks: scanResult.totalChecks,
      vulnerabilities: scanResult.vulnerabilities as SecurityVulnerability[],
      summary: scanResult.summary,
      securityScore: scanResult.securityScore,
      recommendations: scanResult.recommendations,
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("scan/history")
  @ApiOperation({
    summary: "获取安全扫描历史",
    description: "获取历史安全扫描结果",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "返回结果数量限制",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "扫描历史获取成功",
  })
  @ApiSuccessResponse()
  @ApiKeyAuthResponses()
  @ApiStandardResponses()
  async getScanHistory(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    if (limitNum < 1 || limitNum > 50) {
      throw new BadRequestException("limit必须在1-50之间");
    }

    const history = await this.securityScanner.getScanHistory(limitNum as number);

    return {
      scans: history.map((scan) => ({
        scanId: scan.scanId,
        timestamp: scan.timestamp.toISOString(),
        duration: scan.duration,
        securityScore: scan.securityScore,
        vulnerabilityCount: scan.vulnerabilities.length,
        summary: scan.summary,
      })),
      total: history.length,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("vulnerabilities")
  @ApiOperation({
    summary: "获取安全漏洞列表",
    description: "获取最新扫描发现的安全漏洞",
  })
  @ApiQuery({
    name: "severity",
    required: false,
    description: "按严重程度过滤",
    enum: ["critical", "high", "medium", "low", "info"],
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "按类型过滤",
    enum: [
      "authentication",
      "authorization",
      "data_exposure",
      "injection",
      "configuration",
      "encryption",
    ],
  })
  @ApiResponse({
    status: 200,
    description: "漏洞列表获取成功",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getVulnerabilities(
    @Query() query: GetVulnerabilitiesQueryDto,
  ) {
    const scanHistory = await this.securityScanner.getScanHistory(1 as number);
    if (scanHistory.length === 0) {
      return {
        vulnerabilities: [],
        total: 0,
        message: "暂无扫描结果，请先执行安全扫描",
        timestamp: new Date().toISOString(),
      };
    }

    let vulnerabilities = scanHistory[0].vulnerabilities;

    // 应用过滤器
    if (query.severity) {
      vulnerabilities = vulnerabilities.filter((v) => v.severity === query.severity);
    }
    if (query.type) {
      vulnerabilities = vulnerabilities.filter((v) => v.type === query.type);
    }

    return {
      vulnerabilities,
      total: vulnerabilities.length,
      scanInfo: {
        scanId: scanHistory[0].scanId,
        timestamp: scanHistory[0].timestamp.toISOString(),
        securityScore: scanHistory[0].securityScore,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("configuration")
  @ApiOperation({
    summary: "获取安全配置",
    description: "获取当前系统的安全配置信息",
  })
  @ApiResponse({
    status: 200,
    description: "安全配置获取成功",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getSecurityConfiguration() {
    const config = this.securityScanner.getCurrentSecurityConfiguration();

    return {
      configuration: config,
      validation: {
        issues: [],
        isValid: true,
        score: 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("audit/events")
  @ApiOperation({
    summary: "获取安全审计事件",
    description: "查询安全审计日志",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    description: "开始日期 (ISO 8601)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    description: "结束日期 (ISO 8601)",
  })
  @ApiQuery({ name: "type", required: false, description: "事件类型" })
  @ApiQuery({ name: "severity", required: false, description: "严重程度" })
  @ApiQuery({ name: "clientIP", required: false, description: "客户端IP" })
  @ApiQuery({ name: "outcome", required: false, description: "结果" })
  @ApiQuery({ name: "limit", required: false, description: "返回数量限制" })
  @ApiQuery({ name: "offset", required: false, description: "偏移量" })
  @ApiResponse({
    status: 200,
    description: "审计日志获取成功",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getAuditEvents(
    @Query() query: GetAuditEventsQueryDto,
  ) {
    const {
      startDate,
      endDate,
      type,
      severity,
      clientIP,
      outcome,
      limit,
      offset,
    } = query;

    const events = await this.securityAudit.getAuditLogs(
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        type,
        severity,
        clientIP,
        outcome,
      },
      limit,
      offset,
    );

    return {
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        action: event.action,
        userId: event.userId,
        apiKeyId: event.apiKeyId,
        clientIP: event.clientIP,
        userAgent: event.userAgent,
        details: event.details,
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        outcome: event.outcome,
      })),
      pagination: {
        limit: limit,
        offset: offset,
        total: events.length,
        hasMore: events.length === limit,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Post("manual-events")
  @Throttle({ default: RATE_LIMIT_CONFIG.ENDPOINTS.SECURITY_MANUAL_EVENTS })
  @ApiOperation({
    summary: "手动记录安全事件",
    description: "手动记录安全审计事件",
  })
  @ApiBody({
    description: "要记录的事件数据",
    schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "authentication",
            "authorization",
            "data_access",
            "system",
            "suspicious_activity",
          ],
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low", "info"],
        },
        action: { type: "string" },
        clientIP: { type: "string", format: "ip" },
        userAgent: { type: "string" },
        details: { type: "object" },
        outcome: { type: "string", enum: ["success", "failure", "blocked"] },
        userId: { type: "string" },
        apiKeyId: { type: "string" },
      },
      required: [
        "type",
        "severity",
        "action",
        "clientIP",
        "userAgent",
        "outcome",
      ],
    },
  })
  @ApiResponse({ status: 201, description: "事件记录成功" })
  @ApiStandardResponses()
  async recordManualEvent(@Body() eventData: RecordManualEventDto) {
    await this.securityAudit.logSecurityEvent({
      source: "manual",
      ...eventData,
      details: eventData.details || {},
    });
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("audit/report")
  @ApiOperation({
    summary: "生成安全审计报告",
    description: "生成指定时间段的安全审计报告",
  })
  @ApiQuery({
    name: "startDate",
    required: true,
    description: "开始日期 (ISO 8601)",
  })
  @ApiQuery({
    name: "endDate",
    required: true,
    description: "结束日期 (ISO 8601)",
  })
  @ApiResponse({
    status: 200,
    description: "审计报告生成成功",
    type: AuditReportDto,
  })
  @ApiSuccessResponse({ type: AuditReportDto })
  @ApiStandardResponses()
  async generateAuditReport(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<AuditReportDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException("startDate和endDate是必需的");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("无效的日期格式");
    }

    if (start >= end) {
      throw new BadRequestException("开始日期必须小于结束日期");
    }

    const report = await this.securityAudit.generateAuditReport(start, end);

    return {
      period: {
        start: report.period.start.toISOString(),
        end: report.period.end.toISOString(),
      },
      summary: report.summary,
      topRisks: report.topRisks.map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        action: event.action,
        userId: event.userId,
        apiKeyId: event.apiKeyId,
        clientIP: event.clientIP,
        userAgent: event.userAgent,
        details: event.details,
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        outcome: event.outcome,
      })),
      recommendations: report.recommendations,
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("suspicious-ips")
  @ApiOperation({
    summary: "获取可疑IP列表",
    description: "获取被标记为可疑的IP地址列表",
  })
  @ApiResponse({
    status: 200,
    description: "可疑IP列表获取成功",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getSuspiciousIPs() {
    const suspiciousIPs = await this.securityAudit.getSuspiciousIPs();

    const ipDetails = await Promise.all(
      suspiciousIPs.map(async (ip) => {
        const analysis = await this.securityAudit.getIPAnalysis(ip);
        return {
          ip,
          requestCount: analysis?.requestCount || 0,
          failureCount: analysis?.failureCount || 0,
          lastSeen: analysis?.lastSeen?.toISOString() || null,
          failureRate: analysis
            ? ((analysis.failureCount / analysis.requestCount) * 100).toFixed(2) +
              "%"
            : "0%",
        };
      })
    );

    return {
      suspiciousIPs: ipDetails,
      total: suspiciousIPs.length,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Post("suspicious-ips/:ip/clear")
  @ApiOperation({
    summary: "清除可疑IP标记",
    description: "移除IP地址的可疑标记",
  })
  @ApiParam({ name: "ip", description: "IP地址" })
  @ApiResponse({
    status: 200,
    description: "可疑IP标记已清除",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async clearSuspiciousIP(@Param("ip") ip: string) {
    // 简单的IP地址格式验证
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      throw new BadRequestException("无效的IP地址格式");
    }

    this.securityAudit.clearSuspiciousIP(ip);

    return {
      message: `IP地址 ${ip} 的可疑标记已清除`,
      ip,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("dashboard")
  @ApiOperation({
    summary: "获取安全仪表板数据",
    description: "获取安全状态概览和关键指标",
  })
  @ApiResponse({
    status: 200,
    description: "安全仪表板数据获取成功",
  })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getSecurityDashboard() {
    // 获取最新的扫描结果
    const scanHistory = await this.securityScanner.getScanHistory(1 as number);
    const latestScan = scanHistory[0];

    // 获取最近24小时的安全事件
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = await this.securityAudit.getAuditLogs(
      { startDate: oneDayAgo },
      1000,
    );

    // 获取可疑IP列表
    const suspiciousIPs = await this.securityAudit.getSuspiciousIPs();

    // 统计数据
    const stats = {
      securityScore: latestScan?.securityScore || 0,
      totalVulnerabilities: latestScan?.vulnerabilities.length || 0,
      criticalVulnerabilities: latestScan?.summary.critical || 0,
      recentEvents: recentEvents.length,
      suspiciousActivities: recentEvents.filter(
        (e) => e.type === "suspicious_activity",
      ).length,
      failedAuthentications: recentEvents.filter(
        (e) => e.type === "authentication" && e.outcome === "failure",
      ).length,
      suspiciousIPs: suspiciousIPs.length,
    };

    // 最近的高风险事件
    const highRiskEvents = recentEvents
      .filter((e) => e.severity === "critical" || e.severity === "high")
      .slice(0, 5)
      .map((event) => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        action: event.action,
        clientIP: event.clientIP,
        timestamp: event.timestamp.toISOString(),
        outcome: event.outcome,
      }));

    // 安全建议
    const recommendations = [];
    if (stats.criticalVulnerabilities > 0) {
      recommendations.push("立即修复严重安全漏洞");
    }
    if (stats.suspiciousActivities > 10) {
      recommendations.push("加强可疑活动监控");
    }
    if (stats.securityScore < 70) {
      recommendations.push("提升整体安全配置");
    }
    if (stats.failedAuthentications > 50) {
      recommendations.push("检查是否存在暴力破解攻击");
    }

    return {
      overview: {
        securityScore: stats.securityScore,
        status: this.getSecurityStatus(stats.securityScore),
        lastScanTime: latestScan?.timestamp?.toISOString() || null,
        uptime: process.uptime(),
      },
      statistics: stats,
      recentHighRiskEvents: highRiskEvents,
      topVulnerabilities:
        latestScan?.vulnerabilities
          .filter((v) => v.severity === "critical" || v.severity === "high")
          .slice(0, 5) || [],
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  // 私有辅助方法
  private getSecurityStatus(score: number): string {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "fair";
    if (score >= 60) return "poor";
    return "critical";
  }
}
