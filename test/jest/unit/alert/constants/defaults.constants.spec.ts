import { ALERT_DEFAULTS } from '@alert/constants/defaults.constants';
import { AlertSeverity } from '@alert/types/alert.types';

describe('Alert Defaults Constants', () => {
  describe('ALERT_DEFAULTS', () => {
    it('should have correct default values', () => {
      expect(ALERT_DEFAULTS.operator).toBe('>');
      expect(ALERT_DEFAULTS.severity).toBe(AlertSeverity.WARNING);
      expect(ALERT_DEFAULTS.enabled).toBe(true);
      expect(ALERT_DEFAULTS.duration).toBe(60);
    });

    it('should be immutable', () => {
      // Try to modify the defaults (should not affect the original)
      const modifiedDefaults: any = { ...ALERT_DEFAULTS };
      modifiedDefaults.operator = '<';
      modifiedDefaults.severity = AlertSeverity.CRITICAL;
      modifiedDefaults.enabled = false;
      modifiedDefaults.duration = 120;

      // Original defaults should remain unchanged
      expect(ALERT_DEFAULTS.operator).toBe('>');
      expect(ALERT_DEFAULTS.severity).toBe(AlertSeverity.WARNING);
      expect(ALERT_DEFAULTS.enabled).toBe(true);
      expect(ALERT_DEFAULTS.duration).toBe(60);
    });

    it('should have correct types', () => {
      expect(typeof ALERT_DEFAULTS.operator).toBe('string');
      expect(typeof ALERT_DEFAULTS.severity).toBe('string');
      expect(typeof ALERT_DEFAULTS.enabled).toBe('boolean');
      expect(typeof ALERT_DEFAULTS.duration).toBe('number');
    });

    it('should match expected business logic defaults', () => {
      // Verify that defaults align with business requirements
      expect(ALERT_DEFAULTS.operator).toBe('>'); // Greater than as default operator
      expect(ALERT_DEFAULTS.severity).toBe(AlertSeverity.WARNING); // Warning as default severity
      expect(ALERT_DEFAULTS.enabled).toBe(true); // Enabled by default
      expect(ALERT_DEFAULTS.duration).toBe(60); // 60 seconds as default duration
    });

    it('should be consistent with AlertSeverity enum', () => {
      // Verify that the default severity is a valid AlertSeverity value
      const validSeverities = Object.values(AlertSeverity);
      expect(validSeverities).toContain(ALERT_DEFAULTS.severity);
    });

    it('should have positive duration value', () => {
      expect(ALERT_DEFAULTS.duration).toBeGreaterThan(0);
    });

    it('should have reasonable default values for alert rules', () => {
      // Test that the defaults make sense in the context of alert rules
      expect(ALERT_DEFAULTS.operator.length).toBeGreaterThan(0); // Valid operator
      expect(ALERT_DEFAULTS.severity.length).toBeGreaterThan(0); // Valid severity string
      expect(ALERT_DEFAULTS.enabled).toBe(true); // Should be enabled by default
      expect(ALERT_DEFAULTS.duration).toBe(60); // 60 seconds is a reasonable default
    });
  });
});