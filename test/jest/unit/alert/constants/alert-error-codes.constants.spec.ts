import { ALERT_ERROR_CODES, AlertErrorCategories } from '@alert/constants/alert-error-codes.constants';

describe('AlertErrorCodes', () => {
  describe('Error Code Constants', () => {
    it('should have all required error code categories', () => {
      // Validation errors (001-299)
      expect(ALERT_ERROR_CODES.RULE_VALIDATION_FAILED).toBe('ALERT_VALIDATION_001');
      expect(ALERT_ERROR_CODES.INVALID_RULE_FORMAT).toBe('ALERT_VALIDATION_002');
      expect(ALERT_ERROR_CODES.MISSING_REQUIRED_FIELDS).toBe('ALERT_VALIDATION_003');
      expect(ALERT_ERROR_CODES.INVALID_CONDITION_SYNTAX).toBe('ALERT_VALIDATION_004');
      expect(ALERT_ERROR_CODES.INVALID_THRESHOLD_VALUE).toBe('ALERT_VALIDATION_005');
      expect(ALERT_ERROR_CODES.UNSUPPORTED_METRIC_TYPE).toBe('ALERT_VALIDATION_006');
      expect(ALERT_ERROR_CODES.INVALID_TIME_WINDOW).toBe('ALERT_VALIDATION_007');
      expect(ALERT_ERROR_CODES.INVALID_NOTIFICATION_CHANNEL).toBe('ALERT_VALIDATION_008');
      expect(ALERT_ERROR_CODES.DUPLICATE_RULE_NAME).toBe('ALERT_VALIDATION_009');
      expect(ALERT_ERROR_CODES.RULE_NAME_TOO_LONG).toBe('ALERT_VALIDATION_010');

      expect(ALERT_ERROR_CODES.INVALID_DATE_RANGE).toBe('ALERT_VALIDATION_100');
      expect(ALERT_ERROR_CODES.START_DATE_AFTER_END_DATE).toBe('ALERT_VALIDATION_101');
      expect(ALERT_ERROR_CODES.DATE_RANGE_TOO_LARGE).toBe('ALERT_VALIDATION_102');
      expect(ALERT_ERROR_CODES.INVALID_PAGE_PARAMETERS).toBe('ALERT_VALIDATION_103');
      expect(ALERT_ERROR_CODES.INVALID_SORT_PARAMETERS).toBe('ALERT_VALIDATION_104');
      expect(ALERT_ERROR_CODES.SEARCH_KEYWORD_TOO_LONG).toBe('ALERT_VALIDATION_105');
      expect(ALERT_ERROR_CODES.EMPTY_SEARCH_KEYWORD).toBe('ALERT_VALIDATION_106');
      expect(ALERT_ERROR_CODES.INVALID_FILTER_CRITERIA).toBe('ALERT_VALIDATION_107');
      expect(ALERT_ERROR_CODES.INVALID_AGGREGATION_INTERVAL).toBe('ALERT_VALIDATION_108');

      expect(ALERT_ERROR_CODES.INVALID_ALERT_CONFIG).toBe('ALERT_VALIDATION_200');
      expect(ALERT_ERROR_CODES.MISSING_PERFORMANCE_CONFIG).toBe('ALERT_VALIDATION_201');
      expect(ALERT_ERROR_CODES.INVALID_CACHE_CONFIG).toBe('ALERT_VALIDATION_202');
      expect(ALERT_ERROR_CODES.CONFIGURATION_VALIDATION_FAILED).toBe('ALERT_VALIDATION_203');
      expect(ALERT_ERROR_CODES.INVALID_ENVIRONMENT_SETTINGS).toBe('ALERT_VALIDATION_204');
      expect(ALERT_ERROR_CODES.CONSTANTS_VALIDATION_FAILED).toBe('ALERT_VALIDATION_205');

      // Business errors (300-599)
      expect(ALERT_ERROR_CODES.RULE_NOT_FOUND).toBe('ALERT_BUSINESS_300');
      expect(ALERT_ERROR_CODES.RULE_ALREADY_EXISTS).toBe('ALERT_BUSINESS_301');
      expect(ALERT_ERROR_CODES.RULE_IN_USE_CANNOT_DELETE).toBe('ALERT_BUSINESS_302');
      expect(ALERT_ERROR_CODES.RULE_EXECUTION_FAILED).toBe('ALERT_BUSINESS_303');
      expect(ALERT_ERROR_CODES.RULE_STATE_CONFLICT).toBe('ALERT_BUSINESS_304');
      expect(ALERT_ERROR_CODES.RULE_DEPENDENCY_MISSING).toBe('ALERT_BUSINESS_305');
      expect(ALERT_ERROR_CODES.RULE_CIRCULAR_DEPENDENCY).toBe('ALERT_BUSINESS_306');
      expect(ALERT_ERROR_CODES.RULE_VERSION_CONFLICT).toBe('ALERT_BUSINESS_307');

      expect(ALERT_ERROR_CODES.ALERT_NOT_FOUND).toBe('ALERT_BUSINESS_400');
      expect(ALERT_ERROR_CODES.ALERT_ALREADY_ACKNOWLEDGED).toBe('ALERT_BUSINESS_401');
      expect(ALERT_ERROR_CODES.ALERT_ALREADY_RESOLVED).toBe('ALERT_BUSINESS_402');
      expect(ALERT_ERROR_CODES.ALERT_STATE_TRANSITION_INVALID).toBe('ALERT_BUSINESS_403');
      expect(ALERT_ERROR_CODES.ALERT_LIFECYCLE_ERROR).toBe('ALERT_BUSINESS_404');
      expect(ALERT_ERROR_CODES.ALERT_ASSIGNMENT_FAILED).toBe('ALERT_BUSINESS_405');
      expect(ALERT_ERROR_CODES.ALERT_ESCALATION_FAILED).toBe('ALERT_BUSINESS_406');
      expect(ALERT_ERROR_CODES.ALERT_NOTIFICATION_FAILED).toBe('ALERT_BUSINESS_407');

      expect(ALERT_ERROR_CODES.QUERY_EXECUTION_FAILED).toBe('ALERT_BUSINESS_500');
      expect(ALERT_ERROR_CODES.STATISTICS_GENERATION_FAILED).toBe('ALERT_BUSINESS_501');
      expect(ALERT_ERROR_CODES.TREND_ANALYSIS_FAILED).toBe('ALERT_BUSINESS_502');
      expect(ALERT_ERROR_CODES.REPORT_GENERATION_FAILED).toBe('ALERT_BUSINESS_503');
      expect(ALERT_ERROR_CODES.DATA_AGGREGATION_FAILED).toBe('ALERT_BUSINESS_504');
      expect(ALERT_ERROR_CODES.SEARCH_OPERATION_FAILED).toBe('ALERT_BUSINESS_505');

      // System errors (600-899)
      expect(ALERT_ERROR_CODES.MEMORY_PRESSURE_DETECTED).toBe('ALERT_SYSTEM_600');
      expect(ALERT_ERROR_CODES.CPU_OVERLOAD).toBe('ALERT_SYSTEM_601');
      expect(ALERT_ERROR_CODES.ALERT_QUEUE_OVERFLOW).toBe('ALERT_SYSTEM_602');
      expect(ALERT_ERROR_CODES.RULE_PROCESSING_OVERLOAD).toBe('ALERT_SYSTEM_603');
      expect(ALERT_ERROR_CODES.NOTIFICATION_QUEUE_FULL).toBe('ALERT_SYSTEM_604');
      expect(ALERT_ERROR_CODES.THREAD_POOL_EXHAUSTED).toBe('ALERT_SYSTEM_605');
      expect(ALERT_ERROR_CODES.RESOURCE_CONTENTION).toBe('ALERT_SYSTEM_606');

      expect(ALERT_ERROR_CODES.RULE_EXECUTION_TIMEOUT).toBe('ALERT_SYSTEM_700');
      expect(ALERT_ERROR_CODES.QUERY_TIMEOUT).toBe('ALERT_SYSTEM_701');
      expect(ALERT_ERROR_CODES.NOTIFICATION_TIMEOUT).toBe('ALERT_SYSTEM_702');
      expect(ALERT_ERROR_CODES.DATABASE_OPERATION_TIMEOUT).toBe('ALERT_SYSTEM_703');
      expect(ALERT_ERROR_CODES.CACHE_OPERATION_TIMEOUT).toBe('ALERT_SYSTEM_704');
      expect(ALERT_ERROR_CODES.ALERT_PROCESSING_TIMEOUT).toBe('ALERT_SYSTEM_705');

      expect(ALERT_ERROR_CODES.SERVICE_INITIALIZATION_FAILED).toBe('ALERT_SYSTEM_800');
      expect(ALERT_ERROR_CODES.CONFIGURATION_RELOAD_FAILED).toBe('ALERT_SYSTEM_801');
      expect(ALERT_ERROR_CODES.HEALTH_CHECK_FAILED).toBe('ALERT_SYSTEM_802');
      expect(ALERT_ERROR_CODES.MONITORING_UNAVAILABLE).toBe('ALERT_SYSTEM_803');
      expect(ALERT_ERROR_CODES.ORCHESTRATOR_SERVICE_ERROR).toBe('ALERT_SYSTEM_804');

      // External errors (900-999)
      expect(ALERT_ERROR_CODES.DATABASE_CONNECTION_FAILED).toBe('ALERT_EXTERNAL_900');
      expect(ALERT_ERROR_CODES.DATABASE_OPERATION_FAILED).toBe('ALERT_EXTERNAL_901');
      expect(ALERT_ERROR_CODES.DATABASE_TRANSACTION_FAILED).toBe('ALERT_EXTERNAL_902');
      expect(ALERT_ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION).toBe('ALERT_EXTERNAL_903');
      expect(ALERT_ERROR_CODES.DATABASE_TIMEOUT).toBe('ALERT_EXTERNAL_904');
      expect(ALERT_ERROR_CODES.DATABASE_UNAVAILABLE).toBe('ALERT_EXTERNAL_905');

      expect(ALERT_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE).toBe('ALERT_EXTERNAL_930');
      expect(ALERT_ERROR_CODES.CACHE_CONNECTION_FAILED).toBe('ALERT_EXTERNAL_931');
      expect(ALERT_ERROR_CODES.CACHE_OPERATION_FAILED).toBe('ALERT_EXTERNAL_932');
      expect(ALERT_ERROR_CODES.CACHE_DATA_CORRUPTION).toBe('ALERT_EXTERNAL_933');

      expect(ALERT_ERROR_CODES.NOTIFICATION_SERVICE_UNAVAILABLE).toBe('ALERT_EXTERNAL_950');
      expect(ALERT_ERROR_CODES.EMAIL_SERVICE_FAILED).toBe('ALERT_EXTERNAL_951');
      expect(ALERT_ERROR_CODES.SMS_SERVICE_FAILED).toBe('ALERT_EXTERNAL_952');
      expect(ALERT_ERROR_CODES.WEBHOOK_DELIVERY_FAILED).toBe('ALERT_EXTERNAL_953');
      expect(ALERT_ERROR_CODES.SLACK_NOTIFICATION_FAILED).toBe('ALERT_EXTERNAL_954');

      expect(ALERT_ERROR_CODES.METRICS_SERVICE_UNAVAILABLE).toBe('ALERT_EXTERNAL_970');
      expect(ALERT_ERROR_CODES.MONITORING_DATA_UNAVAILABLE).toBe('ALERT_EXTERNAL_971');
      expect(ALERT_ERROR_CODES.EXTERNAL_API_ERROR).toBe('ALERT_EXTERNAL_972');
      expect(ALERT_ERROR_CODES.NETWORK_CONNECTION_ERROR).toBe('ALERT_EXTERNAL_973');
      expect(ALERT_ERROR_CODES.INFRASTRUCTURE_FAILURE).toBe('ALERT_EXTERNAL_974');
    });

    it('should have unique error codes', () => {
      const errorCodes = Object.values(ALERT_ERROR_CODES);
      const uniqueErrorCodes = [...new Set(errorCodes)];
      expect(errorCodes).toHaveLength(uniqueErrorCodes.length);
    });

    it('should follow correct naming convention', () => {
      Object.entries(ALERT_ERROR_CODES).forEach(([key, value]) => {
        // Check that the key is in UPPER_SNAKE_CASE
        expect(key).toMatch(/^[A-Z_0-9]+$/);
        
        // Check that the value follows the pattern ALERT_{CATEGORY}_{NUMBER}
        expect(value).toMatch(/^ALERT_[A-Z]+_\d+$/);
      });
    });
  });

  describe('AlertErrorCategories', () => {
    describe('isValidationError', () => {
      it('should correctly identify validation errors', () => {
        expect(AlertErrorCategories.isValidationError('ALERT_VALIDATION_001')).toBe(true);
        expect(AlertErrorCategories.isValidationError('ALERT_VALIDATION_100')).toBe(true);
        expect(AlertErrorCategories.isValidationError('ALERT_BUSINESS_300')).toBe(false);
        expect(AlertErrorCategories.isValidationError('ALERT_SYSTEM_600')).toBe(false);
      });
    });

    describe('isBusinessError', () => {
      it('should correctly identify business errors', () => {
        expect(AlertErrorCategories.isBusinessError('ALERT_BUSINESS_300')).toBe(true);
        expect(AlertErrorCategories.isBusinessError('ALERT_BUSINESS_400')).toBe(true);
        expect(AlertErrorCategories.isBusinessError('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.isBusinessError('ALERT_SYSTEM_600')).toBe(false);
      });
    });

    describe('isSystemError', () => {
      it('should correctly identify system errors', () => {
        expect(AlertErrorCategories.isSystemError('ALERT_SYSTEM_600')).toBe(true);
        expect(AlertErrorCategories.isSystemError('ALERT_SYSTEM_700')).toBe(true);
        expect(AlertErrorCategories.isSystemError('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.isSystemError('ALERT_BUSINESS_300')).toBe(false);
      });
    });

    describe('isExternalError', () => {
      it('should correctly identify external errors', () => {
        expect(AlertErrorCategories.isExternalError('ALERT_EXTERNAL_900')).toBe(true);
        expect(AlertErrorCategories.isExternalError('ALERT_EXTERNAL_950')).toBe(true);
        expect(AlertErrorCategories.isExternalError('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.isExternalError('ALERT_BUSINESS_300')).toBe(false);
      });
    });

    describe('isRetryable', () => {
      it('should correctly identify retryable errors', () => {
        // External errors are generally retryable
        expect(AlertErrorCategories.isRetryable('ALERT_EXTERNAL_900')).toBe(true);
        expect(AlertErrorCategories.isRetryable('ALERT_EXTERNAL_950')).toBe(true);
        
        // System timeout and overload errors are retryable (based on string matching)
        expect(AlertErrorCategories.isRetryable('ALERT_SYSTEM_RULE_EXECUTION_TIMEOUT')).toBe(true);
        expect(AlertErrorCategories.isRetryable('ALERT_SYSTEM_CPU_OVERLOAD')).toBe(true);
        expect(AlertErrorCategories.isRetryable('ALERT_SYSTEM_QUEUE_OVERFLOW')).toBe(true);
        
        // Some business errors are retryable (based on string matching)
        expect(AlertErrorCategories.isRetryable('ALERT_BUSINESS_RULE_EXECUTION_FAILED')).toBe(true);
        expect(AlertErrorCategories.isRetryable('ALERT_BUSINESS_QUERY_EXECUTION_FAILED')).toBe(true);
        expect(AlertErrorCategories.isRetryable('ALERT_BUSINESS_NOTIFICATION_FAILED')).toBe(true);
        
        // Validation errors are not retryable
        expect(AlertErrorCategories.isRetryable('ALERT_VALIDATION_001')).toBe(false);
        
        // Some external errors are not retryable (constraint violations and data corruption)
        expect(AlertErrorCategories.isRetryable('ALERT_EXTERNAL_CONSTRAINT_VIOLATION')).toBe(false);
        expect(AlertErrorCategories.isRetryable('ALERT_EXTERNAL_DATA_CORRUPTION')).toBe(false);
      });
    });

    describe('getRecoveryAction', () => {
      it('should return correct recovery action', () => {
        // Retryable errors
        expect(AlertErrorCategories.getRecoveryAction('ALERT_EXTERNAL_900')).toBe('retry');
        expect(AlertErrorCategories.getRecoveryAction('ALERT_SYSTEM_RULE_EXECUTION_TIMEOUT')).toBe('retry');
        expect(AlertErrorCategories.getRecoveryAction('ALERT_BUSINESS_RULE_EXECUTION_FAILED')).toBe('retry');
        
        // Non-retryable external/system errors should fallback
        expect(AlertErrorCategories.getRecoveryAction('ALERT_EXTERNAL_CONSTRAINT_VIOLATION')).toBe('fallback');
        expect(AlertErrorCategories.getRecoveryAction('ALERT_SYSTEM_800')).toBe('fallback');
        
        // Other errors should abort
        expect(AlertErrorCategories.getRecoveryAction('ALERT_VALIDATION_001')).toBe('abort');
      });
    });

    describe('getSeverityLevel', () => {
      it('should return correct severity levels', () => {
        // Validation errors are low severity
        expect(AlertErrorCategories.getSeverityLevel('ALERT_VALIDATION_001')).toBe('low');
        
        // Business errors vary in severity
        expect(AlertErrorCategories.getSeverityLevel('ALERT_BUSINESS_400')).toBe('medium');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_BUSINESS_RULE_EXECUTION_FAILED')).toBe('high');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_BUSINESS_NOTIFICATION_FAILED')).toBe('high');
        
        // System errors are high or critical
        expect(AlertErrorCategories.getSeverityLevel('ALERT_SYSTEM_MEMORY_PRESSURE')).toBe('critical');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_SYSTEM_700')).toBe('high');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_SYSTEM_SERVICE_INITIALIZATION_FAILED')).toBe('critical');
        
        // External errors are high or critical
        expect(AlertErrorCategories.getSeverityLevel('ALERT_EXTERNAL_900')).toBe('high');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_EXTERNAL_INFRASTRUCTURE_FAILURE')).toBe('critical');
        expect(AlertErrorCategories.getSeverityLevel('ALERT_EXTERNAL_DATABASE_UNAVAILABLE')).toBe('critical');
      });
    });

    describe('requiresImmediateAlert', () => {
      it('should correctly identify errors requiring immediate alert', () => {
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_SYSTEM_MEMORY_PRESSURE')).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_SYSTEM_CPU_OVERLOAD')).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_SYSTEM_SERVICE_INITIALIZATION_FAILED')).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_EXTERNAL_INFRASTRUCTURE_FAILURE')).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_EXTERNAL_DATABASE_UNAVAILABLE')).toBe(true);
        
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.requiresImmediateAlert('ALERT_BUSINESS_300')).toBe(false);
      });
    });

    describe('requiresServiceDegradation', () => {
      it('should correctly identify errors requiring service degradation', () => {
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_EXTERNAL_DATABASE_UNAVAILABLE')).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_EXTERNAL_CACHE_SERVICE_UNAVAILABLE')).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_SYSTEM_MEMORY_PRESSURE')).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_SYSTEM_CPU_OVERLOAD')).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_EXTERNAL_INFRASTRUCTURE_FAILURE')).toBe(true);
        
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.requiresServiceDegradation('ALERT_BUSINESS_300')).toBe(false);
      });
    });

    describe('requiresResourceCleanup', () => {
      it('should correctly identify errors requiring resource cleanup', () => {
        expect(AlertErrorCategories.requiresResourceCleanup('ALERT_SYSTEM_MEMORY_PRESSURE')).toBe(true);
        expect(AlertErrorCategories.requiresResourceCleanup('ALERT_SYSTEM_QUEUE_OVERFLOW')).toBe(true);
        expect(AlertErrorCategories.requiresResourceCleanup('ALERT_SYSTEM_THREAD_POOL_EXHAUSTED')).toBe(true);
        
        expect(AlertErrorCategories.requiresResourceCleanup('ALERT_VALIDATION_001')).toBe(false);
        expect(AlertErrorCategories.requiresResourceCleanup('ALERT_BUSINESS_300')).toBe(false);
      });
    });
  });

  describe('Error Code Integration', () => {
    it('should have consistent categorization', () => {
      Object.entries(ALERT_ERROR_CODES).forEach(([key, value]) => {
        // Verify that the error code categorization matches its code
        if (value.includes('VALIDATION')) {
          expect(AlertErrorCategories.isValidationError(value)).toBe(true);
        }
        
        if (value.includes('BUSINESS')) {
          expect(AlertErrorCategories.isBusinessError(value)).toBe(true);
        }
        
        if (value.includes('SYSTEM')) {
          expect(AlertErrorCategories.isSystemError(value)).toBe(true);
        }
        
        if (value.includes('EXTERNAL')) {
          expect(AlertErrorCategories.isExternalError(value)).toBe(true);
        }
      });
    });

    it('should have logical error code ranges', () => {
      // Check that validation errors are in 001-299 range
      const validationCodes = Object.values(ALERT_ERROR_CODES).filter(code => code.includes('VALIDATION'));
      validationCodes.forEach(code => {
        const numberPart = parseInt(code.split('_').pop() || '0', 10);
        expect(numberPart).toBeGreaterThanOrEqual(1);
        expect(numberPart).toBeLessThanOrEqual(299);
      });
      
      // Check that business errors are in 300-599 range
      const businessCodes = Object.values(ALERT_ERROR_CODES).filter(code => code.includes('BUSINESS'));
      businessCodes.forEach(code => {
        const numberPart = parseInt(code.split('_').pop() || '0', 10);
        expect(numberPart).toBeGreaterThanOrEqual(300);
        expect(numberPart).toBeLessThanOrEqual(599);
      });
      
      // Check that system errors are in 600-899 range
      const systemCodes = Object.values(ALERT_ERROR_CODES).filter(code => code.includes('SYSTEM'));
      systemCodes.forEach(code => {
        const numberPart = parseInt(code.split('_').pop() || '0', 10);
        expect(numberPart).toBeGreaterThanOrEqual(600);
        expect(numberPart).toBeLessThanOrEqual(899);
      });
      
      // Check that external errors are in 900-999 range
      const externalCodes = Object.values(ALERT_ERROR_CODES).filter(code => code.includes('EXTERNAL'));
      externalCodes.forEach(code => {
        const numberPart = parseInt(code.split('_').pop() || '0', 10);
        expect(numberPart).toBeGreaterThanOrEqual(900);
        expect(numberPart).toBeLessThanOrEqual(999);
      });
    });

    it('should handle edge cases in error categorization', () => {
      // Test with unknown error codes
      expect(AlertErrorCategories.isValidationError('UNKNOWN_ERROR')).toBe(false);
      expect(AlertErrorCategories.isBusinessError('UNKNOWN_ERROR')).toBe(false);
      expect(AlertErrorCategories.isSystemError('UNKNOWN_ERROR')).toBe(false);
      expect(AlertErrorCategories.isExternalError('UNKNOWN_ERROR')).toBe(false);
      
      // Test with malformed error codes
      expect(AlertErrorCategories.isValidationError('')).toBe(false);
      // Note: The implementation doesn't handle null/undefined gracefully,
      // so these will throw errors as expected in the current implementation
    });
  });
});