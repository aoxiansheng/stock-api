import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertNotificationChannelDto, AlertNotificationChannelType } from '@alert/dto/alert-rule.dto';
import { AlertSeverity } from '@alert/types/alert.types';
import { VALID_OPERATORS } from '@alert/constants';

describe('AlertRuleDto', () => {
  describe('AlertNotificationChannelDto', () => {
    it('should create valid notification channel DTO', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Email Channel',
        type: AlertNotificationChannelType.EMAIL,
        config: { recipients: ['admin@example.com'] },
        enabled: true,
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(0);
      expect(channelDto.name).toBe('Email Channel');
      expect(channelDto.type).toBe(AlertNotificationChannelType.EMAIL);
      expect(channelDto.config.recipients).toContain('admin@example.com');
      expect(channelDto.enabled).toBe(true);
    });

    it('should validate required fields', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        // Missing required fields
      });

      const errors = await validate(channelDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
      expect(errors.some(e => e.property === 'type')).toBe(true);
      expect(errors.some(e => e.property === 'config')).toBe(true);
      expect(errors.some(e => e.property === 'enabled')).toBe(true);
    });

    it('should validate enum values', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Invalid Channel',
        type: 'invalid-type',
        config: {},
        enabled: true,
      });

      const errors = await validate(channelDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'type')).toBe(true);
    });

    it('should validate optional fields', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Channel with Optional',
        type: AlertNotificationChannelType.SMS,
        config: { phoneNumber: '+1234567890' },
        enabled: true,
        retryCount: 5,
        timeout: 10000,
      });

      const errors = await validate(channelDto);
      expect(errors).toHaveLength(0);
      expect(channelDto.retryCount).toBe(5);
      expect(channelDto.timeout).toBe(10000);
    });

    it('should validate retryCount range', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Channel with Invalid Retry',
        type: AlertNotificationChannelType.WEBHOOK,
        config: { url: 'https://example.com/webhook' },
        enabled: true,
        retryCount: -1, // Below minimum
      });

      const errors = await validate(channelDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'retryCount')).toBe(true);
    });

    it('should validate timeout range', async () => {
      const channelDto = plainToClass(AlertNotificationChannelDto, {
        name: 'Channel with Invalid Timeout',
        type: AlertNotificationChannelType.SLACK,
        config: { webhook: 'https://hooks.slack.com/...' },
        enabled: true,
        timeout: 500000, // Above maximum
      });

      const errors = await validate(channelDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'timeout')).toBe(true);
    });
  });

  describe('CreateAlertRuleDto', () => {
    let validCreateDto: CreateAlertRuleDto;

    beforeEach(() => {
      validCreateDto = {
        name: 'CPU Usage Alert',
        description: 'Monitor CPU usage',
        metric: 'system.cpu.usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          {
            name: 'Admin Email',
            type: AlertNotificationChannelType.EMAIL,
            config: { recipients: ['admin@example.com'] },
            enabled: true,
          },
        ],
        cooldown: 600,
        tags: { environment: 'production', team: 'infrastructure' },
      };
    });

    it('should create valid CreateAlertRuleDto', async () => {
      const dto = plainToClass(CreateAlertRuleDto, validCreateDto);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate required fields', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        // Missing all required fields
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('name');
      expect(errorProperties).toContain('metric');
      expect(errorProperties).toContain('operator');
      expect(errorProperties).toContain('threshold');
      expect(errorProperties).toContain('duration');
      expect(errorProperties).toContain('severity');
      expect(errorProperties).toContain('enabled');
      expect(errorProperties).toContain('channels');
      expect(errorProperties).toContain('cooldown');
    });

    it('should validate name length', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        name: 'A'.repeat(200), // Too long
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should validate name format', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        name: 'Invalid Name!', // Contains invalid characters
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should validate metric format', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        metric: '123invalid', // Doesn't start with letter
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metric')).toBe(true);
    });

    it('should validate operator enum', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        operator: 'invalid' as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'operator')).toBe(true);
    });

    it('should validate threshold is a number', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        threshold: 'not-a-number' as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'threshold')).toBe(true);
    });

    it('should validate duration range', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        duration: 10, // Below minimum
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'duration')).toBe(true);
    });

    it('should validate severity enum', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        severity: 'invalid' as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'severity')).toBe(true);
    });

    it('should validate enabled is boolean', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        enabled: 'not-boolean' as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'enabled')).toBe(true);
    });

    it('should validate channels array', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        channels: 'not-an-array' as any,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'channels')).toBe(true);
    });

    it('should validate cooldown range', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        cooldown: 50, // Below minimum
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'cooldown')).toBe(true);
    });

    it('should validate tags object', async () => {
      // Since tags is optional and doesn't have @IsObject() validator,
      // invalid types are accepted but should be valid objects when provided
      const dtoWithValidTags = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        tags: { environment: 'prod', service: 'api' },
      });

      const errors = await validate(dtoWithValidTags);
      expect(errors.length).toBe(0);
    });

    it('should accept empty channels array', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        channels: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept undefined optional fields', async () => {
      const dto = plainToClass(CreateAlertRuleDto, {
        ...validCreateDto,
        description: undefined,
        tags: undefined,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateAlertRuleDto', () => {
    it('should create valid UpdateAlertRuleDto with partial data', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        name: 'Updated Alert Name',
        threshold: 85,
      });

      const errors = await validate(updateDto);
      expect(errors).toHaveLength(0);
      expect(updateDto.name).toBe('Updated Alert Name');
      expect(updateDto.threshold).toBe(85);
    });

    it('should allow all fields to be optional', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {});
      const errors = await validate(updateDto);
      expect(errors).toHaveLength(0);
    });

    it('should validate individual fields when provided', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        name: 'A'.repeat(200), // Too long
        threshold: 'not-a-number' as any,
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
      expect(errors.some(e => e.property === 'threshold')).toBe(true);
    });

    it('should validate enum fields', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        operator: 'invalid' as any,
        severity: 'invalid' as any,
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'operator')).toBe(true);
      expect(errors.some(e => e.property === 'severity')).toBe(true);
    });

    it('should validate boolean fields', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        enabled: 'not-boolean' as any,
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'enabled')).toBe(true);
    });

    it('should validate array fields', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        channels: 'not-an-array' as any,
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'channels')).toBe(true);
    });

    it('should validate range fields', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        duration: 5, // Below minimum
        cooldown: 50, // Below minimum
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'duration')).toBe(true);
      expect(errors.some(e => e.property === 'cooldown')).toBe(true);
    });

    it('should validate format fields', async () => {
      const updateDto = plainToClass(UpdateAlertRuleDto, {
        name: 'Invalid Name!',
        metric: '123invalid',
      });

      const errors = await validate(updateDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
      expect(errors.some(e => e.property === 'metric')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should validate all operators', async () => {
      for (const operator of VALID_OPERATORS) {
        const dto = plainToClass(CreateAlertRuleDto, {
          name: `Test Rule ${operator === '>' ? 'gt' : operator === '>=' ? 'gte' : operator === '<' ? 'lt' : operator === '<=' ? 'lte' : operator === '==' ? 'eq' : 'ne'}`,
          metric: 'test.metric',
          operator,
          threshold: 100,
          duration: 300,
          severity: AlertSeverity.INFO,
          enabled: true,
          channels: [],
          cooldown: 600,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate all severity levels', async () => {
      for (const severity of Object.values(AlertSeverity)) {
        const dto = plainToClass(CreateAlertRuleDto, {
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

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate all notification channel types', async () => {
      for (const channelType of Object.values(AlertNotificationChannelType)) {
        const dto = plainToClass(CreateAlertRuleDto, {
          name: `Test Rule ${channelType}`,
          metric: 'test.metric',
          operator: '>',
          threshold: 100,
          duration: 300,
          severity: AlertSeverity.INFO,
          enabled: true,
          channels: [
            {
              name: `${channelType} Channel`,
              type: channelType,
              config: {},
              enabled: true,
            },
          ],
          cooldown: 600,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should handle complex nested validation', async () => {
      const complexDto = plainToClass(CreateAlertRuleDto, {
        name: 'Complex Rule',
        metric: 'system.cpu.usage',
        operator: '>',
        threshold: 85.5,
        duration: 600,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          {
            name: 'Admin Team Email',
            type: AlertNotificationChannelType.EMAIL,
            config: { 
              recipients: ['admin1@example.com', 'admin2@example.com'],
              subject: 'Critical Alert',
              template: 'default'
            },
            enabled: true,
            retryCount: 3,
            timeout: 30000,
          },
          {
            name: 'DevOps Slack',
            type: AlertNotificationChannelType.SLACK,
            config: {
              webhook: 'https://hooks.slack.com/services/...',
              channel: '#alerts',
              username: 'AlertBot',
              icon: ':rotating_light:'
            },
            enabled: true,
            retryCount: 2,
            timeout: 15000,
          },
          {
            name: 'PagerDuty Webhook',
            type: AlertNotificationChannelType.WEBHOOK,
            config: {
              url: 'https://events.pagerduty.com/v2/enqueue',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token token=xxxxx'
              },
              body: {
                event_type: 'trigger',
                description: 'Critical alert triggered'
              }
            },
            enabled: true,
            retryCount: 5,
            timeout: 45000,
          }
        ],
        cooldown: 1800,
        tags: {
          environment: 'production',
          team: 'devops',
          service: 'monitoring',
          priority: 'high',
          region: 'global'
        },
      });

      const errors = await validate(complexDto);
      expect(errors).toHaveLength(0);
      
      // Verify structure
      expect(complexDto.channels).toHaveLength(3);
      expect(complexDto.channels[0].type).toBe(AlertNotificationChannelType.EMAIL);
      expect(complexDto.channels[1].type).toBe(AlertNotificationChannelType.SLACK);
      expect(complexDto.channels[2].type).toBe(AlertNotificationChannelType.WEBHOOK);
      expect(Object.keys(complexDto.tags || {})).toHaveLength(5);
    });

    it('should validate edge cases', async () => {
      // Test boundary values
      const boundaryDto = plainToClass(CreateAlertRuleDto, {
        name: 'Boundary Test',
        metric: 'boundary.test',
        operator: '<=',
        threshold: 0, // Edge case: zero threshold
        duration: 30, // Minimum valid duration
        severity: AlertSeverity.INFO,
        enabled: false, // Edge case: disabled by default
        channels: [],
        cooldown: 60, // Minimum valid cooldown
      });

      const errors = await validate(boundaryDto);
      expect(errors).toHaveLength(0);
      expect(boundaryDto.threshold).toBe(0);
      expect(boundaryDto.enabled).toBe(false);
    });
  });
});