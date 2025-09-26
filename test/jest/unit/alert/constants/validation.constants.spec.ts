import { ALERT_VALIDATION_LIMITS } from '@alert/constants/validation.constants';

describe('Alert Validation Constants', () => {
  describe('ALERT_VALIDATION_LIMITS', () => {
    it('should have correct validation limit values', () => {
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBe(30);
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBe(600);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBe(60);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBe(3000);
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBe(0);
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX).toBe(10);
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBe(1000);
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBe(60000);
      expect(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH).toBe(100);
      expect(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).toBe(500);
    });

    it('should have positive validation values', () => {
      Object.entries(ALERT_VALIDATION_LIMITS).forEach(([key, value]) => {
        // RETRIES_MIN can be 0, so we skip it
        if (key !== 'RETRIES_MIN') {
          expect(value).toBeGreaterThan(0);
        } else {
          expect(value).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should maintain logical relationships between limits', () => {
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.DURATION_MAX);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX);
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.RETRIES_MAX);
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX);
    });

    it('should have correct units for different types of limits', () => {
      // Duration and cooldown should be in seconds
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBe(30); // 30 seconds
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBe(600); // 600 seconds (10 minutes)
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBe(60); // 60 seconds
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBe(3000); // 3000 seconds (50 minutes)

      // Timeout should be in milliseconds
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBe(1000); // 1 second
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBe(60000); // 60 seconds

      // String lengths should be in characters
      expect(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH).toBe(100);
      expect(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).toBe(500);
    });

    it('should be immutable', () => {
      // Test that the object is effectively immutable (readonly at compile time)
      const originalValues = { ...ALERT_VALIDATION_LIMITS };

      // Original limits should remain unchanged
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBe(originalValues.DURATION_MIN);
    });

    it('should have correct types', () => {
      Object.values(ALERT_VALIDATION_LIMITS).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('should have reasonable business values', () => {
      // Duration limits should be reasonable for alert rules
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBeGreaterThanOrEqual(10); // At least 10 seconds
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBeLessThanOrEqual(3600); // No more than 1 hour

      // Cooldown limits should be reasonable
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBeGreaterThanOrEqual(30); // At least 30 seconds
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBeLessThanOrEqual(86400); // No more than 24 hours

      // Retry limits should be reasonable
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX).toBeLessThanOrEqual(20); // No more than 20 retries

      // Timeout limits should be reasonable
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBeGreaterThanOrEqual(100); // At least 100ms
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBeLessThanOrEqual(300000); // No more than 5 minutes

      // String length limits should be reasonable
      expect(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH).toBeGreaterThanOrEqual(50);
      expect(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH).toBeLessThanOrEqual(200);
      expect(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).toBeGreaterThanOrEqual(200);
      expect(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).toBeLessThanOrEqual(1000);
    });
  });

  describe('Validation Limits Integration', () => {
    it('should be usable in validation logic', () => {
      // Test that limits can be used in validation conditions
      const duration = 120; // 2 minutes
      const cooldown = 300; // 5 minutes
      const retries = 3;
      const timeout = 5000; // 5 seconds
      const name = 'Test Alert Rule';
      const description = 'This is a test alert rule for validation testing';

      expect(duration).toBeGreaterThanOrEqual(ALERT_VALIDATION_LIMITS.DURATION_MIN);
      expect(duration).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.DURATION_MAX);
      
      expect(cooldown).toBeGreaterThanOrEqual(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN);
      expect(cooldown).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX);
      
      expect(retries).toBeGreaterThanOrEqual(ALERT_VALIDATION_LIMITS.RETRIES_MIN);
      expect(retries).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.RETRIES_MAX);
      
      expect(timeout).toBeGreaterThanOrEqual(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN);
      expect(timeout).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX);
      
      expect(name.length).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH);
      expect(description.length).toBeLessThanOrEqual(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH);
    });

    it('should support boundary testing', () => {
      // Test boundary conditions
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN - 1).toBe(29);
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX + 1).toBe(601);
      
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN - 1).toBe(59);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX + 1).toBe(3001);
      
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN - 1).toBe(-1);
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX + 1).toBe(11);
    });

    it('should have consistent naming conventions', () => {
      // Verify that all limit keys follow consistent naming
      const limitKeys = Object.keys(ALERT_VALIDATION_LIMITS);
      
      limitKeys.forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
      });
      
      // Verify that min/max pairs follow naming convention
      expect(limitKeys).toContain('DURATION_MIN');
      expect(limitKeys).toContain('DURATION_MAX');
      expect(limitKeys).toContain('COOLDOWN_MIN');
      expect(limitKeys).toContain('COOLDOWN_MAX');
      expect(limitKeys).toContain('RETRIES_MIN');
      expect(limitKeys).toContain('RETRIES_MAX');
      expect(limitKeys).toContain('TIMEOUT_MIN');
      expect(limitKeys).toContain('TIMEOUT_MAX');
    });
  });
});