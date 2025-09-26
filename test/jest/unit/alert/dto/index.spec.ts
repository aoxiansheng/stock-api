import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertNotificationChannelDto,
  AlertNotificationChannelType
} from '@alert/dto/alert-rule.dto';
import {
  AlertQueryDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  AlertStatsDto,
  TriggerAlertDto,
  AlertResponseDto
} from '@alert/dto/alert.dto';
import {
  AlertQueryResultDto,
  AlertStatisticsDto
} from '@alert/dto/alert-history-internal.dto';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';

describe('Alert Dto Index', () => {
  describe('Dto Exports', () => {
    it('should export AlertRule DTOs', () => {
      expect(CreateAlertRuleDto).toBeDefined();
      expect(UpdateAlertRuleDto).toBeDefined();
      expect(AlertNotificationChannelDto).toBeDefined();
      expect(AlertNotificationChannelType).toBeDefined();
    });

    it('should export Alert DTOs', () => {
      expect(AlertQueryDto).toBeDefined();
      expect(AcknowledgeAlertDto).toBeDefined();
      expect(ResolveAlertDto).toBeDefined();
      expect(AlertStatsDto).toBeDefined();
      expect(TriggerAlertDto).toBeDefined();
      expect(AlertResponseDto).toBeDefined();
    });

    it('should export AlertHistoryInternal DTOs', () => {
      expect(AlertQueryResultDto).toBeDefined();
      expect(AlertStatisticsDto).toBeDefined();
    });

    it('should be able to create instances of all exported DTOs', async () => {
      // Test AlertRule DTOs
      const createRuleDto = plainToClass(CreateAlertRuleDto, {
        name: 'Test Rule',
        metric: 'test.metric',
        operator: '>',
        threshold: 100,
        duration: 300,
        severity: AlertSeverity.INFO,
        enabled: true,
        channels: [],
        cooldown: 600,
      });

      const updateRuleDto = plainToClass(UpdateAlertRuleDto, {
        name: 'Updated Rule',
      });

      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Test Channel',
        type: AlertNotificationChannelType.EMAIL,
        config: {},
        enabled: true,
      });

      // Test Alert DTOs
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: 'rule-123',
        severity: AlertSeverity.WARNING,
      });

      const ackDto = plainToClass(AcknowledgeAlertDto, {
        acknowledgedBy: 'test-user',
      });

      const resolveDto = plainToClass(ResolveAlertDto, {
        resolvedBy: 'admin-user',
      });

      const statsDto: AlertStatsDto = {
        totalRules: 10,
        enabledRules: 8,
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 1800,
      };

      const triggerDto = plainToClass(TriggerAlertDto, {
        metrics: [
          {
            metric: 'test.metric',
            value: 150,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Test AlertHistoryInternal DTOs
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const statisticsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
        statisticsTime: new Date(),
      });

      // Validate all DTOs
      const createRuleErrors = await validate(createRuleDto);
      const updateRuleErrors = await validate(updateRuleDto);
      const channelErrors = await validate(channelDto);
      const queryErrors = await validate(queryDto);
      const ackErrors = await validate(ackDto);
      const resolveErrors = await validate(resolveDto);
      const queryResultErrors = await validate(queryResultDto);
      const statisticsErrors = await validate(statisticsDto);
      const triggerErrors = await validate(triggerDto);

      expect(createRuleErrors).toHaveLength(0);
      expect(updateRuleErrors).toHaveLength(0);
      expect(channelErrors).toHaveLength(0);
      expect(queryErrors).toHaveLength(0);
      expect(ackErrors).toHaveLength(0);
      expect(resolveErrors).toHaveLength(0);
      expect(queryResultErrors).toHaveLength(0);
      expect(statisticsErrors).toHaveLength(0);
      expect(triggerErrors).toHaveLength(0);

      // Verify statsDto (no validation needed as it's an interface)
      expect(statsDto.totalRules).toBe(10);
    });
  });

  describe('Dto Integration', () => {
    it('should maintain consistency between related DTOs', async () => {
      // Create a rule with channels
      const createRuleDto = plainToClass(CreateAlertRuleDto, {
        name: 'Integration Test Rule',
        metric: 'integration.test',
        operator: '>=',
        threshold: 75.5,
        duration: 600,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          {
            name: 'Email Channel',
            type: AlertNotificationChannelType.EMAIL,
            config: { recipients: ['admin@example.com'] },
            enabled: true,
          },
          {
            name: 'Slack Channel',
            type: AlertNotificationChannelType.SLACK,
            config: { webhook: 'https://hooks.slack.com/...' },
            enabled: true,
          },
        ],
        cooldown: 1800,
        tags: { environment: 'test', team: 'qa' },
      });

      const createRuleErrors = await validate(createRuleDto);
      expect(createRuleErrors).toHaveLength(0);

      // Verify the structure matches between Create and Update DTOs
      const updateRuleDto = plainToClass(UpdateAlertRuleDto, {
        name: 'Updated Integration Test Rule',
        channels: createRuleDto.channels,
      });

      const updateRuleErrors = await validate(updateRuleDto);
      expect(updateRuleErrors).toHaveLength(0);
      expect(updateRuleDto.channels).toHaveLength(2);
      expect(updateRuleDto.channels?.[0].type).toBe(AlertNotificationChannelType.EMAIL);
      expect(updateRuleDto.channels?.[1].type).toBe(AlertNotificationChannelType.SLACK);
    });

    it('should support round-trip conversion between related DTOs', async () => {
      // Create alert data
      const alertData = {
        id: 'integration-test-alert',
        ruleId: 'integration-test-rule',
        ruleName: 'Integration Test Rule',
        metric: 'integration.test',
        value: 88.5,
        threshold: 75.5,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'Integration test alert',
        startTime: new Date('2023-01-01T00:00:00Z'),
        tags: { environment: 'test' },
      };

      // Convert to response DTO
      const responseDto = AlertResponseDto.fromEntity(alertData as any);

      // Verify response DTO
      expect(responseDto.id).toBe('integration-test-alert');
      expect(responseDto.ruleId).toBe('integration-test-rule');
      expect(responseDto.severity).toBe(AlertSeverity.CRITICAL);
      expect(responseDto.status).toBe(AlertStatus.FIRING);
      expect(responseDto.tags).toEqual({ environment: 'test' });

      // Use in query result DTO
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [responseDto],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const queryResultErrors = await validate(queryResultDto);
      expect(queryResultErrors).toHaveLength(0);
      expect(queryResultDto.alerts).toHaveLength(1);
      expect(queryResultDto.alerts[0].id).toBe('integration-test-alert');
    });

    it('should handle complex nested validation across DTOs', async () => {
      // Create a complex trigger DTO with nested metrics
      const triggerDto = plainToClass(TriggerAlertDto, {
        ruleId: 'complex-rule-123',
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
            tags: { host: 'server-1', environment: 'prod' },
          },
          {
            metric: 'disk.usage',
            value: 78.9,
            timestamp: '2023-01-01T00:00:00Z',
            tags: { host: 'server-1', environment: 'prod' },
          },
        ],
      });

      const triggerErrors = await validate(triggerDto);
      expect(triggerErrors).toHaveLength(0);
      expect(triggerDto.ruleId).toBe('complex-rule-123');
      expect(triggerDto.metrics).toHaveLength(3);

      // Create a complex query DTO
      const queryDto = plainToClass(AlertQueryDto, {
        ruleId: 'complex-rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-02T00:00:00Z',
        metric: 'cpu.usage',
        sortBy: 'startTime',
        sortOrder: 'desc',
        page: 1,
        limit: 50,
      });

      const queryErrors = await validate(queryDto);
      expect(queryErrors).toHaveLength(0);
      expect(queryDto.ruleId).toBe('complex-rule-123');
      expect(queryDto.severity).toBe(AlertSeverity.CRITICAL);
      expect(queryDto.limit).toBe(50);
    });
  });

  describe('Dto Validation Consistency', () => {
    it('should validate enum values consistently across DTOs', async () => {
      // Test severity enum validation
      const severityValues = Object.values(AlertSeverity);
      for (const severity of severityValues) {
        const ruleDto = plainToClass(CreateAlertRuleDto, {
          name: `Test Rule ${severity}`,
          metric: 'test.metric',
          operator: '>',
          threshold: 100,
          duration: 300,
          severity,
          enabled: true,
          channels: [],
          cooldown: 600,
        });

        const ruleErrors = await validate(ruleDto);
        expect(ruleErrors).toHaveLength(0);

        const queryDto = plainToClass(AlertQueryDto, {
          severity,
        });

        const queryErrors = await validate(queryDto);
        expect(queryErrors).toHaveLength(0);
      }

      // Test status enum validation
      const statusValues = Object.values(AlertStatus);
      for (const status of statusValues) {
        const queryDto = plainToClass(AlertQueryDto, {
          status,
        });

        const queryErrors = await validate(queryDto);
        expect(queryErrors).toHaveLength(0);
      }
    });

    it('should validate channel types consistently', async () => {
      const channelTypes = Object.values(AlertNotificationChannelType);
      for (const channelType of channelTypes) {
        const channelDto = plainToClass(AlertNotificationChannelDto, {
          name: `Test ${channelType} Channel`,
          type: channelType,
          config: {},
          enabled: true,
        });

        const channelErrors = await validate(channelDto);
        expect(channelErrors).toHaveLength(0);
        expect(channelDto.type).toBe(channelType);
      }
    });

    it('should maintain consistent naming validation', async () => {
      const validNames = [
        'Valid Rule Name',
        'Valid_Rule-Name 123',
        '中文规则名称',
        'Rule_With_Underscores',
      ];

      for (const name of validNames) {
        const ruleDto = plainToClass(CreateAlertRuleDto, {
          name,
          metric: 'test.metric',
          operator: '>',
          threshold: 100,
          duration: 300,
          severity: AlertSeverity.INFO,
          enabled: true,
          channels: [],
          cooldown: 600,
        });

        const ruleErrors = await validate(ruleDto);
        expect(ruleErrors).toHaveLength(0);
        expect(ruleDto.name).toBe(name);
      }

      const invalidNames = [
        'Invalid Rule Name!', // Contains special character
        'Invalid@Rule', // Contains @ symbol
        'Invalid#Rule', // Contains # symbol
      ];

      for (const name of invalidNames) {
        const ruleDto = plainToClass(CreateAlertRuleDto, {
          name,
          metric: 'test.metric',
          operator: '>',
          threshold: 100,
          duration: 300,
          severity: AlertSeverity.INFO,
          enabled: true,
          channels: [],
          cooldown: 600,
        });

        const ruleErrors = await validate(ruleDto);
        expect(ruleErrors.length).toBeGreaterThan(0);
        expect(ruleErrors.some(e => e.property === 'name')).toBe(true);
      }
    });
  });
});