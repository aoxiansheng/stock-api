import { AlertConstantsValidator, ValidationResult } from '../../../../src/alert/utils/constants-validator.util';
import { ALERT_DEFAULTS } from '../../../../src/alert/constants';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('AlertConstantsValidator', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('validateAll', () => {
    it('should validate constants successfully', () => {
      // Act
      const result = AlertConstantsValidator.validateAll();

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should return validation errors when defaults are invalid', () => {
      // Arrange
      const originalSeverity = ALERT_DEFAULTS.severity;
      const originalOperator = ALERT_DEFAULTS.operator;
      
      // Temporarily modify defaults to trigger validation errors
      (ALERT_DEFAULTS as any).severity = undefined;
      (ALERT_DEFAULTS as any).operator = undefined;

      // Act
      const result = AlertConstantsValidator.validateAll();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('默认告警严重级别不能为空');
      expect(result.errors).toContain('默认比较操作符不能为空');

      // Restore defaults
      (ALERT_DEFAULTS as any).severity = originalSeverity;
      (ALERT_DEFAULTS as any).operator = originalOperator;
    });

    it('should throw error in production environment when validation fails', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      const originalSeverity = ALERT_DEFAULTS.severity;
      (ALERT_DEFAULTS as any).severity = undefined;

      // Act & Assert
      expect(() => AlertConstantsValidator.validateAll())
        .toThrow();

      // Restore defaults
      (ALERT_DEFAULTS as any).severity = originalSeverity;
    });

    it('should not throw error in non-production environment when validation fails', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      
      const originalSeverity = ALERT_DEFAULTS.severity;
      (ALERT_DEFAULTS as any).severity = undefined;

      // Act
      const result = AlertConstantsValidator.validateAll();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('默认告警严重级别不能为空');

      // Restore defaults
      (ALERT_DEFAULTS as any).severity = originalSeverity;
    });

    it('should handle validation exceptions gracefully', () => {
      // Arrange
      const originalValidateAll = AlertConstantsValidator.validateAll;
      AlertConstantsValidator.validateAll = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      // Act
      const result = AlertConstantsValidator.validateAll();

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('验证异常: Validation error');

      // Restore original method
      AlertConstantsValidator.validateAll = originalValidateAll;
    });
  });
});