import {
  STREAM_DATA_FETCHER_ERROR_CODES,
  StreamDataFetcherErrorCategories,
  STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS,
  StreamDataFetcherErrorCode,
} from '@core/03-fetching/stream-data-fetcher/constants/stream-data-fetcher-error-codes.constants';

describe('StreamDataFetcherErrorCodes', () => {
  describe('STREAM_DATA_FETCHER_ERROR_CODES', () => {
    it('should have all validation error codes defined', () => {
      // Test validation errors (001-299)
      expect(STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL).toBe('STREAM_DATA_FETCHER_VALIDATION_001');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM).toBe('STREAM_DATA_FETCHER_VALIDATION_002');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.INVALID_SYMBOLS_FORMAT).toBe('STREAM_DATA_FETCHER_VALIDATION_003');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.SYMBOLS_LIMIT_EXCEEDED).toBe('STREAM_DATA_FETCHER_VALIDATION_004');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.INVALID_PROVIDER_PARAM).toBe('STREAM_DATA_FETCHER_VALIDATION_005');
    });

    it('should have all business error codes defined', () => {
      // Test business errors (300-599)
      expect(STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS).toBe('STREAM_DATA_FETCHER_BUSINESS_300');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_NOT_FOUND).toBe('STREAM_DATA_FETCHER_BUSINESS_301');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_STATE_MISMATCH).toBe('STREAM_DATA_FETCHER_BUSINESS_302');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.DUPLICATE_SUBSCRIPTION).toBe('STREAM_DATA_FETCHER_BUSINESS_303');
    });

    it('should have all system error codes defined', () => {
      // Test system errors (600-899)
      expect(STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED).toBe('STREAM_DATA_FETCHER_SYSTEM_600');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_POOL_EXHAUSTED).toBe('STREAM_DATA_FETCHER_SYSTEM_601');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_TIMEOUT).toBe('STREAM_DATA_FETCHER_SYSTEM_700');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('STREAM_DATA_FETCHER_SYSTEM_705');
    });

    it('should have all external error codes defined', () => {
      // Test external errors (900-999)
      expect(STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_WEBSOCKET_UNAVAILABLE).toBe('STREAM_DATA_FETCHER_EXTERNAL_900');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_CONNECTION_FAILED).toBe('STREAM_DATA_FETCHER_EXTERNAL_901');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR).toBe('STREAM_DATA_FETCHER_EXTERNAL_950');
      expect(STREAM_DATA_FETCHER_ERROR_CODES.SSL_HANDSHAKE_FAILED).toBe('STREAM_DATA_FETCHER_EXTERNAL_953');
    });

    it('should contain all expected error categories', () => {
      const errorCodes = Object.values(STREAM_DATA_FETCHER_ERROR_CODES);

      // Check we have validation errors
      expect(errorCodes.some(code => code.includes('VALIDATION'))).toBe(true);

      // Check we have business errors
      expect(errorCodes.some(code => code.includes('BUSINESS'))).toBe(true);

      // Check we have system errors
      expect(errorCodes.some(code => code.includes('SYSTEM'))).toBe(true);

      // Check we have external errors
      expect(errorCodes.some(code => code.includes('EXTERNAL'))).toBe(true);
    });

    it('should have unique error codes', () => {
      const errorCodes = Object.values(STREAM_DATA_FETCHER_ERROR_CODES);
      const uniqueCodes = new Set(errorCodes);

      expect(errorCodes.length).toBe(uniqueCodes.size);
    });

    it('should follow consistent naming convention', () => {
      const errorCodes = Object.values(STREAM_DATA_FETCHER_ERROR_CODES);

      errorCodes.forEach(code => {
        expect(code).toMatch(/^STREAM_DATA_FETCHER_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
      });
    });
  });

  describe('StreamDataFetcherErrorCategories', () => {
    describe('isValidationError', () => {
      it('should correctly identify validation errors', () => {
        expect(StreamDataFetcherErrorCategories.isValidationError(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isValidationError(
          STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isValidationError(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS
        )).toBe(false);
      });
    });

    describe('isBusinessError', () => {
      it('should correctly identify business errors', () => {
        expect(StreamDataFetcherErrorCategories.isBusinessError(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isBusinessError(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isBusinessError(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe(false);
      });
    });

    describe('isSystemError', () => {
      it('should correctly identify system errors', () => {
        expect(StreamDataFetcherErrorCategories.isSystemError(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isSystemError(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_TIMEOUT
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isSystemError(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS
        )).toBe(false);
      });
    });

    describe('isExternalError', () => {
      it('should correctly identify external errors', () => {
        expect(StreamDataFetcherErrorCategories.isExternalError(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_WEBSOCKET_UNAVAILABLE
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isExternalError(
          STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isExternalError(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe(false);
      });
    });

    describe('isRetryable', () => {
      it('should identify retryable external errors correctly', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_CONNECTION_FAILED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_TIMEOUT
        )).toBe(true);
      });

      it('should identify non-retryable external errors correctly', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_AUTHENTICATION_FAILED
        )).toBe(false);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.SSL_HANDSHAKE_FAILED
        )).toBe(false);
      });

      it('should identify retryable system timeout errors', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_TIMEOUT
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.HEARTBEAT_TIMEOUT
        )).toBe(true);
      });

      it('should identify retryable resource errors', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_POOL_EXHAUSTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.CPU_OVERLOAD
        )).toBe(true);
      });

      it('should identify retryable state errors', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.STATE_TRANSITION_FAILED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_PROCESSING_BACKLOG
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_BUFFER_OVERFLOW
        )).toBe(true);
      });

      it('should identify non-retryable validation errors', () => {
        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe(false);

        expect(StreamDataFetcherErrorCategories.isRetryable(
          STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM
        )).toBe(false);
      });
    });

    describe('getRecoveryAction', () => {
      it('should suggest reconnect for connection-related errors', () => {
        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_CONNECTION_FAILED
        )).toBe('reconnect');

        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR
        )).toBe('reconnect');

        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_WEBSOCKET_UNAVAILABLE
        )).toBe('reconnect');
      });

      it('should suggest retry for retryable non-connection errors', () => {
        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_TIMEOUT
        )).toBe('retry');

        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe('retry');
      });

      it('should suggest fallback for external/system errors', () => {
        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_AUTHENTICATION_FAILED
        )).toBe('fallback');

        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.INFRASTRUCTURE_FAILURE
        )).toBe('fallback');
      });

      it('should suggest abort for validation errors', () => {
        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe('abort');

        expect(StreamDataFetcherErrorCategories.getRecoveryAction(
          STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM
        )).toBe('abort');
      });
    });

    describe('getSeverityLevel', () => {
      it('should classify validation errors as low severity', () => {
        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe('low');

        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM
        )).toBe('low');
      });

      it('should classify critical business errors as critical', () => {
        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION
        )).toBe('critical');

        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.CLIENT_STATE_CORRUPTION
        )).toBe('critical');
      });

      it('should classify authentication errors as high severity', () => {
        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_AUTHENTICATION_FAILED
        )).toBe('high');

        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.SESSION_EXPIRED
        )).toBe('high');
      });

      it('should classify resource exhaustion as critical', () => {
        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_LEAK_DETECTED
        )).toBe('critical');

        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_POOL_EXHAUSTED
        )).toBe('critical');
      });

      it('should classify infrastructure failures as critical', () => {
        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.INFRASTRUCTURE_FAILURE
        )).toBe('critical');

        expect(StreamDataFetcherErrorCategories.getSeverityLevel(
          STREAM_DATA_FETCHER_ERROR_CODES.SSL_HANDSHAKE_FAILED
        )).toBe('critical');
      });
    });

    describe('requiresImmediateReconnection', () => {
      it('should identify connection failures requiring immediate reconnection', () => {
        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_CONNECTION_FAILED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.NETWORK_CONNECTION_ERROR
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.HEARTBEAT_TIMEOUT
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.SESSION_EXPIRED
        )).toBe(true);
      });

      it('should not require immediate reconnection for non-connection errors', () => {
        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL
        )).toBe(false);

        expect(StreamDataFetcherErrorCategories.requiresImmediateReconnection(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION
        )).toBe(false);
      });
    });

    describe('requiresServiceDegradation', () => {
      it('should identify errors requiring service degradation', () => {
        expect(StreamDataFetcherErrorCategories.requiresServiceDegradation(
          STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_WEBSOCKET_UNAVAILABLE
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresServiceDegradation(
          STREAM_DATA_FETCHER_ERROR_CODES.INFRASTRUCTURE_FAILURE
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresServiceDegradation(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_POOL_EXHAUSTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresServiceDegradation(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresServiceDegradation(
          STREAM_DATA_FETCHER_ERROR_CODES.CPU_OVERLOAD
        )).toBe(true);
      });
    });

    describe('requiresImmediateAlert', () => {
      it('should identify errors requiring immediate alerts', () => {
        expect(StreamDataFetcherErrorCategories.requiresImmediateAlert(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateAlert(
          STREAM_DATA_FETCHER_ERROR_CODES.CLIENT_STATE_CORRUPTION
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateAlert(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_LEAK_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresImmediateAlert(
          STREAM_DATA_FETCHER_ERROR_CODES.INFRASTRUCTURE_FAILURE
        )).toBe(true);
      });
    });

    describe('requiresResourceCleanup', () => {
      it('should identify errors requiring resource cleanup', () => {
        expect(StreamDataFetcherErrorCategories.requiresResourceCleanup(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresResourceCleanup(
          STREAM_DATA_FETCHER_ERROR_CODES.MEMORY_LEAK_DETECTED
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresResourceCleanup(
          STREAM_DATA_FETCHER_ERROR_CODES.STREAM_BUFFER_OVERFLOW
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresResourceCleanup(
          STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_POOL_EXHAUSTED
        )).toBe(true);
      });
    });

    describe('requiresStateRecovery', () => {
      it('should identify errors requiring state recovery', () => {
        expect(StreamDataFetcherErrorCategories.requiresStateRecovery(
          STREAM_DATA_FETCHER_ERROR_CODES.CLIENT_STATE_CORRUPTION
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresStateRecovery(
          STREAM_DATA_FETCHER_ERROR_CODES.RECOVERY_STATE_MISMATCH
        )).toBe(true);

        expect(StreamDataFetcherErrorCategories.requiresStateRecovery(
          STREAM_DATA_FETCHER_ERROR_CODES.CHECKPOINT_VALIDATION_FAILED
        )).toBe(true);
      });
    });
  });

  describe('STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS', () => {
    it('should have descriptions for key error codes', () => {
      expect(STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS[STREAM_DATA_FETCHER_ERROR_CODES.INVALID_WEBSOCKET_URL])
        .toBe('WebSocket URL format is invalid or malformed');

      expect(STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS[STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM])
        .toBe('Required symbols parameter is missing from stream request');

      expect(STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS[STREAM_DATA_FETCHER_ERROR_CODES.CONNECTION_ALREADY_EXISTS])
        .toBe('WebSocket connection already exists for this client');

      expect(STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS[STREAM_DATA_FETCHER_ERROR_CODES.STREAM_DATA_CORRUPTION])
        .toBe('Stream data corruption detected during processing');
    });

    it('should provide meaningful descriptions', () => {
      const descriptions = Object.values(STREAM_DATA_FETCHER_ERROR_DESCRIPTIONS);

      descriptions.forEach(description => {
        expect(description.length).toBeGreaterThan(10);
        expect(description).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });
  });

  describe('Type Safety', () => {
    it('should ensure StreamDataFetcherErrorCode type includes all error codes', () => {
      const errorCodes = Object.values(STREAM_DATA_FETCHER_ERROR_CODES);

      // Type check - this will fail at compile time if types don't match
      errorCodes.forEach((code: StreamDataFetcherErrorCode) => {
        expect(typeof code).toBe('string');
        expect(code.startsWith('STREAM_DATA_FETCHER_')).toBe(true);
      });
    });
  });

  describe('Error Code Completeness', () => {
    it('should have error codes for all major categories', () => {
      const errorCodes = Object.values(STREAM_DATA_FETCHER_ERROR_CODES);

      // Validation category (001-299)
      expect(errorCodes.some(code => code.includes('VALIDATION_0'))).toBe(true);
      expect(errorCodes.some(code => code.includes('VALIDATION_1'))).toBe(true);
      expect(errorCodes.some(code => code.includes('VALIDATION_2'))).toBe(true);

      // Business category (300-599)
      expect(errorCodes.some(code => code.includes('BUSINESS_3'))).toBe(true);
      expect(errorCodes.some(code => code.includes('BUSINESS_4'))).toBe(true);
      expect(errorCodes.some(code => code.includes('BUSINESS_5'))).toBe(true);

      // System category (600-899)
      expect(errorCodes.some(code => code.includes('SYSTEM_6'))).toBe(true);
      expect(errorCodes.some(code => code.includes('SYSTEM_7'))).toBe(true);
      expect(errorCodes.some(code => code.includes('SYSTEM_8'))).toBe(true);

      // External category (900-999)
      expect(errorCodes.some(code => code.includes('EXTERNAL_9'))).toBe(true);
    });
  });
});