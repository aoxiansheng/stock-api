import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SecurityAuditService } from "../../../../../src/security/services/security-audit.service";
import { SecurityAuditLogRepository } from "../../../../../src/security/repositories/security-audit-log.repository";
import { CacheService } from "../../../../../src/cache/services/cache.service";
import {  
  SECURITY_AUDIT_CONFIG,
  SECURITY_AUDIT_OPERATIONS,
  SECURITY_AUDIT_MESSAGES,
  SECURITY_AUDIT_RECOMMENDATIONS,
  SECURITY_AUDIT_EVENT_SOURCES,
  SECURITY_AUDIT_EVENT_SEVERITIES,
} from "../../../../../src/security/constants/security-audit.constants";

describe("SecurityAuditService Optimization Features", () => {
  let service: SecurityAuditService;
  let auditLogRepository: jest.Mocked<SecurityAuditLogRepository>;
  let cacheService: jest.Mocked<CacheService>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAuditLogRepository = {
      findWithFilters: jest.fn().mockResolvedValue([]),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockCacheService = {
      listPush: jest.fn().mockResolvedValue(1),
      listTrim: jest.fn().mockResolvedValue(true),
      listRange: jest.fn().mockResolvedValue([]),
      setAdd: jest.fn().mockResolvedValue(1),
      setIsMember: jest.fn().mockResolvedValue(false),
      setMembers: jest.fn().mockResolvedValue([]),
      setRemove: jest.fn().mockResolvedValue(1),
      hashGetAll: jest.fn().mockResolvedValue({}),
      hashIncrementBy: jest.fn().mockResolvedValue(1),
      hashSet: jest.fn().mockResolvedValue(true),
      expire: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        {
          provide: SecurityAuditLogRepository,
          useValue: mockAuditLogRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
    auditLogRepository = module.get(SecurityAuditLogRepository);
    cacheService = module.get(CacheService);

    // Spy on logger
    loggerSpy = jest
      .spyOn((service as any).logger, "debug")
      .mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use configuration constants for event ID generation", async () => {
      await service.logSecurityEvent({
        type: "authentication",
        severity: "info",
        action: "test_action",
        clientIP: "127.0.0.1",
        userAgent: "test-agent",
        details: {},
        source: "test",
        outcome: "success",
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.EVENT_LOGGED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.LOG_SECURITY_EVENT,
        }),
      );
    });

    it("should use operation constants for logging", () => {
      expect(SECURITY_AUDIT_OPERATIONS.LOG_SECURITY_EVENT).toBe(
        "logSecurityEvent",
      );
      expect(SECURITY_AUDIT_OPERATIONS.GENERATE_AUDIT_REPORT).toBe(
        "generateAuditReport",
      );
      expect(SECURITY_AUDIT_OPERATIONS.FLUSH_AUDIT_LOGS).toBe("flushAuditLogs");
    });

    it("should use message constants for logging", () => {
      expect(SECURITY_AUDIT_MESSAGES.EVENT_LOGGED).toBe(
        "安全事件已记录到缓冲区",
      );
      expect(SECURITY_AUDIT_MESSAGES.AUDIT_REPORT_GENERATED).toBe(
        "审计报告生成成功",
      );
      expect(SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_CLEARED).toBe(
        "清除可疑IP标记",
      );
    });

    it("should use event source constants", () => {
      expect(SECURITY_AUDIT_EVENT_SOURCES.AUTH_SERVICE).toBe("AuthService");
      expect(SECURITY_AUDIT_EVENT_SOURCES.AUTHORIZATION_SERVICE).toBe(
        "AuthorizationService",
      );
      expect(SECURITY_AUDIT_EVENT_SOURCES.DATA_ACCESS_SERVICE).toBe(
        "DataAccessService",
      );
    });
  });

  describe("Enhanced Event Logging", () => {
    it("should log authentication events with proper constants", async () => {
      await service.logAuthenticationEvent(
        "user_login",
        "success",
        "127.0.0.1",
        "test-agent",
        "user123",
      );

      expect(cacheService.listPush).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.EVENT_LOGGED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.LOG_SECURITY_EVENT,
        }),
      );
    });

    it("should use severity constants for authentication events", async () => {
      const logSpy = jest.spyOn(service, "logSecurityEvent");

      await service.logAuthenticationEvent(
        "user_login",
        "failure",
        "127.0.0.1",
        "test-agent",
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: SECURITY_AUDIT_EVENT_SEVERITIES.MEDIUM,
          source: SECURITY_AUDIT_EVENT_SOURCES.AUTH_SERVICE,
        }),
      );
    });

    it("should use severity constants for authorization events", async () => {
      const logSpy = jest.spyOn(service, "logSecurityEvent");

      await service.logAuthorizationEvent(
        "api_access",
        "blocked",
        "127.0.0.1",
        "test-agent",
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: SECURITY_AUDIT_EVENT_SEVERITIES.HIGH,
          source: SECURITY_AUDIT_EVENT_SOURCES.AUTHORIZATION_SERVICE,
        }),
      );
    });
  });

  describe("Enhanced Audit Report Generation", () => {
    it("should use configuration constants for report limits", async () => {
      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        _id: `event${i}`,
        eventId: `evt_${i}`,
        type: "authentication",
        severity: "info",
        action: "test",
        clientIP: "127.0.0.1",
        userAgent: "test",
        details: {},
        timestamp: new Date(),
        source: "test",
        outcome: "success",
        riskScore: 10,
        tags: [],
      }));

      auditLogRepository.findWithFilters.mockResolvedValue(mockEvents as any);

      const startDate = new Date("2023-01-01");
      const endDate = new Date("2023-01-02");

      await service.generateAuditReport(startDate, endDate);

      expect(auditLogRepository.findWithFilters).toHaveBeenCalledWith(
        { startDate, endDate },
        SECURITY_AUDIT_CONFIG.REPORT_MAX_EVENTS,
        0,
      );
    });

    it("should generate enhanced recommendations based on summary", async () => {
      const mockEvents = [
        {
          _id: "event1",
          eventId: "evt_1",
          type: "authentication",
          severity: "medium",
          action: "login_failed",
          clientIP: "127.0.0.1",
          userAgent: "test",
          details: {},
          timestamp: new Date(),
          source: "AuthService",
          outcome: "failure",
          riskScore: 30,
          tags: [],
        },
      ];

      // Create enough failed authentications to trigger recommendations
      const manyFailedEvents = Array.from({ length: 15 }, (_, i) => ({
        ...mockEvents[0],
        _id: `event${i}`,
        eventId: `evt_${i}`,
      }));

      auditLogRepository.findWithFilters.mockResolvedValue(
        manyFailedEvents as any,
      );

      const startDate = new Date("2023-01-01");
      const endDate = new Date("2023-01-02");

      const report = await service.generateAuditReport(startDate, endDate);

      expect(report.recommendations).toContain(
        SECURITY_AUDIT_RECOMMENDATIONS.STRICT_ACCOUNT_LOCKOUT,
      );
      expect(report.recommendations).toContain(
        SECURITY_AUDIT_RECOMMENDATIONS.ENABLE_MFA,
      );
    });
  });
  describe("Enhanced Error Handling", () => {
    it("should handle audit log retrieval errors gracefully", async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation();
      auditLogRepository.findWithFilters.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.getAuditLogs()).rejects.toThrow("Database error");

      expect(errorSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.GET_AUDIT_LOGS_FAILED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.GET_AUDIT_LOGS,
        }),
      );
    });

    it("should handle IP analysis update errors gracefully", async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation();
      cacheService.hashIncrementBy.mockRejectedValue(new Error("Cache error"));

      const event = {
        id: "evt_123",
        type: "authentication" as const,
        severity: "info" as const,
        action: "test",
        clientIP: "127.0.0.1",
        userAgent: "test",
        details: {},
        timestamp: new Date(),
        source: "test",
        outcome: "success" as const,
      };

      // Should not throw error, but log it
      await (service as any).updateIPAnalysis(event);

      expect(errorSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.IP_ANALYSIS_UPDATE_FAILED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.UPDATE_IP_ANALYSIS,
        }),
      );
    });
  });

  describe("Enhanced Logging and Monitoring", () => {
    it("should log suspicious IP detection", async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      // Mock high failure count
      cacheService.hashIncrementBy.mockResolvedValueOnce(10); // request count
      cacheService.hashIncrementBy.mockResolvedValueOnce(8); // failure count

      const event = {
        id: "evt_123",
        type: "authentication" as const,
        severity: "info" as const,
        action: "test",
        clientIP: "127.0.0.1",
        userAgent: "test",
        details: {},
        timestamp: new Date(),
        source: "test",
        outcome: "failure" as const,
      };

      await (service as any).updateIPAnalysis(event);

      expect(warnSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_DETECTED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.UPDATE_IP_ANALYSIS,
          ip: "127.0.0.1",
        }),
      );
    });

    it("should log critical event detection", () => {
      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      const event = {
        id: "evt_123",
        type: "suspicious_activity" as const,
        severity: "critical" as const,
        action: "test",
        clientIP: "127.0.0.1",
        userAgent: "test",
        details: {},
        timestamp: new Date(),
        source: "test",
        outcome: "blocked" as const,
      };

      (service as any).processHighSeverityEvent(event);

      expect(warnSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.CRITICAL_EVENT_DETECTED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.PROCESS_HIGH_SEVERITY_EVENT,
          eventId: "evt_123",
          severity: "critical",
        }),
      );
    });
  });

  describe("Configuration Constants Usage", () => {
    it("should use default query limits from constants", async () => {
      await service.getAuditLogs();

      expect(auditLogRepository.findWithFilters).toHaveBeenCalledWith(
        {},
        SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_LIMIT,
        SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_OFFSET,
      );
    });

    it("should use event ID configuration for generation", async () => {
      const eventIdRegex = new RegExp(
        `^${SECURITY_AUDIT_CONFIG.EVENT_ID_PREFIX}\\d+_[a-f0-9]{${SECURITY_AUDIT_CONFIG.EVENT_ID_UUID_LENGTH}}$`,
      );

      await service.logSecurityEvent({
        type: "authentication",
        severity: "info",
        action: "test",
        clientIP: "127.0.0.1",
        userAgent: "test",
        details: {},
        source: "test",
        outcome: "success",
      });

      const logCall = loggerSpy.mock.calls.find(
        (call) => call[0] === SECURITY_AUDIT_MESSAGES.EVENT_LOGGED,
      );

      expect(logCall).toBeDefined();
      expect(logCall[1].eventId).toMatch(eventIdRegex);
    });
  });
});
