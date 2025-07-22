import { Test, TestingModule } from '@nestjs/testing';
import { SecurityController } from '../../../../src/security/security.controller';
import { SecurityScannerService } from '../../../../src/security/security-scanner.service';
import { SecurityAuditService } from '../../../../src/security/security-audit.service';
import { PermissionService } from '../../../../src/auth/services/permission.service';
import { RateLimitService } from '../../../../src/auth/services/rate-limit.service';
import { UnifiedPermissionsGuard } from '../../../../src/auth/guards/unified-permissions.guard';
import { BadRequestException } from '@nestjs/common';
import { GetAuditEventsQueryDto } from '../../../../src/security/dto/security-query.dto';

describe('SecurityController', () => {
  let controller: SecurityController;
  let scannerService: jest.Mocked<SecurityScannerService>;
  let auditService: jest.Mocked<SecurityAuditService>;

  const mockScanResult = {
    scanId: 'scan-123',
    timestamp: new Date(),
    duration: 5000,
    totalChecks: 10,
    vulnerabilities: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    securityScore: 100,
    recommendations: [],
  };

  const mockSecurityEvent = {
    id: 'event-1',
    type: 'authentication',
    severity: 'medium',
    action: 'login_success',
    clientIP: '127.0.0.1',
    userAgent: 'test-agent',
    details: {},
    timestamp: new Date(),
    source: 'test',
    outcome: 'success',
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
            getScanHistory: jest.fn().mockReturnValue([mockScanResult]),
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
            getSuspiciousIPs: jest.fn().mockReturnValue(['1.2.3.4']),
            getIPAnalysis: jest.fn().mockReturnValue({ requestCount: 10, failureCount: 5, lastSeen: new Date() }),
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('performSecurityScan', () => {
    it('should perform a security scan and return the results', async () => {
      const result = await controller.performSecurityScan();
      expect(result.scanId).toBe(mockScanResult.scanId);
      expect(scannerService.performSecurityScan).toHaveBeenCalled();
    });
  });

  describe('getScanHistory', () => {
    it('should return scan history', async () => {
      const result = await controller.getScanHistory('5');
      expect(result.scans).toHaveLength(1);
      expect(scannerService.getScanHistory).toHaveBeenCalledWith(5);
    });
  });

  describe('getVulnerabilities', () => {
    it('should return vulnerabilities from the latest scan', async () => {
      const result = await controller.getVulnerabilities({});
      expect(result.vulnerabilities).toEqual([]);
    });
  });

  describe('getSecurityConfiguration', () => {
    it('should return security configuration and validation', async () => {
      const result = await controller.getSecurityConfiguration();
      expect(result).toHaveProperty('configuration');
      expect(result).toHaveProperty('validation');
    });
  });

  describe('getAuditEvents', () => {
    it('should return audit events', async () => {
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

  describe('generateAuditReport', () => {
    it('should generate an audit report', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();
      const result = await controller.generateAuditReport(startDate, endDate);
      expect(result).toHaveProperty('summary');
    });

    it('should throw error for invalid date range', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() - 86400000).toISOString();
      await expect(controller.generateAuditReport(startDate, endDate)).rejects.toThrow(
        new BadRequestException('开始日期必须小于结束日期'),
      );
    });
  });

  describe('getSuspiciousIPs', () => {
    it('should return a list of suspicious IPs', async () => {
      const result = await controller.getSuspiciousIPs();
      expect(result.suspiciousIPs).toHaveLength(1);
      expect(result.suspiciousIPs[0].ip).toBe('1.2.3.4');
    });
  });

  describe('clearSuspiciousIP', () => {
    it('should clear a suspicious IP', async () => {
      await controller.clearSuspiciousIP('1.2.3.4');
      expect(auditService.clearSuspiciousIP).toHaveBeenCalledWith('1.2.3.4');
    });
  });

  describe('recordManualEvent', () => {
    it('should record a manual security event', async () => {
      const eventData = {
        type: 'system' as const,
        severity: 'high' as const,
        action: 'manual_test',
        clientIP: '127.0.0.1',
        userAgent: 'manual-agent',
        outcome: 'success' as const,
      };
      await controller.recordManualEvent(eventData);
      expect(auditService.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('getSecurityDashboard', () => {
    it('should return security dashboard data', async () => {
      const result = await controller.getSecurityDashboard();
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('statistics');
    });
  });
});
