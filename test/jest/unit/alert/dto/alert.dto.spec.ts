
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertQueryDto, AlertResponseDto, AcknowledgeAlertDto, ResolveAlertDto, TriggerAlertDto } from '../../../../../src/alert/dto/alert.dto';
import { AlertSeverity, AlertStatus } from '../../../../../src/alert/types/alert.types';
import { IAlert } from '../../../../../src/alert/interfaces';

describe('AlertDTOs', () => {
  describe('AlertQueryDto', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(AlertQueryDto, {
        ruleId: 'rule-123',
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        page: 1,
        limit: 10,
        sortBy: 'startTime',
        sortOrder: 'desc',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid data', async () => {
      const dto = plainToClass(AlertQueryDto, { limit: 200 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AcknowledgeAlertDto', () => {
    it('should pass validation with valid data', async () => {
        const dto = plainToClass(AcknowledgeAlertDto, { acknowledgedBy: 'admin' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
  });

  describe('ResolveAlertDto', () => {
    it('should pass validation with valid data', async () => {
        const dto = plainToClass(ResolveAlertDto, { resolvedBy: 'admin' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
  });

  describe('TriggerAlertDto', () => {
    it('should pass validation with valid data', async () => {
        const dto = plainToClass(TriggerAlertDto, {
            metrics: [{ metric: 'cpu', value: 90, timestamp: new Date().toISOString() }]
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
  });

  describe('AlertResponseDto', () => {
    it('should correctly map from an IAlert entity', () => {
      const alertEntity: IAlert = {
        id: 'alert-1',
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        metric: 'cpu.usage',
        value: 95,
        threshold: 90,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'CPU usage is critical',
        startTime: new Date('2023-01-01T10:00:00Z'),
      };

      const responseDto = AlertResponseDto.fromEntity(alertEntity);

      expect(responseDto.id).toBe(alertEntity.id);
      expect(responseDto.ruleName).toBe(alertEntity.ruleName);
      expect(responseDto.isActive).toBe(true);
      expect(responseDto.duration).toBeGreaterThan(0);
    });
  });
}); 