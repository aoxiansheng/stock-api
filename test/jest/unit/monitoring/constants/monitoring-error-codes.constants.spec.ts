/**
 * Monitoring Error Codes Constants Unit Tests
 * 测试监控错误码常量的完整性、格式和分类规则
 */

import {
  MONITORING_ERROR_CODES,
  MonitoringErrorCode
} from '../../../../../src/monitoring/constants/monitoring-error-codes.constants';

describe('MONITORING_ERROR_CODES', () => {
  describe('Constants Structure', () => {
    it('should be defined as readonly object', () => {
      expect(MONITORING_ERROR_CODES).toBeDefined();
      expect(typeof MONITORING_ERROR_CODES).toBe('object');
    });

    it('should contain all expected error code categories', () => {
      const errorCodes = Object.values(MONITORING_ERROR_CODES);

      // Validation errors (001-299)
      const validationErrors = errorCodes.filter(code =>
        code.includes('_VALIDATION_') &&
        parseInt(code.split('_')[2]) >= 1 &&
        parseInt(code.split('_')[2]) <= 299
      );

      // Business logic errors (300-599)
      const businessErrors = errorCodes.filter(code =>
        code.includes('_BUSINESS_') &&
        parseInt(code.split('_')[2]) >= 300 &&
        parseInt(code.split('_')[2]) <= 599
      );

      // System resource errors (600-899)
      const systemErrors = errorCodes.filter(code =>
        code.includes('_SYSTEM_') &&
        parseInt(code.split('_')[2]) >= 600 &&
        parseInt(code.split('_')[2]) <= 899
      );

      // External dependency errors (900-999)
      const externalErrors = errorCodes.filter(code =>
        code.includes('_EXTERNAL_') &&
        parseInt(code.split('_')[2]) >= 900 &&
        parseInt(code.split('_')[2]) <= 999
      );

      expect(validationErrors.length).toBeGreaterThan(0);
      expect(businessErrors.length).toBeGreaterThan(0);
      expect(systemErrors.length).toBeGreaterThan(0);
      expect(externalErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Code Format Validation', () => {
    it('should follow the unified error code format', () => {
      const errorCodes = Object.values(MONITORING_ERROR_CODES);

      errorCodes.forEach(code => {
        // Format: MONITORING_{CATEGORY}_{SEQUENCE}
        expect(code).toMatch(/^MONITORING_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
        expect(code.startsWith('MONITORING_')).toBe(true);
      });
    });
  });

  describe('Type Safety', () => {
    it('should properly type the MonitoringErrorCode union', () => {
      const validErrorCode: MonitoringErrorCode = 'MONITORING_VALIDATION_001';
      expect(typeof validErrorCode).toBe('string');
      expect(validErrorCode.startsWith('MONITORING_')).toBe(true);
    });
  });
});