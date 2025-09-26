import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';
import { MONITORING_ERROR_CODES } from '@monitoring/constants/monitoring-error-codes.constants';

describe('Monitoring Constants', () => {
  describe('MONITORING_SYSTEM_LIMITS', () => {
    it('should have expected system limits', () => {
      expect(MONITORING_SYSTEM_LIMITS).toBeDefined();
      expect(typeof MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toBe('number');
      expect(MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toBeGreaterThan(0);
    });

    it('should have reasonable default values', () => {
      expect(MONITORING_SYSTEM_LIMITS.DAY_IN_MS).toBe(86400000); // 24 * 60 * 60 * 1000
    });
  });

  describe('MONITORING_ERROR_CODES', () => {
    it('should have expected error codes', () => {
      expect(MONITORING_ERROR_CODES).toBeDefined();
      expect(typeof MONITORING_ERROR_CODES).toBe('object');
    });

    it('should have string error code values', () => {
      Object.values(MONITORING_ERROR_CODES).forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });
});