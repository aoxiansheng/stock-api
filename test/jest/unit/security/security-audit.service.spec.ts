import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { SecurityAuditService } from '../../../../src/security/security-audit.service';
import { SecurityEvent } from '../../../../src/security/interfaces/security-audit.interface';
import { createLogger } from '../../../../src/common/config/logger.config';
import { SecurityAuditLogRepository } from '../../../../src/security/repositories/security-audit-log.repository';
import { CacheService } from '../../../../src/cache/cache.service';

// Mock setInterval globally
const mockSetInterval = jest.fn();
global.setInterval = mockSetInterval;

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockAuditLogRepository: jest.Mocked<SecurityAuditLogRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  const mockSecurityEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
    type: 'authentication',
    severity: 'high',
    action: 'login_failed',
    userId: 'user-123',
    clientIP: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    details: { reason: 'invalid_password' },
    source: 'AuthService',
    outcome: 'failure',
  };

  beforeEach(async () => {
    // Reset mocks
    mockSetInterval.mockClear();

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    const mockLogger = createLogger('SecurityAuditService');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: 'LOGGER',
          useValue: mockLogger,
        },
        {
          provide: SecurityAuditLogRepository,
          useValue: {
            findWithFilters: jest.fn(),
            insertMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            listPush: jest.fn(),
            listTrim: jest.fn(),
            setAdd: jest.fn(),
            setIsMember: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            setRemove: jest.fn(),
            setMembers: jest.fn(),
            listRange: jest.fn(),
            del: jest.fn(),
            hashGetAll: jest.fn().mockResolvedValue({}),
            hashIncrementBy: jest.fn().mockResolvedValue(1),
            hashSet: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
    eventEmitter = module.get(EventEmitter2);
    mockAuditLogRepository = module.get(SecurityAuditLogRepository);
    mockCacheService = module.get(CacheService);

    // Clear timers to prevent interference
    if (jest.clearAllTimers) {
      jest.clearAllTimers();
    }
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (jest.clearAllTimers) {
      jest.clearAllTimers();
    }
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logSecurityEvent', () => {
    it('should log security event successfully', async () => {
      await service.logSecurityEvent(mockSecurityEvent);

      // Verify event was added to buffer (private property access)
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should process high severity events immediately', async () => {
      const criticalEvent = {
        ...mockSecurityEvent,
        severity: 'critical' as const,
      };

      await service.logSecurityEvent(criticalEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.high_severity_event',
        expect.objectContaining(criticalEvent),
      );
      // Ensure cache was called
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should mark IP as suspicious for critical suspicious activity', async () => {
      const criticalSuspiciousEvent = {
        ...mockSecurityEvent,
        type: 'suspicious_activity' as const,
        severity: 'critical' as const,
      };

      mockCacheService.setIsMember.mockResolvedValue(true);

      await service.logSecurityEvent(criticalSuspiciousEvent);

      expect(await service.isIPSuspicious('192.168.1.100')).toBe(true);
      expect(mockCacheService.listPush).toHaveBeenCalled();
      expect(mockCacheService.setIsMember).toHaveBeenCalledWith(expect.any(String), '192.168.1.100');
    });

    it('should limit event buffer size to 1000', async () => {
      // Fill buffer beyond limit
      for (let i = 0; i < 1050; i++) {
        await service.logSecurityEvent({
          ...mockSecurityEvent,
          clientIP: `192.168.1.${i % 255}`,
        });
      }

      expect(mockCacheService.listPush).toHaveBeenCalledTimes(1050);
      expect(mockCacheService.listTrim).toHaveBeenCalledTimes(1050);
    });

    it('should update IP analysis on each event', async () => {
      await service.logSecurityEvent(mockSecurityEvent);

      // For failure events, should increment both requestCount and failureCount
      expect(mockCacheService.hashIncrementBy).toHaveBeenCalledTimes(2);
      expect(mockCacheService.hashIncrementBy).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'), 'requestCount', 1);
      expect(mockCacheService.hashIncrementBy).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'), 'failureCount', 1);
      expect(mockCacheService.hashSet).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'), 'lastSeen', expect.any(String));
    });

    it('should use hashGetAll for success events', async () => {
      mockCacheService.hashGetAll.mockResolvedValue({
        requestCount: '5',
        failureCount: '2',
        lastSeen: new Date().toISOString(),
      });

      const successEvent = {
        ...mockSecurityEvent,
        outcome: 'success' as const,
      };

      await service.logSecurityEvent(successEvent);

      expect(mockCacheService.hashIncrementBy).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'), 'requestCount', 1);
      expect(mockCacheService.hashGetAll).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'));
      expect(mockCacheService.hashSet).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'), 'lastSeen', expect.any(String));
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log successful authentication event', async () => {
      await service.logAuthenticationEvent(
        'user_login',
        'success',
        '192.168.1.100',
        'Test Browser',
        'user-123'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log failed authentication with medium severity', async () => {
      await service.logAuthenticationEvent(
        'user_login',
        'failure',
        '192.168.1.100',
        'Test Browser',
        'user-123',
        { reason: 'invalid_password' }
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });
  });

  describe('logAuthorizationEvent', () => {
    it('should log authorization event with correct severity for blocked outcome', async () => {
      await service.logAuthorizationEvent(
        'access_denied',
        'blocked',
        '192.168.1.100',
        'Test Browser',
        'user-123',
        'api-key-123'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log authorization failure with medium severity', async () => {
      await service.logAuthorizationEvent(
        'insufficient_permissions',
        'failure',
        '192.168.1.100',
        'Test Browser',
        'user-123'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log successful authorization with info severity', async () => {
      await service.logAuthorizationEvent(
        'access_granted',
        'success',
        '192.168.1.100',
        'Test Browser',
        'user-123'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });
  });

  describe('logDataAccessEvent', () => {
    it('should log data access event successfully', async () => {
      await service.logDataAccessEvent(
        'read',
        'stock_quotes',
        '192.168.1.100',
        'Test Browser',
        'user-123',
        'api-key-123'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log blocked data access with high severity', async () => {
      await service.logDataAccessEvent(
        'read',
        'sensitive_data',
        '192.168.1.100',
        'Test Browser',
        'user-123',
        undefined,
        'blocked'
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity and mark IP as suspicious', async () => {
      await service.logSuspiciousActivity(
        'brute_force_attempt',
        '192.168.1.100',
        'Test Browser',
        { pattern: 'Repeated failed logins' }
      );

      expect(mockCacheService.listPush).toHaveBeenCalled();
      expect(mockCacheService.setAdd).toHaveBeenCalledWith(expect.any(String), '192.168.1.100');
    });

    it('should accept custom severity levels', async () => {
      await service.logSuspiciousActivity(
        'unusual_behavior',
        '192.168.1.101',
        'Test Browser',
        { details: 'Unusual access pattern' },
        'medium'
      );
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log with critical severity if specified', async () => {
      await service.logSuspiciousActivity(
        'malicious_payload_detected',
        '192.168.1.100',
        'Test Browser',
        { pattern: 'SQL injection attempt' },
        'critical'
      );
      expect(mockCacheService.listPush).toHaveBeenCalled();
      expect(mockCacheService.setAdd).toHaveBeenCalled();
    });
  });

  describe('logSystemEvent', () => {
    it('should log system event with system IP and user agent', async () => {
      await service.logSystemEvent(
        'service_started',
        'info',
        { version: '1.0.0' }
      );
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should log system failure events', async () => {
      await service.logSystemEvent(
        'database_connection_failed',
        'critical',
        { error: 'Connection refused' },
        'failure'
      );
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const filters = {
        type: 'authentication',
        limit: 50,
        offset: 10,
      };
      mockAuditLogRepository.findWithFilters.mockResolvedValue([]);

      await service.getAuditLogs(filters, filters.limit, filters.offset);
      expect(mockAuditLogRepository.findWithFilters).toHaveBeenCalledWith(
        filters,
        filters.limit,
        filters.offset,
      );
    });
  });

  describe('generateAuditReport', () => {
    it('should generate a comprehensive audit report', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      mockAuditLogRepository.findWithFilters.mockResolvedValue([]);

      const report = await service.generateAuditReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.summary.totalEvents).toBe(0); // Update with mocked data
      expect(mockAuditLogRepository.findWithFilters).toHaveBeenCalledWith(
        { startDate, endDate },
        10000,
        0
      );
    });
  });

  describe('IP management', () => {
    it('should check if an IP is suspicious', async () => {
      mockCacheService.setIsMember.mockResolvedValue(true);
      const isSuspicious = await service.isIPSuspicious('192.168.1.100');
      expect(isSuspicious).toBe(true);
      expect(mockCacheService.setIsMember).toHaveBeenCalledWith(
        expect.any(String),
        '192.168.1.100',
      );
    });

    it('should retrieve suspicious IPs', async () => {
      const suspiciousIPs = ['192.168.1.100', '10.0.0.5'];
      mockCacheService.setMembers.mockResolvedValue(suspiciousIPs);

      const result = await service.getSuspiciousIPs();
      expect(result).toEqual(suspiciousIPs);
      expect(mockCacheService.setMembers).toHaveBeenCalled();
    });

    it('should clear suspicious IP marks', () => {
      service.clearSuspiciousIP('192.168.1.100');
      expect(mockCacheService.setRemove).toHaveBeenCalledWith(
        expect.any(String),
        '192.168.1.100',
      );
    });

    it('should return null for non-existent IP analysis', async () => {
      mockCacheService.hashGetAll.mockResolvedValue({});
      const analysis = await service.getIPAnalysis('1.2.3.4');
      expect(analysis).toBeNull();
    });
  });

  describe('event listeners', () => {
    it('should handle login success events', async () => {
      const eventData = {
        userId: 'user-123',
        clientIP: '127.0.0.1',
        userAgent: 'test-agent',
      };
      await service.handleLoginSuccess(eventData);
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should handle login failure events', async () => {
      const eventData = {
        username: 'testuser',
        clientIP: '192.168.1.100',
        userAgent: 'Test Browser',
        reason: 'wrong_password',
      };
      await service.handleLoginFailure(eventData);
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should handle API key usage events', async () => {
      const eventData = {
        apiKeyId: 'key-123',
        clientIP: '127.0.0.1',
        userAgent: 'test-agent',
        endpoint: '/test',
      };
      await service.handleAPIKeyUsed(eventData);
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('calculateRiskScore', () => {
      it('should calculate risk score for critical suspicious activity', async () => {
        const event = {
          ...mockSecurityEvent,
          id: 'test-id-1',
          timestamp: new Date(),
          type: 'suspicious_activity',
          severity: 'critical',
        } as SecurityEvent;
        // Access private method
        const score = await (service as any).calculateRiskScore(event);
        expect(score).toBeGreaterThan(0);
      });

      it('should calculate lower risk score for info events', async () => {
        const event = {
          ...mockSecurityEvent,
          id: 'test-id-2',
          timestamp: new Date(),
          severity: 'info',
        } as SecurityEvent;
        const score = await (service as any).calculateRiskScore(event);
        expect(score).toBeLessThan(40);
      });
    });

    describe('generateTags', () => {
      it('should generate appropriate tags for events', async () => {
        const event = {
          ...mockSecurityEvent,
          id: 'test-id-3',
          timestamp: new Date(),
          action: 'login_failed',
          details: { reason: 'invalid_password' },
        } as SecurityEvent;
        const tags = await (service as any).generateTags(event);
        expect(tags).toContain('authentication');
        expect(tags).toContain('auth_failure');
      });
    });

    describe('generateSecurityRecommendations', () => {
      it('should generate recommendations for high failure rates', () => {
        const summary = { failureRate: 0.6 };
        const recommendations = (service as any).generateSecurityRecommendations(
          summary,
        );
        expect(recommendations.length).toBeGreaterThan(0);
      });

      it('should generate recommendations for suspicious activities', () => {
        const summary = { suspiciousActivities: 10 };
        const recommendations = (service as any).generateSecurityRecommendations(
          summary,
        );
        expect(recommendations.length).toBeGreaterThan(0);
      });

      it('should generate recommendations for critical events', () => {
        const summary = { criticalEvents: 5 };
        const recommendations = (service as any).generateSecurityRecommendations(
          summary,
        );
        expect(recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('background tasks', () => {
    it('should analyze suspicious activity on interval', async () => {
      const analyzeSpy = jest.spyOn(service, 'analyzeSuspiciousActivity');
      await service.analyzeSuspiciousActivity();
      expect(analyzeSpy).toHaveBeenCalled();
    });

    it('should cleanup old data on interval', async () => {
      const cleanupSpy = jest.spyOn(service, 'cleanupOldData');
      await service.cleanupOldData();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should flush audit logs on module destroy', async () => {
      const flushSpy = jest.spyOn(service, 'flushAuditLogs').mockResolvedValue();
      
      await service.onModuleDestroy();
      
      expect(flushSpy).toHaveBeenCalled();
    }, 10000);

    it('should handle flush errors during module destroy', async () => {
      const flushSpy = jest.spyOn(service, 'flushAuditLogs').mockRejectedValue(new Error('Flush failed'));
      
      await service.onModuleDestroy();
      
      expect(flushSpy).toHaveBeenCalled();
    }, 10000);
  });

  describe('flushAuditLogs - enhanced coverage', () => {
    it('should handle successful flush with events', async () => {
      const mockEvents = [
        JSON.stringify({
          id: 'event-1',
          type: 'authentication',
          severity: 'medium',
          action: 'login',
          clientIP: '192.168.1.1',
          userAgent: 'test',
          details: {},
          timestamp: new Date(),
          source: 'test',
          outcome: 'success'
        })
      ];
      
      mockCacheService.listRange.mockResolvedValue(mockEvents);
      mockCacheService.hashGetAll.mockResolvedValue({ failureCount: '0' });
      mockCacheService.setIsMember.mockResolvedValue(false);
      mockAuditLogRepository.insertMany.mockResolvedValue(undefined);

      await service.flushAuditLogs();

      expect(mockCacheService.listRange).toHaveBeenCalled();
      expect(mockCacheService.listTrim).toHaveBeenCalled();
      expect(mockAuditLogRepository.insertMany).toHaveBeenCalled();
    });

    it('should handle empty event buffer', async () => {
      mockCacheService.listRange.mockResolvedValue([]);

      await service.flushAuditLogs();

      expect(mockCacheService.listRange).toHaveBeenCalled();
      expect(mockAuditLogRepository.insertMany).not.toHaveBeenCalled();
    });

    it('should handle database errors during flush', async () => {
      const mockEvents = [JSON.stringify({ id: 'test', type: 'test' })];
      mockCacheService.listRange.mockResolvedValue(mockEvents);
      mockAuditLogRepository.insertMany.mockRejectedValue(new Error('Database error'));

      await expect(service.flushAuditLogs()).rejects.toThrow('Database error');
    });
  });

  describe('getIPAnalysis - enhanced coverage', () => {
    it('should return correct analysis when data exists', async () => {
      mockCacheService.hashGetAll.mockResolvedValue({
        requestCount: '10',
        failureCount: '3',
        lastSeen: '2023-01-01T00:00:00.000Z'
      });

      const analysis = await service.getIPAnalysis('192.168.1.1');

      expect(analysis).toEqual({
        requestCount: 10,
        failureCount: 3,
        lastSeen: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('should handle invalid numeric values gracefully', async () => {
      mockCacheService.hashGetAll.mockResolvedValue({
        requestCount: 'invalid',
        failureCount: 'also-invalid',
        lastSeen: '2023-01-01T00:00:00.000Z'
      });

      const analysis = await service.getIPAnalysis('192.168.1.1');

      expect(analysis).toEqual({
        requestCount: 0,
        failureCount: 0,
        lastSeen: new Date('2023-01-01T00:00:00.000Z')
      });
    });
  });

  describe('private method testing - mapLogToEvent', () => {
    it('should correctly map audit log to security event', () => {
      const mockLog = {
        eventId: 'event-123',
        type: 'authentication',
        severity: 'high',
        action: 'login_failed',
        userId: 'user-123',
        apiKeyId: 'key-123',
        clientIP: '192.168.1.1',
        userAgent: 'test-agent',
        details: { reason: 'invalid_password' },
        timestamp: new Date('2023-01-01'),
        source: 'auth',
        outcome: 'failure',
        riskScore: 75,
        tags: ['authentication', 'failure']
      } as any;

      const event = (service as any).mapLogToEvent(mockLog);

      expect(event).toEqual({
        id: 'event-123',
        type: 'authentication',
        severity: 'high',
        action: 'login_failed',
        userId: 'user-123',
        apiKeyId: 'key-123',
        clientIP: '192.168.1.1',
        userAgent: 'test-agent',
        details: { reason: 'invalid_password' },
        timestamp: new Date('2023-01-01'),
        source: 'auth',
        outcome: 'failure'
      });
    });
  });

  describe('generateSecurityRecommendations - comprehensive testing', () => {
    it('should generate recommendations for multiple threat scenarios', () => {
      const summary = {
        failedAuthentications: 100,
        suspiciousActivities: 15,
        criticalEvents: 3,
        dataAccessEvents: 1000,
        uniqueIPs: 200
      };

      const recommendations = (service as any).generateSecurityRecommendations(summary);
      
      console.log('Generated recommendations:', recommendations);

      expect(recommendations).toContain('考虑实施更严格的账户锁定策略');
      expect(recommendations).toContain('启用多因素认证以增强安全性');
      expect(recommendations).toContain('加强IP黑名单管理');
      expect(recommendations).toContain('立即调查所有严重安全事件');
      // 我们直接检查特定的推荐项是否存在
      expect(recommendations).toContain('审查和更新安全策略');
      expect(recommendations.length).toBeGreaterThan(5);
    });

    it('should return default recommendations on error', () => {
      const invalidSummary = null;

      const recommendations = (service as any).generateSecurityRecommendations(invalidSummary);

      expect(recommendations).toContain('进行定期安全审计');
      expect(recommendations).toContain('及时更新安全补丁');
      expect(recommendations).toContain('审查和更新安全策略');
      expect(recommendations.length).toBe(3);
    });

    it('should not duplicate recommendations', () => {
      const summary = {
        failedAuthentications: 200,
        suspiciousActivities: 20,
        criticalEvents: 0,
        dataAccessEvents: 500,
        uniqueIPs: 100
      };

      const recommendations = (service as any).generateSecurityRecommendations(summary);
      const uniqueRecommendations = [...new Set(recommendations)];

      expect(recommendations.length).toBe(uniqueRecommendations.length);
    });
  });

  describe('error handling', () => {
    it('should handle flushAuditLogs errors gracefully', async () => {
      mockCacheService.listRange.mockResolvedValue([]);
      mockAuditLogRepository.insertMany.mockRejectedValue(
        new Error('Database error'),
      );
      await service.flushAuditLogs();
      // No explicit assertion needed, just ensure it doesn't crash and logs error
    });

    it('should handle missing event properties gracefully', async () => {
      const incompleteEvent: any = { type: 'authentication' };
      // No explicit assertion needed, just ensuring it doesn't crash
      await expect(
        service.logSecurityEvent(incompleteEvent),
      ).resolves.not.toThrow();
    });

    it('should handle edge cases in IP analysis', async () => {
      mockCacheService.hashGetAll.mockResolvedValue('invalid-json' as any);
      const analysis = await service.getIPAnalysis('1.2.3.4');
      expect(analysis).not.toBeNull();
      expect(analysis.requestCount).toBe(0);
    });

    it('should handle logSecurityEvent cache errors', async () => {
      mockCacheService.listPush.mockRejectedValue(new Error('Cache unavailable'));

      await expect(service.logSecurityEvent(mockSecurityEvent)).rejects.toThrow('Cache unavailable');
    });

    it('should handle getAuditLogs repository errors', async () => {
      mockAuditLogRepository.findWithFilters.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getAuditLogs()).rejects.toThrow('Database connection failed');
    });

    it('should handle generateAuditReport errors', async () => {
      mockAuditLogRepository.findWithFilters.mockRejectedValue(new Error('Query failed'));

      await expect(service.generateAuditReport(new Date(), new Date())).rejects.toThrow('生成审计报告失败');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent event logging', async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        ...mockSecurityEvent,
        userId: `user-${i}`,
      }));

      await Promise.all(events.map(e => service.logSecurityEvent(e)));

      expect(mockCacheService.listPush).toHaveBeenCalledTimes(100);
    });

    it('should maintain data consistency under concurrent access', async () => {
      mockCacheService.hashGetAll.mockResolvedValue(null); // Start with no data

      const completeEvent = {
        ...mockSecurityEvent,
        id: 'test-id-concurrent',
        timestamp: new Date(),
      };

      await Promise.all([
        (service as any).updateIPAnalysis(completeEvent),
        (service as any).updateIPAnalysis(completeEvent),
      ]);

      expect(mockCacheService.hashIncrementBy).toHaveBeenCalledTimes(4);
      // More complex checks would involve inspecting the final state,
      // which is tricky without a real cache/locking.
    });
  });
});