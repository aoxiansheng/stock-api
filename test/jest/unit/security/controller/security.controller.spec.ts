/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from '@nestjs/common';
import { SecurityController } from "../../../../../src/security/controller/security.controller";
import { SecurityScannerService } from "../../../../../src/security/services/security-scanner.service";
import { SecurityAuditService } from "../../../../../src/security/services/security-audit.service";
import { PermissionService } from "../../../../../src/auth/services/permission.service";
import { RateLimitService } from "../../../../../src/auth/services/rate-limit.service";
import { UnifiedPermissionsGuard } from "../../../../../src/auth/guards/unified-permissions.guard";
import { GetAuditEventsQueryDto } from "../../../../../src/security/dto/security-query.dto";

describe("SecurityController", () => {
  let controller: SecurityController;
  let scannerService: jest.Mocked<SecurityScannerService>;
  let auditService: jest.Mocked<SecurityAuditService>;

  const mockScanResult = {
    _scanId: "scan-123",
    timestamp: new Date(),
    duration: 5000,
    _totalChecks: 10,
    vulnerabilities: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    securityScore: 100,
    recommendations: [],
  };

  const mockSecurityEvent = {
    id: "event-1",
    type: "authentication",
    severity: "medium",
    action: "login_success",
    clientIP: "127.0.0.1",
    userAgent: "test-agent",
    details: {},
    timestamp: new Date(),
    source: "test",
    outcome: "success",
    eventId: "event-1",
    riskScore: 50,
    tags: ["authentication"],
  };

  beforeEach(async () => {
    const mockRateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: new Date().getTime() + 60000,
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        {
          provide: SecurityScannerService,
          useValue: {
            performSecurityScan: jest.fn().mockResolvedValue(mockScanResult),
            getScanHistory: jest.fn().mockResolvedValue([mockScanResult]),
            getCurrentSecurityConfiguration: jest.fn().mockReturnValue({}),
            validateSecurityConfiguration: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SecurityAuditService,
          useValue: {
            getAuditLogs: jest.fn().mockResolvedValue([mockSecurityEvent]),
            generateAuditReport: jest.fn().mockResolvedValue({
              period: { start: new Date(), end: new Date() },
              summary: {},
              topRisks: [],
              recommendations: [],
            }),
            getSuspiciousIPs: jest.fn().mockResolvedValue(["1.2.3.4"]),
            getIPAnalysis: jest.fn().mockResolvedValue({
              requestCount: 10,
              failureCount: 5,
              lastSeen: new Date(),
            }),
            clearSuspiciousIP: jest.fn(),
            logSecurityEvent: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
            createPermissionContext: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    controller = module.get<SecurityController>(SecurityController);
    scannerService = module.get(SecurityScannerService);
    auditService = module.get(SecurityAuditService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("performSecurityScan", () => {
    it("should perform a security scan and return the results", async () => {
      const result = await controller.performSecurityScan();
      expect(result.scanId).toBe(mockScanResult._scanId);
      expect(scannerService.performSecurityScan).toHaveBeenCalled();
    });
  });

  describe("getScanHistory", () => {
    it("should return scan history", async () => {
      const result = await controller.getScanHistory("5");
      expect(result.scans).toHaveLength(1);
      expect(scannerService.getScanHistory).toHaveBeenCalledWith(5);
    });

    it("should use default limit of 10 when no limit is provided", async () => {
      const result = await controller.getScanHistory(undefined);
      expect(result.scans).toHaveLength(1);
      expect(scannerService.getScanHistory).toHaveBeenCalledWith(10);
    });

    it("should throw BadRequestException when limit is less than 1", async () => {
      await expect(controller.getScanHistory("0")).rejects.toThrow(
        new BadRequestException("limit必须在1-50之间"),
      );
    });

    it("should throw BadRequestException when limit is greater than 50", async () => {
      await expect(controller.getScanHistory("51")).rejects.toThrow(
        new BadRequestException("limit必须在1-50之间"),
      );
    });

    it("should throw BadRequestException when limit is negative", async () => {
      await expect(controller.getScanHistory("-1")).rejects.toThrow(
        new BadRequestException("limit必须在1-50之间"),
      );
    });
  });

  describe("getVulnerabilities", () => {
    it("should return vulnerabilities from the latest scan", async () => {
      const result = await controller.getVulnerabilities({});
      expect(result.vulnerabilities).toEqual([]);
    });

    it("should return empty result when no scan history exists", async () => {
      scannerService.getScanHistory.mockResolvedValue([]);
      const result = await controller.getVulnerabilities({});
      expect(result.vulnerabilities).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.message).toBe("暂无扫描结果，请先执行安全扫描");
    });

    it("should filter vulnerabilities by severity", async () => {
      const mockVulnerability = {
        id: "vuln-1",
        type: "authentication",
        severity: "high",
        title: "Test vulnerability",
        descr_iption: "Test description",
        location: "test location",
        impact: "high",
        recommendation: "Fix this",
        detected: new Date(),
        status: "detected",
      };
      const mockScanWithVulns = {
        ...mockScanResult,
        vulnerabilities: [mockVulnerability],
      } as any;
      scannerService.getScanHistory.mockResolvedValue([mockScanWithVulns]);

      const result = await controller.getVulnerabilities({ severity: "high" });
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].severity).toBe("high");
    });

    it("should filter vulnerabilities by type", async () => {
      const mockVulnerability = {
        id: "vuln-1",
        type: "authentication",
        severity: "high",
        title: "Test vulnerability",
        description: "Test description",
        location: "test location",
        impact: "high",
        recommendation: "Fix this",
        detected: new Date(),
        status: "detected",
      };
      const mockScanWithVulns = {
        ...mockScanResult,
        vulnerabilities: [mockVulnerability],
      } as any;
      scannerService.getScanHistory.mockResolvedValue([mockScanWithVulns]);

      const result = await controller.getVulnerabilities({
        type: "authentication",
      });
      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].type).toBe("authentication");
    });

    it("should return empty array when no vulnerabilities match filter", async () => {
      const mockVulnerability = {
        id: "vuln-1",
        type: "authentication",
        severity: "high",
        title: "Test vulnerability",
        description: "Test description",
        location: "test location",
        impact: "high",
        recommendation: "Fix this",
        detected: new Date(),
        status: "detected",
      };
      const mockScanWithVulns = {
        ...mockScanResult,
        vulnerabilities: [mockVulnerability],
      } as any;
      scannerService.getScanHistory.mockResolvedValue([mockScanWithVulns]);

      const result = await controller.getVulnerabilities({
        severity: "critical",
      });
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getSecurityConfiguration", () => {
    it("should return security configuration and validation", async () => {
      const result = await controller.getSecurityConfiguration();
      expect(result).toHaveProperty("configuration");
      expect(result).toHaveProperty("validation");
    });
  });

  describe("getAuditEvents", () => {
    it("should return audit events", async () => {
      const queryDto: GetAuditEventsQueryDto = {
        startDate: undefined,
        endDate: undefined,
        type: undefined,
        severity: undefined,
        clientIP: undefined,
        outcome: undefined,
        limit: 100,
        offset: 0,
        SecurityDateRangeValidation: null,
      };
      const result = await controller.getAuditEvents(queryDto);
      expect(result.events).toHaveLength(1);
      expect(auditService.getAuditLogs).toHaveBeenCalled();
    });
  });

  describe("generateAuditReport", () => {
    it("should generate an audit report", async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();
      const result = await controller.generateAuditReport(startDate, endDate);
      expect(result).toHaveProperty("summary");
    });

    it("should throw error for invalid date range", async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() - 86400000).toISOString();
      await expect(
        controller.generateAuditReport(startDate, endDate),
      ).rejects.toThrow(new BadRequestException("开始日期必须小于结束日期"));
    });

    it("should throw BadRequestException when startDate is missing", async () => {
      const endDate = new Date().toISOString();
      await expect(controller.generateAuditReport("", endDate)).rejects.toThrow(
        new BadRequestException("startDate和endDate是必需的"),
      );
    });

    it("should throw BadRequestException when endDate is missing", async () => {
      const startDate = new Date().toISOString();
      await expect(
        controller.generateAuditReport(startDate, ""),
      ).rejects.toThrow(new BadRequestException("startDate和endDate是必需的"));
    });

    it("should throw BadRequestException for invalid startDate format", async () => {
      const endDate = new Date().toISOString();
      await expect(
        controller.generateAuditReport("invalid-date", endDate),
      ).rejects.toThrow(new BadRequestException("无效的日期格式"));
    });

    it("should throw BadRequestException for invalid endDate format", async () => {
      const startDate = new Date().toISOString();
      await expect(
        controller.generateAuditReport(startDate, "invalid-date"),
      ).rejects.toThrow(new BadRequestException("无效的日期格式"));
    });

    it("should throw BadRequestException when start date equals end date", async () => {
      const date = new Date().toISOString();
      await expect(controller.generateAuditReport(date, date)).rejects.toThrow(
        new BadRequestException("开始日期必须小于结束日期"),
      );
    });
  });

  describe("getSuspiciousIPs", () => {
    it("should return a list of suspicious IPs", async () => {
      const result = await controller.getSuspiciousIPs();
      expect(result.suspiciousIPs).toHaveLength(1);
      expect(result.suspiciousIPs[0].ip).toBe("1.2.3.4");
    });
  });

  describe("clearSuspiciousIP", () => {
    it("should clear a suspicious IP", async () => {
      await controller.clearSuspiciousIP("1.2.3.4");
      expect(auditService.clearSuspiciousIP).toHaveBeenCalledWith("1.2.3.4");
    });

    it("should throw BadRequestException for invalid IP format", async () => {
      await expect(controller.clearSuspiciousIP("invalid-ip")).rejects.toThrow(
        new BadRequestException("无效的IP地址格式"),
      );
    });

    it("should throw BadRequestException for IP with non-numeric characters", async () => {
      await expect(controller.clearSuspiciousIP("192.168.1.a")).rejects.toThrow(
        new BadRequestException("无效的IP地址格式"),
      );
    });

    it("should throw BadRequestException for incomplete IP", async () => {
      await expect(controller.clearSuspiciousIP("192.168.1")).rejects.toThrow(
        new BadRequestException("无效的IP地址格式"),
      );
    });

    it("should throw BadRequestException for empty IP", async () => {
      await expect(controller.clearSuspiciousIP("")).rejects.toThrow(
        new BadRequestException("无效的IP地址格式"),
      );
    });
  });

  describe("recordManualEvent", () => {
    it("should record a manual security event", async () => {
      const eventData = {
        type: "system" as const,
        severity: "high" as const,
        action: "manual_test",
        clientIP: "127.0.0.1",
        userAgent: "manual-agent",
        outcome: "success" as const,
      };
      await controller.recordManualEvent(eventData);
      expect(auditService.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe("getSecurityDashboard", () => {
    it("should return security dashboard data", async () => {
      const result = await controller.getSecurityDashboard();
      expect(result).toHaveProperty("overview");
      expect(result).toHaveProperty("statistics");
    });

    it("should handle case when no scan history exists", async () => {
      scannerService.getScanHistory.mockResolvedValue([]);
      auditService.getAuditLogs.mockResolvedValue([]);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      const result = await controller.getSecurityDashboard();
      expect(result.overview.securityScore).toBe(0);
      expect(result.statistics.totalVulnerabilities).toBe(0);
      expect(result.topVulnerabilities).toEqual([]);
    });

    it("should add critical vulnerability recommendation when critical vulnerabilities exist", async () => {
      const mockScanWithCritical = {
        ...mockScanResult,
        summary: { critical: 2, high: 1, medium: 0, low: 0, info: 0 },
        securityScore: 40,
      } as any;
      scannerService.getScanHistory.mockResolvedValue([mockScanWithCritical]);
      auditService.getAuditLogs.mockResolvedValue([]);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      const result = await controller.getSecurityDashboard();
      expect(result.recommendations).toContain("立即修复严重安全漏洞");
      expect(result.recommendations).toContain("提升整体安全配置");
    });

    it("should add suspicious activity recommendation when threshold exceeded", async () => {
      const suspiciousEvents = Array(15).fill({
        ...mockSecurityEvent,
        type: "suspicious_activity",
      });
      auditService.getAuditLogs.mockResolvedValue(suspiciousEvents);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      const result = await controller.getSecurityDashboard();
      expect(result.recommendations).toContain("加强可疑活动监控");
    });

    it("should add brute force recommendation when failed authentications exceed threshold", async () => {
      const failedAuthEvents = Array(60).fill({
        ...mockSecurityEvent,
        type: "authentication",
        outcome: "failure",
      });
      auditService.getAuditLogs.mockResolvedValue(failedAuthEvents);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      const result = await controller.getSecurityDashboard();
      expect(result.recommendations).toContain("检查是否存在暴力破解攻击");
    });

    it("should filter and return only high risk events", async () => {
      const mixedEvents = [
        {
          ...mockSecurityEvent,
          severity: "critical",
          eventId: "evt-1",
          riskScore: 90,
          tags: ["critical"],
        },
        {
          ...mockSecurityEvent,
          severity: "high",
          eventId: "evt-2",
          riskScore: 75,
          tags: ["high"],
        },
        {
          ...mockSecurityEvent,
          severity: "medium",
          eventId: "evt-3",
          riskScore: 50,
          tags: ["medium"],
        },
        {
          ...mockSecurityEvent,
          severity: "low",
          eventId: "evt-4",
          riskScore: 25,
          tags: ["low"],
        },
      ] as any;
      auditService.getAuditLogs.mockResolvedValue(mixedEvents);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      const result = await controller.getSecurityDashboard();
      expect(result.recentHighRiskEvents).toHaveLength(2);
      expect(
        result.recentHighRiskEvents.every(
          (e) => e.severity === "critical" || e.severity === "high",
        ),
      ).toBe(true);
    });

    it("should return correct security status for different scores", async () => {
      // Test excellent score (>=90)
      const excellentScan = { ...mockScanResult, securityScore: 95 } as any;
      scannerService.getScanHistory.mockResolvedValue([excellentScan]);
      auditService.getAuditLogs.mockResolvedValue([]);
      auditService.getSuspiciousIPs.mockResolvedValue([]);

      let result = await controller.getSecurityDashboard();
      expect(result.overview.status).toBe("excellent");

      // Test good score (>=_80)
      const goodScan = { ...mockScanResult, securityScore: 85 } as any;
      scannerService.getScanHistory.mockResolvedValue([goodScan]);
      result = await controller.getSecurityDashboard();
      expect(result.overview.status).toBe("good");

      // Test fair score (>=_70)
      const fairScan = { ...mockScanResult, securityScore: 75 } as any;
      scannerService.getScanHistory.mockResolvedValue([fairScan]);
      result = await controller.getSecurityDashboard();
      expect(result.overview.status).toBe("fair");

      // Test poor score (>=60)
      const poorScan = { ...mockScanResult, securityScore: 65 } as any;
      scannerService.getScanHistory.mockResolvedValue([poorScan]);
      result = await controller.getSecurityDashboard();
      expect(result.overview.status).toBe("poor");

      // Test critical score (<60)
      const criticalScan = { ...mockScanResult, securityScore: 50 } as any;
      scannerService.getScanHistory.mockResolvedValue([criticalScan]);
      result = await controller.getSecurityDashboard();
      expect(result.overview.status).toBe("critical");
    });
  });
});
