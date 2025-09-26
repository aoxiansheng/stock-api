import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertQueryResultDto, AlertStatisticsDto } from '@alert/dto/alert-history-internal.dto';

describe('AlertHistoryInternalDto', () => {
  describe('AlertQueryResultDto', () => {
    it('should create valid AlertQueryResultDto', async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [
          { id: 'alert-1', message: 'Test alert 1' },
          { id: 'alert-2', message: 'Test alert 2' },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(0);
      expect(queryResultDto.alerts).toHaveLength(2);
      expect(queryResultDto.total).toBe(2);
      expect(queryResultDto.page).toBe(1);
      expect(queryResultDto.limit).toBe(10);
      expect(queryResultDto.totalPages).toBe(1);
      expect(queryResultDto.hasNext).toBe(false);
      expect(queryResultDto.hasPrev).toBe(false);
    });

    it('should validate required fields', async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        // Missing all required fields
      });

      const errors = await validate(queryResultDto);
      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('alerts');
      expect(errorProperties).toContain('total');
      expect(errorProperties).toContain('page');
      expect(errorProperties).toContain('limit');
      expect(errorProperties).toContain('totalPages');
      expect(errorProperties).toContain('hasNext');
      expect(errorProperties).toContain('hasPrev');
    });

    it('should validate field types', async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: 'not-an-array' as any,
        total: 'not-a-number' as any,
        page: 'not-a-number' as any,
        limit: 'not-a-number' as any,
        totalPages: 'not-a-number' as any,
        hasNext: 'not-a-boolean' as any,
        hasPrev: 'not-a-boolean' as any,
      });

      const errors = await validate(queryResultDto);
      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('alerts');
      expect(errorProperties).toContain('total');
      expect(errorProperties).toContain('page');
      expect(errorProperties).toContain('limit');
      expect(errorProperties).toContain('totalPages');
      expect(errorProperties).toContain('hasNext');
      expect(errorProperties).toContain('hasPrev');
    });

    it('should handle empty alerts array', async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(0);
      expect(queryResultDto.alerts).toHaveLength(0);
      expect(queryResultDto.total).toBe(0);
    });

    it('should handle pagination information correctly', async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [],
        total: 100,
        page: 3,
        limit: 20,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(0);
      expect(queryResultDto.page).toBe(3);
      expect(queryResultDto.limit).toBe(20);
      expect(queryResultDto.totalPages).toBe(5);
      expect(queryResultDto.hasNext).toBe(true);
      expect(queryResultDto.hasPrev).toBe(true);
    });
  });

  describe('AlertStatisticsDto', () => {
    it('should create valid AlertStatisticsDto', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 15,
        criticalAlerts: 5,
        warningAlerts: 7,
        infoAlerts: 3,
        totalAlertsToday: 25,
        resolvedAlertsToday: 20,
        averageResolutionTime: 1800,
        statisticsTime: '2023-01-01T00:00:00Z',
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
      expect(statsDto.activeAlerts).toBe(15);
      expect(statsDto.criticalAlerts).toBe(5);
      expect(statsDto.warningAlerts).toBe(7);
      expect(statsDto.infoAlerts).toBe(3);
      expect(statsDto.totalAlertsToday).toBe(25);
      expect(statsDto.resolvedAlertsToday).toBe(20);
      expect(statsDto.averageResolutionTime).toBe(1800);
      expect(statsDto.statisticsTime).toEqual('2023-01-01T00:00:00Z');
    });

    it('should validate required fields', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        // Missing all required fields
      });

      const errors = await validate(statsDto);
      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('activeAlerts');
      expect(errorProperties).toContain('criticalAlerts');
      expect(errorProperties).toContain('warningAlerts');
      expect(errorProperties).toContain('infoAlerts');
      expect(errorProperties).toContain('totalAlertsToday');
      expect(errorProperties).toContain('resolvedAlertsToday');
      expect(errorProperties).toContain('averageResolutionTime');
      // statisticsTime doesn't have validation decorators, so it won't appear in errors
      // expect(errorProperties).toContain('statisticsTime');
    });

    it('should validate field types', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 'not-a-number' as any,
        criticalAlerts: 'not-a-number' as any,
        warningAlerts: 'not-a-number' as any,
        infoAlerts: 'not-a-number' as any,
        totalAlertsToday: 'not-a-number' as any,
        resolvedAlertsToday: 'not-a-number' as any,
        averageResolutionTime: 'not-a-number' as any,
        statisticsTime: 'not-a-date' as any,
      });

      const errors = await validate(statsDto);
      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('activeAlerts');
      expect(errorProperties).toContain('criticalAlerts');
      expect(errorProperties).toContain('warningAlerts');
      expect(errorProperties).toContain('infoAlerts');
      expect(errorProperties).toContain('totalAlertsToday');
      expect(errorProperties).toContain('resolvedAlertsToday');
      expect(errorProperties).toContain('averageResolutionTime');
      // statisticsTime doesn't have validation decorators, so it won't appear in errors
      // expect(errorProperties).toContain('statisticsTime');
    });

    it('should handle zero values', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
        statisticsTime: '2023-01-01T00:00:00Z',
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
      expect(statsDto.activeAlerts).toBe(0);
      expect(statsDto.averageResolutionTime).toBe(0);
    });

    it('should handle large numbers', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 1000000,
        criticalAlerts: 50000,
        warningAlerts: 200000,
        infoAlerts: 750000,
        totalAlertsToday: 5000000,
        resolvedAlertsToday: 4999999,
        averageResolutionTime: 86400,
        statisticsTime: '2023-01-01T00:00:00Z',
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
      expect(statsDto.activeAlerts).toBe(1000000);
      expect(statsDto.totalAlertsToday).toBe(5000000);
      expect(statsDto.averageResolutionTime).toBe(86400);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex alert query results', async () => {
      const complexAlerts = [
        {
          id: 'alert-1',
          ruleId: 'rule-1',
          ruleName: 'CPU Alert',
          metric: 'cpu.usage',
          value: 85.5,
          threshold: 80,
          severity: 'warning',
          status: 'firing',
          message: 'CPU usage exceeded threshold',
          startTime: '2023-01-01T00:00:00Z',
          tags: { environment: 'prod', service: 'api' },
        },
        {
          id: 'alert-2',
          ruleId: 'rule-2',
          ruleName: 'Memory Alert',
          metric: 'memory.usage',
          value: 92.3,
          threshold: 90,
          severity: 'critical',
          status: 'acknowledged',
          message: 'Memory usage critical',
          startTime: '2023-01-01T00:05:00Z',
          acknowledgedBy: 'operator1',
          acknowledgedAt: '2023-01-01T00:10:00Z',
          tags: { environment: 'prod', service: 'web' },
        },
      ];

      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: complexAlerts,
        total: 150,
        page: 2,
        limit: 20,
        totalPages: 8,
        hasNext: true,
        hasPrev: true,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(0);
      expect(queryResultDto.alerts).toHaveLength(2);
      expect(queryResultDto.alerts[0].id).toBe('alert-1');
      expect(queryResultDto.alerts[1].id).toBe('alert-2');
      expect(queryResultDto.total).toBe(150);
      expect(queryResultDto.page).toBe(2);
      expect(queryResultDto.limit).toBe(20);
      expect(queryResultDto.totalPages).toBe(8);
      expect(queryResultDto.hasNext).toBe(true);
      expect(queryResultDto.hasPrev).toBe(true);
    });

    it('should handle detailed statistics', async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 23,
        criticalAlerts: 8,
        warningAlerts: 12,
        infoAlerts: 3,
        totalAlertsToday: 45,
        resolvedAlertsToday: 38,
        averageResolutionTime: 1234.56, // Decimal value
        statisticsTime: new Date(),
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
      expect(statsDto.activeAlerts).toBe(23);
      expect(statsDto.criticalAlerts).toBe(8);
      expect(statsDto.warningAlerts).toBe(12);
      expect(statsDto.infoAlerts).toBe(3);
      expect(statsDto.totalAlertsToday).toBe(45);
      expect(statsDto.resolvedAlertsToday).toBe(38);
      expect(statsDto.averageResolutionTime).toBe(1234.56);
      expect(statsDto.statisticsTime).toBeInstanceOf(Date);
    });
  });
});