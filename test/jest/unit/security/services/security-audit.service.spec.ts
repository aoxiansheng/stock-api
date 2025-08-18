/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InternalServerErrorException } from '@nestjs/common';
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
  SECURITY_AUDIT_RECOMMENDATION_THRESHOLDS,
} from "../../../../../src/security/constants/security-audit.constants";
import { RISK_SCORE_WEIGHTS, TAG_GENERATION_RULES } from "../../../../../src/security/constants/security.constants";

describe("SecurityAuditService", () => {
  let service: SecurityAuditService;
  let auditLogRepository: jest.Mocked<SecurityAuditLogRepository>;
  let cacheService: jest.Mocked<CacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAuditLogRepository = {
      findWithFilters: jest.fn().mockResolvedValue([]),
      _insertMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      delet_eMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    const mockEventEmitter = {
      emit: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
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
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(1),
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
    eventEmitter = module.get(EventEmitter2);

    // Spy on logger methods
    loggerSpy = jest
      .spyOn((service as any).logger, "debug")
      .mockImplementation();
    jest.spyOn((service as any).logger, "log").mockImplementation();
    jest.spyOn((service as any).logger, "warn").mockImplementation();
    jest.spyOn((service as any).logger, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all required dependencies injected', () => {
      expect(auditLogRepository).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(eventEmitter).toBeDefined();
    });
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

  describe('Data Access Event Logging', () => {
    it('should log data access events with proper severity mapping', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logDataAccessEvent(
        'data_query',
        '/api/data',
        '192.168.1.1',
        'test-agent',
        'user123',
        'api-key-123',
        'success',
        { query: 'test' }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data_access',
          severity: SECURITY_AUDIT_EVENT_SEVERITIES.INFO,
          source: SECURITY_AUDIT_EVENT_SOURCES.DATA_ACCESS_SERVICE,
          outcome: 'success',
          details: expect.objectContaining({
            resource: '/api/data',
            endpoint: '/api/data',
            query: 'test'
          })
        })
      );
    });

    it('should use high severity for blocked data access', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logDataAccessEvent(
        'unauthorized_access',
        '/api/sensitive',
        '10.0.0.1',
        'malicious-agent',
        undefined,
        undefined,
        'blocked',
        { reason: 'insufficient_permissions' }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: SECURITY_AUDIT_EVENT_SEVERITIES.HIGH,
          outcome: 'blocked'
        })
      );
    });
  });

  describe('Suspicious Activity Logging', () => {
    it('should log suspicious activity and mark IP as suspicious', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logSuspiciousActivity(
        'brute_force_attempt',
        '127.0.0.1',
        'bot-agent',
        { attemptCount: 50 },
        'high'
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_activity',
          severity: 'high',
          source: SECURITY_AUDIT_EVENT_SOURCES.SECURITY_MIDDLEWARE,
          outcome: 'blocked'
        })
      );
      expect(cacheService.setAdd).toHaveBeenCalledWith(
        expect.stringContaining('suspicious_ips'),
        '127.0.0.1'
      );
    });

    it('should default to high severity if not specified', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logSuspiciousActivity(
        'sql_injection_attempt',
        '192.168.1.100',
        'hacker-tool',
        { payload: 'SELECT * FROM users' }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'high'
        })
      );
    });
  });

  describe('System Event Logging', () => {
    it('should log system events with correct parameters', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logSystemEvent(
        'database_connection_lost',
        'critical',
        { database: 'main', connectionPool: 'primary' },
        'failure'
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          severity: 'critical',
          action: 'database_connection_lost',
          clientIP: 'system',
          userAgent: 'system',
          source: SECURITY_AUDIT_EVENT_SOURCES.SYSTEM_SERVICE,
          outcome: 'failure'
        })
      );
    });

    it('should default to success outcome', async () => {
      const logSpy = jest.spyOn(service, 'logSecurityEvent');

      await service.logSystemEvent(
        'backup_completed',
        'info',
        { size: '100MB', duration: '5min' }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'success'
        })
      );
    });
  });

  describe('Audit Logs Retrieval', () => {
    it('should get audit logs with default parameters', async () => {
      const mockLogs = [
        {
          id: 'log1',
          eventId: 'evt_1',
          type: 'authentication',
          severity: 'info',
          timestamp: new Date()
        }
      ];
      auditLogRepository.findWithFilters.mockResolvedValue(mockLogs as any);

      const result = await service.getAuditLogs();

      expect(auditLogRepository.findWithFilters).toHaveBeenCalledWith(
        {},
        SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_LIMIT,
        SECURITY_AUDIT_CONFIG.DEFAULT_QUERY_OFFSET
      );
      expect(result).toEqual(mockLogs);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02'),
        type: 'authentication',
        severity: 'high',
        clientIP: '127.0.0.1',
        userId: 'user123',
        outcome: 'failure'
      };
      
      await service.getAuditLogs(filters, 50, 10);

      expect(auditLogRepository.findWithFilters).toHaveBeenCalledWith(
        filters,
        50,
        10
      );
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      auditLogRepository.findWithFilters.mockRejectedValue(error);
      const errorSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.getAuditLogs()).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.GET_AUDIT_LOGS_FAILED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.GET_AUDIT_LOGS,
          error: error.message
        })
      );
    });
  });

  describe("Enhanced Audit Report Generation", () => {
    it("should use configuration constants for report limits", async () => {
      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        id: `event${i}`,
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
          id: "event1",
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
        id: `event${i}`,
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

    it('should generate comprehensive audit report', async () => {
      const mockEvents = [
        {
          id: 'event1',
          eventId: 'evt_1',
          type: 'authentication',
          severity: 'critical',
          action: 'login_failed',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'failure',
          riskScore: 80,
          tags: ['auth', 'failure'],
          userId: 'user123'
        },
        {
          id: 'event2',
          eventId: 'evt_2',
          type: 'suspicious_activity',
          severity: 'high',
          action: 'brute_force',
          clientIP: '192.168.1.2',
          userAgent: 'bot',
          details: {},
          timestamp: new Date(),
          source: 'security',
          outcome: 'blocked',
          riskScore: 70,
          tags: ['suspicious', 'blocked']
        },
        {
          id: 'event3',
          eventId: 'evt_3',
          type: 'data_access',
          severity: 'info',
          action: 'api_call',
          clientIP: '192.168.1.3',
          userAgent: 'app',
          details: {},
          timestamp: new Date(),
          source: 'api',
          outcome: 'success',
          riskScore: 20,
          tags: ['data', 'success'],
          userId: 'user456'
        }
      ];
      
      auditLogRepository.findWithFilters.mockResolvedValue(mockEvents as any);
      
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');
      
      const report = await service.generateAuditReport(startDate, endDate);
      
      expect(report.period).toEqual({ start: startDate, end: endDate });
      expect(report.summary.totalEvents).toBe(3);
      expect(report.summary.criticalEvents).toBe(1);
      expect(report.summary.failedAuthentications).toBe(1);
      expect(report.summary.suspiciousActivities).toBe(1);
      expect(report.summary.dataAccessEvents).toBe(1);
      expect(report.summary.uniqueIPs).toBe(3);
      expect(report.summary.uniqueUsers).toBe(2);
      expect(report.topRisks).toHaveLength(2); // critical and high severity events
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should handle audit report generation errors', async () => {
      const error = new Error('Database error');
      auditLogRepository.findWithFilters.mockRejectedValue(error);
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');
      
      await expect(service.generateAuditReport(startDate, endDate))
        .rejects.toThrow(InternalServerErrorException);
        
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.GENERATE_AUDIT_REPORT,
          error: error.stack
        }),
        SECURITY_AUDIT_MESSAGES.GENERATE_REPORT_FAILED
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

  describe('IP Analysis', () => {
    describe('isIPSuspicious', () => {
      it('should check if IP is suspicious', async () => {
        cacheService.setIsMember.mockResolvedValue(true);
        
        const result = await service.isIPSuspicious('192.168.1.1');
        
        expect(result).toBe(true);
        expect(cacheService.setIsMember).toHaveBeenCalledWith(
          expect.stringContaining('suspicious_ips'),
          '192.168.1.1'
        );
      });
    });

    describe('getIPAnalysis', () => {
      it('should return IP analysis data', async () => {
        const mockData = {
          requestCount: '10',
          failureCount: '3',
          lastSeen: new Date().toISOString()
        };
        cacheService.hashGetAll.mockResolvedValue(mockData);

        const result = await service.getIPAnalysis('192.168.1.1');

        expect(result).toEqual({
          requestCount: 10,
          failureCount: 3,
          lastSeen: new Date(mockData.lastSeen)
        });
      });

      it('should return null for non-existent IP', async () => {
        cacheService.hashGetAll.mockResolvedValue({});

        const result = await service.getIPAnalysis('192.168.1.1');

        expect(result).toBeNull();
      });

      it('should handle invalid data gracefully', async () => {
        cacheService.hashGetAll.mockResolvedValue({
          requestCount: 'invalid',
          failureCount: null,
          lastSeen: new Date().toISOString()
        });

        const result = await service.getIPAnalysis('192.168.1.1');

        expect(result.requestCount).toBe(0);
        expect(result.failureCount).toBe(0);
      });
    });

    describe('getSuspiciousIPs', () => {
      it('should return list of suspicious IPs', async () => {
        const mockIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
        cacheService.setMembers.mockResolvedValue(mockIPs);

        const result = await service.getSuspiciousIPs();

        expect(result).toEqual(mockIPs);
        expect(cacheService.setMembers).toHaveBeenCalledWith(
          expect.stringContaining('suspicious_ips')
        );
      });
    });

    describe('clearSuspiciousIP', () => {
      it('should clear suspicious IP and log action', () => {
        const logSpy = jest.spyOn((service as any).logger, 'log');

        service.clearSuspiciousIP('192.168.1.1');

        expect(cacheService.setRemove).toHaveBeenCalledWith(
          expect.stringContaining('suspicious_ips'),
          '192.168.1.1'
        );
        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_CLEARED,
          { ip: '192.168.1.1' }
        );
      });
    });
  });

  describe('Event Listeners', () => {
    describe('handleLoginSuccess', () => {
      it('should handle login success events', async () => {
        const logSpy = jest.spyOn(service, 'logAuthenticationEvent');
        const data = {
          userId: 'user123',
          clientIP: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        await service.handleLoginSuccess(data);

        expect(logSpy).toHaveBeenCalledWith(
          'user_login',
          'success',
          data.clientIP,
          data.userAgent,
          data.userId
        );
      });
    });

    describe('handleLoginFailure', () => {
      it('should handle login failure events', async () => {
        const logSpy = jest.spyOn(service, 'logAuthenticationEvent');
        const data = {
          username: 'testuser',
          clientIP: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          reason: 'invalid_password'
        };

        await service.handleLoginFailure(data);

        expect(logSpy).toHaveBeenCalledWith(
          'user_login_failed',
          'failure',
          data.clientIP,
          data.userAgent,
          undefined,
          { username: data.username, reason: data.reason }
        );
      });
    });

    describe('handleAPIKeyUsed', () => {
      it('should handle API key usage events', async () => {
        const logSpy = jest.spyOn(service, 'logDataAccessEvent');
        const data = {
          apiKeyId: 'api-key-123',
          clientIP: '192.168.1.1',
          userAgent: 'curl/7.68.0',
          endpoint: '/api/v1/data'
        };

        await service.handleAPIKeyUsed(data);

        expect(logSpy).toHaveBeenCalledWith(
          'api_access',
          data.endpoint,
          data.clientIP,
          data.userAgent,
          undefined,
          data.apiKeyId
        );
      });
    });
  });

  describe('Periodic Tasks', () => {
    describe('flushAuditLogs', () => {
      it('should flush audit logs successfully', async () => {
        const mockEvents = [
          JSON.stringify({
            id: 'evt_1',
            type: 'authentication',
            severity: 'info',
            action: 'login',
            clientIP: '127.0.0.1',
            userAgent: 'test',
            details: {},
            timestamp: new Date(),
            source: 'auth',
            outcome: 'success'
          })
        ];
        cacheService.listRange.mockResolvedValue(mockEvents);
        
        // Mock calculateRiskScore and generateTags
        jest.spyOn(service as any, 'calculateRiskScore').mockResolvedValue(10);
        jest.spyOn(service as any, 'generateTags').mockResolvedValue(['auth', 'success']);

        await service.flushAuditLogs();

        expect(cacheService.listRange).toHaveBeenCalled();
        expect(cacheService.listTrim).toHaveBeenCalled();
        expect(auditLogRepository.insertMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              eventId: 'evt_1',
              type: 'authentication',
              riskScore: 10,
              tags: ['auth', 'success']
            })
          ])
        );
      });

      it('should handle empty event buffer', async () => {
        cacheService.listRange.mockResolvedValue([]);
        const logSpy = jest.spyOn((service as any).logger, 'debug');

        await service.flushAuditLogs();

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.EVENT_BUFFER_EMPTY,
          expect.objectContaining({
            operation: SECURITY_AUDIT_OPERATIONS.FLUSH_AUDIT_LOGS
          })
        );
        expect(auditLogRepository.insertMany).not.toHaveBeenCalled();
      });

      it('should handle flush errors', async () => {
        const error = new Error('Database error');
        cacheService.listRange.mockRejectedValue(error);
        const errorSpy = jest.spyOn((service as any).logger, 'error');

        await expect(service.flushAuditLogs()).rejects.toThrow(error);
        expect(errorSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.FLUSH_LOGS_FAILED,
          expect.objectContaining({
            operation: SECURITY_AUDIT_OPERATIONS.FLUSH_AUDIT_LOGS,
            error: error.stack
          })
        );
      });
    });

    describe('cleanupOldData', () => {
      it('should log cleanup operation', async () => {
        const logSpy = jest.spyOn((service as any).logger, 'debug');

        await service.cleanupOldData();

        expect(logSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.CLEANUP_AUTO_HANDLED,
          expect.objectContaining({
            operation: SECURITY_AUDIT_OPERATIONS.CLEANUP_OLD_DATA
          })
        );
      });
    });
  });

  describe('Private Methods - Risk Calculation & Tag Generation', () => {
    describe('calculateRiskScore', () => {
      it('should calculate risk score based on event properties', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'high' as const,
          action: 'login_failed',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'failure' as const
        };

        // Mock IP analysis
        cacheService.setIsMember.mockResolvedValue(false);
        cacheService.hashGetAll.mockResolvedValue({
          requestCount: '5',
          failureCount: '2',
          lastSeen: new Date().toISOString()
        });

        const score = await (service as any).calculateRiskScore(event);

        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should add suspicious IP weight to score', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'medium' as const,
          action: 'login',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'success' as const
        };

        cacheService.setIsMember.mockResolvedValue(true); // IP is suspicious
        cacheService.hashGetAll.mockResolvedValue({});

        const score = await (service as any).calculateRiskScore(event);

        expect(score).toBeGreaterThan(0);
      });

      it('should handle risk calculation errors', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'info' as const,
          action: 'login',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'success' as const
        };

        cacheService.setIsMember.mockRejectedValue(new Error('Cache error'));
        const errorSpy = jest.spyOn((service as any).logger, 'error');

        const score = await (service as any).calculateRiskScore(event);

        expect(score).toBe(0);
        expect(errorSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.RISK_SCORE_CALCULATION_FAILED,
          expect.objectContaining({
            operation: SECURITY_AUDIT_OPERATIONS.CALCULATE_RISK_SCORE,
            eventId: event.id
          })
        );
      });
    });

    describe('generateTags', () => {
      it('should generate tags based on event properties', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'high' as const,
          action: 'login_failed',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'failure' as const
        };

        cacheService.setIsMember.mockResolvedValue(false);

        const tags = await (service as any).generateTags(event);

        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThan(0);
      });

      it('should add suspicious IP tag', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'medium' as const,
          action: 'login',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'success' as const
        };

        cacheService.setIsMember.mockResolvedValue(true);

        const tags = await (service as any).generateTags(event);

        expect(tags).toContain(TAG_GENERATION_RULES.conditions.isSuspiciousIp);
      });

      it('should handle tag generation errors', async () => {
        const event = {
          id: 'evt_123',
          type: 'authentication' as const,
          severity: 'info' as const,
          action: 'login',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'auth',
          outcome: 'success' as const
        };

        cacheService.setIsMember.mockRejectedValue(new Error('Cache error'));
        const errorSpy = jest.spyOn((service as any).logger, 'error');

        const tags = await (service as any).generateTags(event);

        expect(tags).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.TAGS_GENERATION_FAILED,
          expect.objectContaining({
            operation: SECURITY_AUDIT_OPERATIONS.GENERATE_TAGS,
            eventId: event.id
          })
        );
      });
    });
  });

  describe('Security Recommendations Generation', () => {
    it('should generate recommendations based on failed authentications', () => {
      const summary = {
        totalEvents: 100,
        criticalEvents: 2,
        failedAuthentications: 25, // Above threshold
        suspiciousActivities: 1,
        dataAccessEvents: 50,
        uniqueIPs: 10,
        uniqueUsers: 5
      };

      const recommendations = (service as any).generateSecurityRecommendations(summary);

      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.STRICT_ACCOUNT_LOCKOUT);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.ENABLE_MFA);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.STRENGTHEN_PASSWORD_POLICY);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_CAPTCHA);
    });

    it('should generate recommendations based on suspicious activities', () => {
      const summary = {
        totalEvents: 100,
        criticalEvents: 1,
        failedAuthentications: 5,
        suspiciousActivities: 15, // Above threshold
        dataAccessEvents: 50,
        uniqueIPs: 10,
        uniqueUsers: 5
      };

      const recommendations = (service as any).generateSecurityRecommendations(summary);

      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.STRENGTHEN_IP_BLACKLIST);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.USE_WAF_DDOS_PROTECTION);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.IMPLEMENT_RATE_LIMITING);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.ENHANCE_NETWORK_MONITORING);
    });

    it('should include universal recommendations', () => {
      const summary = {
        totalEvents: 50,
        criticalEvents: 1,
        failedAuthentications: 2,
        suspiciousActivities: 1,
        dataAccessEvents: 20,
        uniqueIPs: 5,
        uniqueUsers: 3
      };

      const recommendations = (service as any).generateSecurityRecommendations(summary);

      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.UPDATE_SECURITY_PATCHES);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.CONDUCT_SECURITY_AUDIT);
      expect(recommendations).toContain(SECURITY_AUDIT_RECOMMENDATIONS.BACKUP_SECURITY_LOGS);
    });

    it('should handle recommendation generation errors', () => {
      const summary = null; // Invalid summary to trigger error
      const errorSpy = jest.spyOn((service as any).logger, 'error');

      const recommendations = (service as any).generateSecurityRecommendations(summary);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('High Severity Event Processing', () => {
    it('should emit high severity event and log warning', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      
      const event = {
        id: 'evt_123',
        type: 'suspicious_activity' as const,
        severity: 'high' as const,
        action: 'ddos_attempt',
        clientIP: '192.168.1.1',
        userAgent: 'bot',
        details: {},
        timestamp: new Date(),
        source: 'security',
        outcome: 'blocked' as const
      };

      (service as any).processHighSeverityEvent(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith('security.high_severity_event', event);
      expect(warnSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.CRITICAL_EVENT_DETECTED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.PROCESS_HIGH_SEVERITY_EVENT,
          eventId: event.id,
          severity: event.severity
        })
      );
    });

    it('should auto-block critical suspicious activity', () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      
      const event = {
        id: 'evt_123',
        type: 'suspicious_activity' as const,
        severity: 'critical' as const,
        action: 'advanced_threat',
        clientIP: '192.168.1.1',
        userAgent: 'malware',
        details: {},
        timestamp: new Date(),
        source: 'security',
        outcome: 'blocked' as const
      };

      (service as any).processHighSeverityEvent(event);

      expect(cacheService.setAdd).toHaveBeenCalledWith(
        expect.stringContaining('suspicious_ips'),
        event.clientIP
      );
      expect(errorSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.HIGH_SEVERITY_EVENT_AUTO_BLOCK,
        expect.objectContaining({
          eventId: event.id,
          clientIP: event.clientIP
        })
      );
    });
  });

  describe('Log to Event Mapping', () => {
    it('should map log document to security event', () => {
      const mockLog = {
        eventId: 'evt_123',
        type: 'authentication',
        severity: 'info',
        action: 'login',
        userId: 'user123',
        apiKeyId: 'api-key-123',
        clientIP: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        details: { test: 'data' },
        timestamp: new Date(),
        source: 'auth',
        outcome: 'success'
      } as any;

      const event = (service as any).mapLogToEvent(mockLog);

      expect(event).toEqual({
        id: mockLog.eventId,
        type: mockLog.type,
        severity: mockLog.severity,
        action: mockLog.action,
        userId: mockLog.userId,
        apiKeyId: mockLog.apiKeyId,
        clientIP: mockLog.clientIP,
        userAgent: mockLog.userAgent,
        details: mockLog.details,
        timestamp: mockLog.timestamp,
        source: mockLog.source,
        outcome: mockLog.outcome
      });
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleDestroy', () => {
      it('should flush audit logs on module destroy', async () => {
        const flushSpy = jest.spyOn(service, 'flushAuditLogs').mockResolvedValue();
        
        await service.onModuleDestroy();
        
        expect(flushSpy).toHaveBeenCalled();
      });

      it('should handle flush errors on module destroy', async () => {
        const error = new Error('Flush failed');
        const flushSpy = jest.spyOn(service, 'flushAuditLogs').mockRejectedValue(error);
        const errorSpy = jest.spyOn((service as any).logger, 'error');
        
        await service.onModuleDestroy();
        
        expect(flushSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          SECURITY_AUDIT_MESSAGES.MODULE_DESTROY_FLUSH_FAILED,
          { error }
        );
      });
    });
  });

  describe('Error Handling in Core Methods', () => {
    it('should handle cache errors in logSecurityEvent', async () => {
      const error = new Error('Cache service unavailable');
      cacheService.listPush.mockRejectedValue(error);
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      
      const event = {
        type: 'authentication' as const,
        severity: 'info' as const,
        action: 'test',
        clientIP: '127.0.0.1',
        userAgent: 'test',
        details: {},
        source: 'test',
        outcome: 'success' as const
      };
      
      await expect(service.logSecurityEvent(event)).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.LOG_EVENT_FAILED,
        expect.objectContaining({
          operation: SECURITY_AUDIT_OPERATIONS.LOG_SECURITY_EVENT,
          error
        })
      );
    });
  });

  describe('IP Analysis Updates - Advanced Scenarios', () => {
    it('should mark IP as suspicious when failure threshold exceeded', async () => {
      const event = {
        id: 'evt_123',
        type: 'authentication' as const,
        severity: 'info' as const,
        action: 'login',
        clientIP: '192.168.1.1',
        userAgent: 'test',
        details: {},
        timestamp: new Date(),
        source: 'auth',
        outcome: 'failure' as const
      };

      // Mock high failure count that exceeds threshold
      cacheService.hashIncrementBy.mockResolvedValueOnce(10); // request count
      cacheService.hashIncrementBy.mockResolvedValueOnce(15); // failure count (exceeds threshold)
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await (service as any).updateIPAnalysis(event);

      expect(cacheService.setAdd).toHaveBeenCalledWith(
        expect.stringContaining('suspicious_ips'),
        '192.168.1.1'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_DETECTED,
        expect.objectContaining({
          ip: '192.168.1.1',
          requestCount: 10,
          failureCount: 15
        })
      );
    });

    it('should mark IP as suspicious when failure rate exceeded', async () => {
      const event = {
        id: 'evt_123',
        type: 'authentication' as const,
        severity: 'info' as const,
        action: 'login',
        clientIP: '192.168.1.1',
        userAgent: 'test',
        details: {},
        timestamp: new Date(),
        source: 'auth',
        outcome: 'failure' as const
      };

      // Mock high failure rate (8 failures out of 10 requests = 80%)
      cacheService.hashIncrementBy.mockResolvedValueOnce(10); // request count
      cacheService.hashIncrementBy.mockResolvedValueOnce(8); // failure count
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      // Mock config with failure rate threshold of 0.7 (70%)
      (service as any).config._highFailureRateThreshold = 0.7;

      await (service as any).updateIPAnalysis(event);

      expect(cacheService.setAdd).toHaveBeenCalledWith(
        expect.stringContaining('suspicious_ips'),
        '192.168.1.1'
      );
      expect(warnSpy).toHaveBeenCalledWith(
        SECURITY_AUDIT_MESSAGES.SUSPICIOUS_IP_DETECTED,
        expect.objectContaining({
          ip: '192.168.1.1',
          requestCount: 10,
          failureCount: 8,
          failureRate: 0.8
        })
      );
    });
  });
});