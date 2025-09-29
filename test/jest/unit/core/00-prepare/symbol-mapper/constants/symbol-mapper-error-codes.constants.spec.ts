import {
  SYMBOL_MAPPER_ERROR_CODES,
  SYMBOL_MAPPER_ERROR_DESCRIPTIONS,
  SymbolMapperErrorCategories,
  SymbolMapperErrorCode,
} from '../../../../../../../src/core/00-prepare/symbol-mapper/constants/symbol-mapper-error-codes.constants';

describe('SymbolMapperErrorCodes', () => {
  describe('SYMBOL_MAPPER_ERROR_CODES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_ERROR_CODES)).toBe(true);
    });

    it('should contain all validation error codes (001-299)', () => {
      const validationErrors = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('VALIDATION'));

      expect(validationErrors.length).toBeGreaterThan(0);

      // Check symbol validation errors (001-099)
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT).toBe('SYMBOL_MAPPER_VALIDATION_001');
      expect(SYMBOL_MAPPER_ERROR_CODES.MISSING_SYMBOL_PARAM).toBe('SYMBOL_MAPPER_VALIDATION_002');
      expect(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_LENGTH_EXCEEDED).toBe('SYMBOL_MAPPER_VALIDATION_003');
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_CHARACTERS).toBe('SYMBOL_MAPPER_VALIDATION_004');
      expect(SYMBOL_MAPPER_ERROR_CODES.DUPLICATE_SYMBOLS).toBe('SYMBOL_MAPPER_VALIDATION_005');
      expect(SYMBOL_MAPPER_ERROR_CODES.SYMBOLS_LIMIT_EXCEEDED).toBe('SYMBOL_MAPPER_VALIDATION_006');
      expect(SYMBOL_MAPPER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY).toBe('SYMBOL_MAPPER_VALIDATION_007');
      expect(SYMBOL_MAPPER_ERROR_CODES.UNSUPPORTED_SYMBOL_TYPE).toBe('SYMBOL_MAPPER_VALIDATION_008');

      // Check data source validation errors (100-199)
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_DATA_SOURCE_NAME).toBe('SYMBOL_MAPPER_VALIDATION_100');
      expect(SYMBOL_MAPPER_ERROR_CODES.MISSING_DATA_SOURCE_PARAM).toBe('SYMBOL_MAPPER_VALIDATION_101');
      expect(SYMBOL_MAPPER_ERROR_CODES.UNSUPPORTED_DATA_SOURCE).toBe('SYMBOL_MAPPER_VALIDATION_102');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_NAME_TOO_LONG).toBe('SYMBOL_MAPPER_VALIDATION_103');
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_PROVIDER_FORMAT).toBe('SYMBOL_MAPPER_VALIDATION_104');
      expect(SYMBOL_MAPPER_ERROR_CODES.MISSING_PROVIDER_CONFIG).toBe('SYMBOL_MAPPER_VALIDATION_105');

      // Check mapping rule validation errors (200-299)
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_MAPPING_RULE).toBe('SYMBOL_MAPPER_VALIDATION_200');
      expect(SYMBOL_MAPPER_ERROR_CODES.MALFORMED_MAPPING_PATTERN).toBe('SYMBOL_MAPPER_VALIDATION_201');
      expect(SYMBOL_MAPPER_ERROR_CODES.MISSING_MAPPING_FIELDS).toBe('SYMBOL_MAPPER_VALIDATION_202');
      expect(SYMBOL_MAPPER_ERROR_CODES.INVALID_MAPPING_PRIORITY).toBe('SYMBOL_MAPPER_VALIDATION_203');
      expect(SYMBOL_MAPPER_ERROR_CODES.CONFLICTING_MAPPING_RULES).toBe('SYMBOL_MAPPER_VALIDATION_205');
    });

    it('should contain all business logic error codes (300-599)', () => {
      const businessErrors = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('BUSINESS'));

      expect(businessErrors.length).toBeGreaterThan(0);

      // Check mapping configuration errors (300-399)
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND).toBe('SYMBOL_MAPPER_BUSINESS_300');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_ALREADY_EXISTS).toBe('SYMBOL_MAPPER_BUSINESS_301');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_IN_USE).toBe('SYMBOL_MAPPER_BUSINESS_302');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_DISABLED).toBe('SYMBOL_MAPPER_BUSINESS_303');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_CORRUPTED).toBe('SYMBOL_MAPPER_BUSINESS_304');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_VERSION_MISMATCH).toBe('SYMBOL_MAPPER_BUSINESS_305');
      expect(SYMBOL_MAPPER_ERROR_CODES.CIRCULAR_MAPPING_DETECTED).toBe('SYMBOL_MAPPER_BUSINESS_306');

      // 数据源错误 (400-499)
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_NOT_FOUND).toBe('SYMBOL_MAPPER_BUSINESS_400');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_MAPPING_NOT_FOUND).toBe('SYMBOL_MAPPER_BUSINESS_401');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_UNAVAILABLE).toBe('SYMBOL_MAPPER_BUSINESS_402');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_AUTHENTICATION_FAILED).toBe('SYMBOL_MAPPER_BUSINESS_403');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_RATE_LIMITED).toBe('SYMBOL_MAPPER_BUSINESS_404');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_FORMAT_CHANGED).toBe('SYMBOL_MAPPER_BUSINESS_405');

      // Check mapping operation errors (500-599)
      expect(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED).toBe('SYMBOL_MAPPER_BUSINESS_500');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_RULE_NOT_FOUND).toBe('SYMBOL_MAPPER_BUSINESS_501');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_RESULT_EMPTY).toBe('SYMBOL_MAPPER_BUSINESS_502');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFLICT_DETECTED).toBe('SYMBOL_MAPPER_BUSINESS_503');
      expect(SYMBOL_MAPPER_ERROR_CODES.BATCH_MAPPING_FAILED).toBe('SYMBOL_MAPPER_BUSINESS_504');
      expect(SYMBOL_MAPPER_ERROR_CODES.MAPPING_RULE_EXECUTION_FAILED).toBe('SYMBOL_MAPPER_BUSINESS_505');
      expect(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_TRANSFORMATION_FAILED).toBe('SYMBOL_MAPPER_BUSINESS_506');
    });

    it('should contain all system resource error codes (600-899)', () => {
      const systemErrors = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('SYSTEM'));

      expect(systemErrors.length).toBeGreaterThan(0);

      // Check cache errors (600-699)
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_600');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_MISS_CRITICAL).toBe('SYMBOL_MAPPER_SYSTEM_601');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_INVALIDATION_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_602');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_WARMING_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_603');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_MEMORY_PRESSURE).toBe('SYMBOL_MAPPER_SYSTEM_604');
      expect(SYMBOL_MAPPER_ERROR_CODES.LRU_CACHE_OVERFLOW).toBe('SYMBOL_MAPPER_SYSTEM_605');

      // Check performance and resource errors (700-799)
      expect(SYMBOL_MAPPER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED).toBe('SYMBOL_MAPPER_SYSTEM_700');
      expect(SYMBOL_MAPPER_ERROR_CODES.CPU_OVERLOAD).toBe('SYMBOL_MAPPER_SYSTEM_701');
      expect(SYMBOL_MAPPER_ERROR_CODES.PROCESSING_TIMEOUT).toBe('SYMBOL_MAPPER_SYSTEM_702');
      expect(SYMBOL_MAPPER_ERROR_CODES.CONCURRENT_OPERATIONS_LIMIT).toBe('SYMBOL_MAPPER_SYSTEM_703');
      expect(SYMBOL_MAPPER_ERROR_CODES.THREAD_POOL_EXHAUSTED).toBe('SYMBOL_MAPPER_SYSTEM_704');
      expect(SYMBOL_MAPPER_ERROR_CODES.RESOURCE_CONTENTION).toBe('SYMBOL_MAPPER_SYSTEM_705');

      // Check configuration and environment errors (800-899)
      expect(SYMBOL_MAPPER_ERROR_CODES.SERVICE_INITIALIZATION_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_800');
      expect(SYMBOL_MAPPER_ERROR_CODES.CONFIGURATION_RELOAD_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_801');
      expect(SYMBOL_MAPPER_ERROR_CODES.HEALTH_CHECK_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_802');
      expect(SYMBOL_MAPPER_ERROR_CODES.MONITORING_UNAVAILABLE).toBe('SYMBOL_MAPPER_SYSTEM_803');
      expect(SYMBOL_MAPPER_ERROR_CODES.RULE_ENGINE_STARTUP_FAILED).toBe('SYMBOL_MAPPER_SYSTEM_804');
    });

    it('should contain all external dependency error codes (900-999)', () => {
      const externalErrors = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('EXTERNAL'));

      expect(externalErrors.length).toBeGreaterThan(0);

      // Check database errors (900-929)
      expect(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_900');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATABASE_OPERATION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_901');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATABASE_TRANSACTION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_902');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION).toBe('SYMBOL_MAPPER_EXTERNAL_903');
      expect(SYMBOL_MAPPER_ERROR_CODES.DATABASE_TIMEOUT).toBe('SYMBOL_MAPPER_EXTERNAL_904');
      expect(SYMBOL_MAPPER_ERROR_CODES.MONGODB_AGGREGATION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_905');

      // Check cache service errors (930-949)
      expect(SYMBOL_MAPPER_ERROR_CODES.REDIS_CONNECTION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_930');
      expect(SYMBOL_MAPPER_ERROR_CODES.REDIS_OPERATION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_931');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE).toBe('SYMBOL_MAPPER_EXTERNAL_932');
      expect(SYMBOL_MAPPER_ERROR_CODES.CACHE_SERIALIZATION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_933');

      // Check external API errors (950-979)
      expect(SYMBOL_MAPPER_ERROR_CODES.EXTERNAL_API_ERROR).toBe('SYMBOL_MAPPER_EXTERNAL_950');
      expect(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_API_UNAVAILABLE).toBe('SYMBOL_MAPPER_EXTERNAL_951');
      expect(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_AUTHENTICATION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_952');
      expect(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_RATE_LIMITED).toBe('SYMBOL_MAPPER_EXTERNAL_953');
      expect(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_DATA_FORMAT_ERROR).toBe('SYMBOL_MAPPER_EXTERNAL_954');

      // Check network and infrastructure errors (980-999)
      expect(SYMBOL_MAPPER_ERROR_CODES.NETWORK_CONNECTION_ERROR).toBe('SYMBOL_MAPPER_EXTERNAL_980');
      expect(SYMBOL_MAPPER_ERROR_CODES.NETWORK_TIMEOUT).toBe('SYMBOL_MAPPER_EXTERNAL_981');
      expect(SYMBOL_MAPPER_ERROR_CODES.DNS_RESOLUTION_FAILED).toBe('SYMBOL_MAPPER_EXTERNAL_982');
      expect(SYMBOL_MAPPER_ERROR_CODES.SSL_CERTIFICATE_ERROR).toBe('SYMBOL_MAPPER_EXTERNAL_983');
      expect(SYMBOL_MAPPER_ERROR_CODES.INFRASTRUCTURE_FAILURE).toBe('SYMBOL_MAPPER_EXTERNAL_984');
    });

    it('should have unique error codes', () => {
      const errorCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES);
      const uniqueErrorCodes = new Set(errorCodes);

      expect(errorCodes.length).toBe(uniqueErrorCodes.size);
    });

    it('should follow proper error code format', () => {
      const errorCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES);

      errorCodes.forEach(code => {
        expect(code).toMatch(/^SYMBOL_MAPPER_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
      });
    });
  });

  describe('SymbolMapperErrorCode type', () => {
    it('should correctly type error codes', () => {
      const validationError: SymbolMapperErrorCode = SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT;
      const businessError: SymbolMapperErrorCode = SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND;
      const systemError: SymbolMapperErrorCode = SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED;
      const externalError: SymbolMapperErrorCode = SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED;

      expect(typeof validationError).toBe('string');
      expect(typeof businessError).toBe('string');
      expect(typeof systemError).toBe('string');
      expect(typeof externalError).toBe('string');
    });
  });

  describe('SymbolMapperErrorCategories', () => {
    describe('isValidationError', () => {
      it('should correctly identify validation errors', () => {
        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(true);
        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.MISSING_DATA_SOURCE_PARAM)).toBe(true);
        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.INVALID_MAPPING_RULE)).toBe(true);

        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(false);
        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(false);
        expect(SymbolMapperErrorCategories.isValidationError(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(false);
      });
    });

    describe('isBusinessError', () => {
      it('should correctly identify business logic errors', () => {
        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(true);
        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_NOT_FOUND)).toBe(true);
        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED)).toBe(true);

        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(false);
        expect(SymbolMapperErrorCategories.isBusinessError(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(false);
      });
    });

    describe('isSystemError', () => {
      it('should correctly identify system resource errors', () => {
        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED)).toBe(true);
        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.SERVICE_INITIALIZATION_FAILED)).toBe(true);

        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(false);
        expect(SymbolMapperErrorCategories.isSystemError(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(false);
      });
    });

    describe('isExternalError', () => {
      it('should correctly identify external dependency errors', () => {
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_API_UNAVAILABLE)).toBe(true);
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.NETWORK_CONNECTION_ERROR)).toBe(true);

        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(false);
        expect(SymbolMapperErrorCategories.isExternalError(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(false);
      });
    });

    describe('isRetryable', () => {
      it('should correctly identify retryable errors', () => {
        // External errors (generally retryable except auth and format errors)
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_API_UNAVAILABLE)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.NETWORK_TIMEOUT)).toBe(true);

        // External errors that are NOT retryable
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_AUTHENTICATION_FAILED)).toBe(false);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_DATA_FORMAT_ERROR)).toBe(false);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION)).toBe(false);

        // System resource errors (some retryable)
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.PROCESSING_TIMEOUT)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.CPU_OVERLOAD)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.CACHE_MEMORY_PRESSURE)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.THREAD_POOL_EXHAUSTED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.RESOURCE_CONTENTION)).toBe(true);

        // Cache operation errors (retryable)
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.CACHE_MISS_CRITICAL)).toBe(true);

        // Some business errors (retryable)
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.MAPPING_RULE_EXECUTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_UNAVAILABLE)).toBe(true);

        // Validation errors (not retryable)
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.isRetryable(SYMBOL_MAPPER_ERROR_CODES.MISSING_DATA_SOURCE_PARAM)).toBe(false);
      });
    });

    describe('getRecoveryAction', () => {
      it('should return correct recovery actions', () => {
        // Retryable errors should suggest retry
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe('retry');
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.PROCESSING_TIMEOUT)).toBe('retry');
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED)).toBe('retry');

        // Non-retryable external/system errors should suggest fallback
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_AUTHENTICATION_FAILED)).toBe('fallback');
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.SERVICE_INITIALIZATION_FAILED)).toBe('fallback');

        // Validation errors should suggest abort
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe('abort');
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.MISSING_DATA_SOURCE_PARAM)).toBe('abort');
        expect(SymbolMapperErrorCategories.getRecoveryAction(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe('abort');
      });
    });

    describe('getSeverityLevel', () => {
      it('should return correct severity levels', () => {
        // Validation errors should be low severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe('low');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.MISSING_DATA_SOURCE_PARAM)).toBe('low');

        // Critical system errors should be critical severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED)).toBe('critical');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.SERVICE_INITIALIZATION_FAILED)).toBe('critical');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.RULE_ENGINE_STARTUP_FAILED)).toBe('critical');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.CPU_OVERLOAD)).toBe('critical');

        // Critical external errors should be critical severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe('critical');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.INFRASTRUCTURE_FAILURE)).toBe('critical');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.MONGODB_AGGREGATION_FAILED)).toBe('critical');

        // High-priority business errors should be high severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_CORRUPTED)).toBe('high');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.CIRCULAR_MAPPING_DETECTED)).toBe('high');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_AUTHENTICATION_FAILED)).toBe(
          'high',
        );

        // Most system errors should be high severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe('high');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.PROCESSING_TIMEOUT)).toBe('high');

        // Most external errors should be high severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe('high');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.PROVIDER_API_UNAVAILABLE)).toBe('high');

        // Regular business errors should be medium severity
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe('medium');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_NOT_FOUND)).toBe('medium');
        expect(SymbolMapperErrorCategories.getSeverityLevel(SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED)).toBe('medium');
      });
    });

    describe('requiresCacheCleanup', () => {
      it('should correctly identify errors requiring cache cleanup', () => {
        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.CACHE_MEMORY_PRESSURE)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.LRU_CACHE_OVERFLOW)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.CACHE_INVALIDATION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_CORRUPTED)).toBe(true);

        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.requiresCacheCleanup(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(false);
      });
    });

    describe('requiresRuleReload', () => {
      it('should correctly identify errors requiring rule reload', () => {
        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_CORRUPTED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.RULE_ENGINE_STARTUP_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_VERSION_MISMATCH)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.CONFIGURATION_RELOAD_FAILED)).toBe(true);

        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.requiresRuleReload(SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED)).toBe(false);
      });
    });

    describe('requiresServiceDegradation', () => {
      it('should correctly identify errors requiring service degradation', () => {
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.CPU_OVERLOAD)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.INFRASTRUCTURE_FAILURE)).toBe(true);

        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.requiresServiceDegradation(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(false);
      });
    });

    describe('requiresImmediateAlert', () => {
      it('should correctly identify errors requiring immediate alerts', () => {
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_CORRUPTED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.SERVICE_INITIALIZATION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.INFRASTRUCTURE_FAILURE)).toBe(true);
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.CIRCULAR_MAPPING_DETECTED)).toBe(true);

        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT)).toBe(false);
        expect(SymbolMapperErrorCategories.requiresImmediateAlert(SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND)).toBe(false);
      });
    });
  });

  describe('SYMBOL_MAPPER_ERROR_DESCRIPTIONS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_ERROR_DESCRIPTIONS)).toBe(true);
    });

    it('should contain descriptions for key error codes', () => {
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.INVALID_SYMBOL_FORMAT]).toBe('Symbol format is invalid or malformed');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_NOT_FOUND]).toBe('Symbol mapping configuration not found');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.MAPPING_CONFIG_ALREADY_EXISTS]).toBe('Symbol mapping configuration already exists');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_NOT_FOUND]).toBe('Data source not found or not configured');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.DATA_SOURCE_MAPPING_NOT_FOUND]).toBe('Data source mapping not found');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.MAPPING_RULE_NOT_FOUND]).toBe('Mapping rule not found for specified criteria');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.SYMBOL_MAPPING_FAILED]).toBe('Symbol mapping operation failed');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.CACHE_OPERATION_FAILED]).toBe('Cache operation failed during symbol mapping');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.DATABASE_CONNECTION_FAILED]).toBe('Failed to connect to symbol mapping database');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.PROVIDER_API_UNAVAILABLE]).toBe('External symbol provider API is unavailable');
      expect(SYMBOL_MAPPER_ERROR_DESCRIPTIONS[SYMBOL_MAPPER_ERROR_CODES.CIRCULAR_MAPPING_DETECTED]).toBe('Circular dependency detected in mapping rules');
    });

    it('should have meaningful descriptions', () => {
      Object.values(SYMBOL_MAPPER_ERROR_DESCRIPTIONS).forEach(description => {
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(10);
        expect(description).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });
  });

  describe('Error code consistency', () => {
    it('should have consistent naming patterns', () => {
      // All validation errors should contain 'VALIDATION'
      Object.entries(SYMBOL_MAPPER_ERROR_CODES).forEach(([key, value]) => {
        if (value.includes('VALIDATION')) {
          expect(key).not.toMatch(/^(DATABASE|REDIS|EXTERNAL|CACHE|MEMORY|CPU|SERVICE)/);
        }
      });

      // All business errors should contain 'BUSINESS'
      Object.entries(SYMBOL_MAPPER_ERROR_CODES).forEach(([key, value]) => {
        if (value.includes('BUSINESS')) {
          expect(value).toMatch(/^SYMBOL_MAPPER_BUSINESS_[3-5]\d{2}$/);
        }
      });

      // All system errors should contain 'SYSTEM'
      Object.entries(SYMBOL_MAPPER_ERROR_CODES).forEach(([key, value]) => {
        if (value.includes('SYSTEM')) {
          expect(value).toMatch(/^SYMBOL_MAPPER_SYSTEM_[6-8]\d{2}$/);
        }
      });

      // All external errors should contain 'EXTERNAL'
      Object.entries(SYMBOL_MAPPER_ERROR_CODES).forEach(([key, value]) => {
        if (value.includes('EXTERNAL')) {
          expect(value).toMatch(/^SYMBOL_MAPPER_EXTERNAL_9\d{2}$/);
        }
      });
    });

    it('should have proper numeric ranges', () => {
      const validationCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('VALIDATION'))
        .map(code => parseInt(code.split('_').pop() || '0'));

      const businessCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('BUSINESS'))
        .map(code => parseInt(code.split('_').pop() || '0'));

      const systemCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('SYSTEM'))
        .map(code => parseInt(code.split('_').pop() || '0'));

      const externalCodes = Object.values(SYMBOL_MAPPER_ERROR_CODES)
        .filter(code => code.includes('EXTERNAL'))
        .map(code => parseInt(code.split('_').pop() || '0'));

      // Validation: 001-299
      validationCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(1);
        expect(code).toBeLessThanOrEqual(299);
      });

      // Business: 300-599
      businessCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(300);
        expect(code).toBeLessThanOrEqual(599);
      });

      // System: 600-899
      systemCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(600);
        expect(code).toBeLessThanOrEqual(899);
      });

      // External: 900-999
      externalCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(900);
        expect(code).toBeLessThanOrEqual(999);
      });
    });
  });
});