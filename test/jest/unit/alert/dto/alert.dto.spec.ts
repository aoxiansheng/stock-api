import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertQueryDto, AcknowledgeAlertDto, ResolveAlertDto, AlertStatsDto, TriggerAlertDto, AlertResponseDto } from '@alert/dto/alert.dto';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';
import { IAlert } from '@alert/interfaces';

describe('AlertDto', () => {
  describe('AlertQueryDto', () => {
    it('should create valid AlertQueryDto with default values', async () => {
      const queryDto = plainToClass(AlertQueryDto, {});

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(0);
      expect(queryDto.sortBy).toBe('startTime');
      expect(queryDto.sortOrder).toBe('desc');
    });

    it('should create valid AlertQueryDto with all fields', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: 'rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-02T00:00:00Z',
        metric: 'cpu.usage',
        sortBy: 'startTime',
        sortOrder: 'asc',
        page: 2,
        limit: 20,
      });

      const errors = await validate(queryDto);
      expect(errors).toHaveLength(0);
      expect(queryDto.ruleId).toBe('rule-123');
      expect(queryDto.severity).toBe(AlertSeverity.CRITICAL);
      expect(queryDto.status).toBe(AlertStatus.FIRING);
      expect(queryDto.startTime).toBe('2023-01-01T00:00:00Z');
      expect(queryDto.endTime).toBe('2023-01-02T00:00:00Z');
      expect(queryDto.metric).toBe('cpu.usage');
      expect(queryDto.sortBy).toBe('startTime');
      expect(queryDto.sortOrder).toBe('asc');
      expect(queryDto.page).toBe(2);
      expect(queryDto.limit).toBe(20);
    });

    it('should validate ruleId format', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: 'invalid rule id!', // Invalid characters
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'ruleId')).toBe(true);
    });

    it('should validate severity enum', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        severity: 'invalid' as any,
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'severity')).toBe(true);
    });

    it('should validate status enum', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        status: 'invalid' as any,
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'status')).toBe(true);
    });

    it('should validate date strings', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        startTime: 'invalid-date',
        endTime: 'another-invalid-date',
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'startTime')).toBe(true);
      expect(errors.some(e => e.property === 'endTime')).toBe(true);
    });

    it('should validate metric format', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        metric: '123invalid', // Doesn't start with letter
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metric')).toBe(true);
    });

    it('should validate sortBy format', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        sortBy: 'invalid-sort!', // Invalid characters
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sortBy')).toBe(true);
    });

    it('should validate sortOrder enum', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        sortOrder: 'invalid' as any,
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'sortOrder')).toBe(true);
    });

    it('should validate name length limits', async () => {
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: 'A'.repeat(200), // Too long
        metric: 'B'.repeat(200), // Too long
        sortBy: 'C'.repeat(200), // Too long
      });

      const errors = await validate(queryDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'ruleId')).toBe(true);
      expect(errors.some(e => e.property === 'metric')).toBe(true);
      expect(errors.some(e => e.property === 'sortBy')).toBe(true);
    });
  });

  describe('AcknowledgeAlertDto', () => {
    it('should create valid AcknowledgeAlertDto', async () => {
      const ackDto = plainToClass(AcknowledgeAlertDto, {
        acknowledgedBy: 'test-user',
        note: 'Acknowledged for investigation',
      });

      const errors = await validate(ackDto);
      expect(errors).toHaveLength(0);
      expect(ackDto.acknowledgedBy).toBe('test-user');
      expect(ackDto.note).toBe('Acknowledged for investigation');
    });

    it('should validate required acknowledgedBy field', async () => {
      const ackDto = plainToClass(AcknowledgeAlertDto, {
        note: 'Acknowledged for investigation',
        // Missing acknowledgedBy
      });

      const errors = await validate(ackDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'acknowledgedBy')).toBe(true);
    });

    it('should accept optional note field', async () => {
      const ackDto = plainToClass(AcknowledgeAlertDto, {
        acknowledgedBy: 'test-user',
        // Missing note (optional)
      });

      const errors = await validate(ackDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ResolveAlertDto', () => {
    it('should create valid ResolveAlertDto', async () => {
      const resolveDto = plainToClass(ResolveAlertDto, {
        resolvedBy: 'admin-user',
        solution: 'Restarted the service',
        note: 'Issue resolved',
      });

      const errors = await validate(resolveDto);
      expect(errors).toHaveLength(0);
      expect(resolveDto.resolvedBy).toBe('admin-user');
      expect(resolveDto.solution).toBe('Restarted the service');
      expect(resolveDto.note).toBe('Issue resolved');
    });

    it('should validate required resolvedBy field', async () => {
      const resolveDto = plainToClass(ResolveAlertDto, {
        solution: 'Restarted the service',
        note: 'Issue resolved',
        // Missing resolvedBy
      });

      const errors = await validate(resolveDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'resolvedBy')).toBe(true);
    });

    it('should accept optional solution and note fields', async () => {
      const resolveDto = plainToClass(ResolveAlertDto, {
        resolvedBy: 'admin-user',
        // Missing solution and note (optional)
      });

      const errors = await validate(resolveDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('AlertStatsDto', () => {
    it('should create valid AlertStatsDto', () => {
      const statsDto: AlertStatsDto = {
        totalRules: 100,
        enabledRules: 85,
        activeAlerts: 12,
        criticalAlerts: 3,
        warningAlerts: 5,
        infoAlerts: 4,
        totalAlertsToday: 25,
        resolvedAlertsToday: 20,
        averageResolutionTime: 1800,
      };

      expect(statsDto.totalRules).toBe(100);
      expect(statsDto.enabledRules).toBe(85);
      expect(statsDto.activeAlerts).toBe(12);
      expect(statsDto.criticalAlerts).toBe(3);
      expect(statsDto.warningAlerts).toBe(5);
      expect(statsDto.infoAlerts).toBe(4);
      expect(statsDto.totalAlertsToday).toBe(25);
      expect(statsDto.resolvedAlertsToday).toBe(20);
      expect(statsDto.averageResolutionTime).toBe(1800);
    });

    it('should handle zero values', () => {
      const statsDto: AlertStatsDto = {
        totalRules: 0,
        enabledRules: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
      };

      expect(statsDto.totalRules).toBe(0);
      expect(statsDto.activeAlerts).toBe(0);
      expect(statsDto.averageResolutionTime).toBe(0);
    });
  });

  describe('TriggerAlertDto', () => {
    it('should create valid TriggerAlertDto', async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: 'rule-123',
        metrics: [
          {
            metric: 'cpu.usage',
            value: 85.5,
            timestamp: '2023-01-01T00:00:00Z',
            tags: { host: 'server-1', environment: 'prod' },
          },
          {
            metric: 'memory.usage',
            value: 92.3,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ],
      });

      const errors = await validate(triggerDto);
      expect(errors).toHaveLength(0);
      expect(triggerDto.ruleId).toBe('rule-123');
      expect(triggerDto.metrics).toHaveLength(2);
      expect(triggerDto.metrics[0].metric).toBe('cpu.usage');
      expect(triggerDto.metrics[0].value).toBe(85.5);
      expect(triggerDto.metrics[0].tags).toEqual({ host: 'server-1', environment: 'prod' });
      expect(triggerDto.metrics[1].metric).toBe('memory.usage');
      expect(triggerDto.metrics[1].value).toBe(92.3);
    });

    it('should validate required metrics array', async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: 'rule-123',
        // Missing metrics
      });

      const errors = await validate(triggerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metrics')).toBe(true);
    });

    it('should validate metric data format', async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        metrics: [
          {
            metric: '123invalid', // Invalid format
            value: 'not-a-number' as any, // Invalid number
            timestamp: 'invalid-date', // Invalid date
          },
        ],
      });

      const errors = await validate(triggerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metrics')).toBe(true);
    });

    it('should validate ruleId format', async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: 'invalid rule id!', // Invalid characters
        metrics: [
          {
            metric: 'cpu.usage',
            value: 85.5,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ],
      });

      const errors = await validate(triggerDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'ruleId')).toBe(true);
    });

    it('should accept optional ruleId', async () => {
      const triggerDto = plainToClass(TriggerAlertDto, {
        metrics: [
          {
            metric: 'cpu.usage',
            value: 85.5,
            timestamp: '2023-01-01T00:00:00Z',
          },
        ],
        // Missing ruleId (optional)
      });

      const errors = await validate(triggerDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('AlertResponseDto', () => {
    let mockAlert: IAlert;

    beforeEach(() => {
      mockAlert = {
        id: 'alert-123',
        ruleId: 'rule-123',
        ruleName: 'CPU Usage Alert',
        metric: 'cpu.usage',
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: 'CPU usage exceeded threshold',
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-01T00:30:00Z'),
        acknowledgedBy: 'operator1',
        acknowledgedAt: new Date('2023-01-01T00:05:00Z'),
        resolvedBy: 'admin1',
        resolvedAt: new Date('2023-01-01T00:30:00Z'),
        tags: { environment: 'prod', service: 'api' },
        context: { host: 'server-1', region: 'us-east' },
      };
    });

    it('should create valid AlertResponseDto from entity', () => {
      const responseDto = AlertResponseDto.fromEntity(mockAlert);

      expect(responseDto.id).toBe('alert-123');
      expect(responseDto.ruleId).toBe('rule-123');
      expect(responseDto.ruleName).toBe('CPU Usage Alert');
      expect(responseDto.metric).toBe('cpu.usage');
      expect(responseDto.value).toBe(85.5);
      expect(responseDto.threshold).toBe(80);
      expect(responseDto.severity).toBe(AlertSeverity.WARNING);
      expect(responseDto.status).toBe(AlertStatus.FIRING);
      expect(responseDto.message).toBe('CPU usage exceeded threshold');
      expect(responseDto.startTime).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(responseDto.endTime).toEqual(new Date('2023-01-01T00:30:00Z'));
      expect(responseDto.acknowledgedBy).toBe('operator1');
      expect(responseDto.acknowledgedAt).toEqual(new Date('2023-01-01T00:05:00Z'));
      expect(responseDto.resolvedBy).toBe('admin1');
      expect(responseDto.resolvedAt).toEqual(new Date('2023-01-01T00:30:00Z'));
      expect(responseDto.tags).toEqual({ environment: 'prod', service: 'api' });
      expect(responseDto.context).toEqual({ host: 'server-1', region: 'us-east' });
      expect(responseDto.duration).toBe(1800000); // 30 minutes in milliseconds
      expect(responseDto.isActive).toBe(true); // Status is FIRING
    });

    it('should calculate duration correctly for active alerts', () => {
      const activeAlert: IAlert = {
        ...mockAlert,
        endTime: undefined, // No end time for active alert
        status: AlertStatus.ACKNOWLEDGED, // Active status
      };

      const responseDto = AlertResponseDto.fromEntity(activeAlert);
      const expectedDuration = new Date().getTime() - activeAlert.startTime.getTime();
      // Allow for small time difference in test execution
      expect(Math.abs(responseDto.duration - expectedDuration)).toBeLessThan(1000);
      expect(responseDto.isActive).toBe(true);
    });

    it('should calculate duration correctly for resolved alerts', () => {
      const resolvedAlert: IAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
      };

      const responseDto = AlertResponseDto.fromEntity(resolvedAlert);
      expect(responseDto.duration).toBe(1800000); // 30 minutes in milliseconds
      expect(responseDto.isActive).toBe(false);
    });

    it('should handle alerts with minimal data', () => {
      const minimalAlert: IAlert = {
        id: 'minimal-alert',
        ruleId: 'minimal-rule',
        ruleName: 'Minimal Alert',
        metric: 'minimal.metric',
        value: 100,
        threshold: 50,
        severity: AlertSeverity.INFO,
        status: AlertStatus.FIRING,
        message: 'Minimal alert',
        startTime: new Date('2023-01-01T00:00:00Z'),
        // All optional fields are undefined
      };

      const responseDto = AlertResponseDto.fromEntity(minimalAlert);

      expect(responseDto.id).toBe('minimal-alert');
      expect(responseDto.acknowledgedBy).toBeUndefined();
      expect(responseDto.resolvedBy).toBeUndefined();
      expect(responseDto.tags).toBeUndefined();
      expect(responseDto.context).toBeUndefined();
      expect(responseDto.duration).toBeGreaterThan(0);
      expect(responseDto.isActive).toBe(true);
    });
  });
});