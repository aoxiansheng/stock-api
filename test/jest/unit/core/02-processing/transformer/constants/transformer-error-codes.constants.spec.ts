import {
  TRANSFORMER_ERROR_CODES,
  TransformerErrorCode,
} from '@core/02-processing/transformer/constants/transformer-error-codes.constants';

describe('TransformerErrorCodes', () => {
  describe('TRANSFORMER_ERROR_CODES', () => {
    it('should define all validation error codes (001-299)', () => {
      expect(TRANSFORMER_ERROR_CODES.INVALID_REQUEST_DATA).toBe('TRANSFORMER_VALIDATION_001');
      expect(TRANSFORMER_ERROR_CODES.MISSING_RAW_DATA).toBe('TRANSFORMER_VALIDATION_002');
      expect(TRANSFORMER_ERROR_CODES.INVALID_PROVIDER).toBe('TRANSFORMER_VALIDATION_003');
      expect(TRANSFORMER_ERROR_CODES.INVALID_RULE_TYPE).toBe('TRANSFORMER_VALIDATION_004');
      expect(TRANSFORMER_ERROR_CODES.EMPTY_BATCH_REQUEST).toBe('TRANSFORMER_VALIDATION_005');
      expect(TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED).toBe('TRANSFORMER_VALIDATION_006');
      expect(TRANSFORMER_ERROR_CODES.INVALID_BATCH_FORMAT).toBe('TRANSFORMER_VALIDATION_007');
      expect(TRANSFORMER_ERROR_CODES.INVALID_MAPPING_RULE_ID).toBe('TRANSFORMER_VALIDATION_008');
      expect(TRANSFORMER_ERROR_CODES.INVALID_API_TYPE).toBe('TRANSFORMER_VALIDATION_009');
      expect(TRANSFORMER_ERROR_CODES.MALFORMED_DATA_STRUCTURE).toBe('TRANSFORMER_VALIDATION_010');
    });

    it('should define all business logic error codes (300-599)', () => {
      expect(TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND).toBe('TRANSFORMER_BUSINESS_300');
      expect(TRANSFORMER_ERROR_CODES.TRANSFORMATION_FAILED).toBe('TRANSFORMER_BUSINESS_301');
      expect(TRANSFORMER_ERROR_CODES.BATCH_TRANSFORMATION_FAILED).toBe('TRANSFORMER_BUSINESS_302');
      expect(TRANSFORMER_ERROR_CODES.ALL_TRANSFORMATIONS_FAILED).toBe('TRANSFORMER_BUSINESS_303');
      expect(TRANSFORMER_ERROR_CODES.RULE_APPLICATION_FAILED).toBe('TRANSFORMER_BUSINESS_304');
      expect(TRANSFORMER_ERROR_CODES.DATA_COMPATIBILITY_FAILED).toBe('TRANSFORMER_BUSINESS_305');
      expect(TRANSFORMER_ERROR_CODES.RULE_EXECUTION_FAILED).toBe('TRANSFORMER_BUSINESS_306');
      expect(TRANSFORMER_ERROR_CODES.PARTIAL_TRANSFORMATION_SUCCESS).toBe('TRANSFORMER_BUSINESS_307');
      expect(TRANSFORMER_ERROR_CODES.TRANSFORMATION_STATISTICS_ERROR).toBe('TRANSFORMER_BUSINESS_308');
      expect(TRANSFORMER_ERROR_CODES.RULE_VALIDATION_FAILED).toBe('TRANSFORMER_BUSINESS_309');
    });

    it('should define all system resource error codes (600-899)', () => {
      expect(TRANSFORMER_ERROR_CODES.MAPPING_RULE_LOAD_ERROR).toBe('TRANSFORMER_SYSTEM_600');
      expect(TRANSFORMER_ERROR_CODES.RULE_DOCUMENT_ERROR).toBe('TRANSFORMER_SYSTEM_601');
      expect(TRANSFORMER_ERROR_CODES.PERFORMANCE_THRESHOLD_EXCEEDED).toBe('TRANSFORMER_SYSTEM_602');
      expect(TRANSFORMER_ERROR_CODES.MEMORY_PRESSURE_HIGH).toBe('TRANSFORMER_SYSTEM_603');
      expect(TRANSFORMER_ERROR_CODES.PROCESSING_TIMEOUT).toBe('TRANSFORMER_SYSTEM_604');
      expect(TRANSFORMER_ERROR_CODES.BATCH_PROCESSING_OVERLOAD).toBe('TRANSFORMER_SYSTEM_605');
      expect(TRANSFORMER_ERROR_CODES.RULE_CACHE_ERROR).toBe('TRANSFORMER_SYSTEM_606');
      expect(TRANSFORMER_ERROR_CODES.STATISTICS_CALCULATION_ERROR).toBe('TRANSFORMER_SYSTEM_607');
    });

    it('should define all external dependency error codes (900-999)', () => {
      expect(TRANSFORMER_ERROR_CODES.MAPPING_RULE_SERVICE_ERROR).toBe('TRANSFORMER_EXTERNAL_900');
      expect(TRANSFORMER_ERROR_CODES.FLEXIBLE_MAPPING_SERVICE_ERROR).toBe('TRANSFORMER_EXTERNAL_901');
      expect(TRANSFORMER_ERROR_CODES.RULE_STORAGE_ERROR).toBe('TRANSFORMER_EXTERNAL_902');
      expect(TRANSFORMER_ERROR_CODES.EVENT_BUS_ERROR).toBe('TRANSFORMER_EXTERNAL_903');
      expect(TRANSFORMER_ERROR_CODES.METRICS_COLLECTION_ERROR).toBe('TRANSFORMER_EXTERNAL_904');
      expect(TRANSFORMER_ERROR_CODES.DATABASE_CONNECTION_ERROR).toBe('TRANSFORMER_EXTERNAL_905');
      expect(TRANSFORMER_ERROR_CODES.EXTERNAL_RULE_FETCH_ERROR).toBe('TRANSFORMER_EXTERNAL_906');
    });

    it('should follow the unified error handling system format', () => {
      const allErrorCodes = Object.values(TRANSFORMER_ERROR_CODES);

      allErrorCodes.forEach(errorCode => {
        expect(errorCode).toMatch(/^TRANSFORMER_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d+$/);
      });
    });

    it('should have unique error codes', () => {
      const allErrorCodes = Object.values(TRANSFORMER_ERROR_CODES);
      const uniqueErrorCodes = [...new Set(allErrorCodes)];

      expect(uniqueErrorCodes.length).toBe(allErrorCodes.length);
    });

    it('should maintain proper error code ranges', () => {
      const validationCodes = Object.values(TRANSFORMER_ERROR_CODES)
        .filter(code => (code as string).includes('VALIDATION'))
        .map(code => parseInt((code as string).split('_')[2], 10));

      const businessCodes = Object.values(TRANSFORMER_ERROR_CODES)
        .filter(code => (code as string).includes('BUSINESS'))
        .map(code => parseInt((code as string).split('_')[2], 10));

      const systemCodes = Object.values(TRANSFORMER_ERROR_CODES)
        .filter(code => (code as string).includes('SYSTEM'))
        .map(code => parseInt((code as string).split('_')[2], 10));

      const externalCodes = Object.values(TRANSFORMER_ERROR_CODES)
        .filter(code => (code as string).includes('EXTERNAL'))
        .map(code => parseInt((code as string).split('_')[2], 10));

      validationCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(1);
        expect(code).toBeLessThanOrEqual(299);
      });

      businessCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(300);
        expect(code).toBeLessThanOrEqual(599);
      });

      systemCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(600);
        expect(code).toBeLessThanOrEqual(899);
      });

      externalCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(900);
        expect(code).toBeLessThanOrEqual(999);
      });
    });

    it('should be frozen', () => {
      expect(() => {
        (TRANSFORMER_ERROR_CODES as any).NEW_ERROR = 'TRANSFORMER_TEST_999';
      }).toThrow();
    });
  });

  describe('TransformerErrorCode type', () => {
    it('should properly type all error codes', () => {
      const validationError: TransformerErrorCode = TRANSFORMER_ERROR_CODES.INVALID_REQUEST_DATA;
      const businessError: TransformerErrorCode = TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND;
      const systemError: TransformerErrorCode = TRANSFORMER_ERROR_CODES.MAPPING_RULE_LOAD_ERROR;
      const externalError: TransformerErrorCode = TRANSFORMER_ERROR_CODES.MAPPING_RULE_SERVICE_ERROR;

      expect(validationError).toBeDefined();
      expect(businessError).toBeDefined();
      expect(systemError).toBeDefined();
      expect(externalError).toBeDefined();
    });
  });

  describe('Error Code Categories', () => {
    it('should group validation errors correctly', () => {
      const validationErrors = [
        TRANSFORMER_ERROR_CODES.INVALID_REQUEST_DATA,
        TRANSFORMER_ERROR_CODES.MISSING_RAW_DATA,
        TRANSFORMER_ERROR_CODES.INVALID_PROVIDER,
        TRANSFORMER_ERROR_CODES.INVALID_RULE_TYPE,
        TRANSFORMER_ERROR_CODES.EMPTY_BATCH_REQUEST,
        TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED,
        TRANSFORMER_ERROR_CODES.INVALID_BATCH_FORMAT,
        TRANSFORMER_ERROR_CODES.INVALID_MAPPING_RULE_ID,
        TRANSFORMER_ERROR_CODES.INVALID_API_TYPE,
        TRANSFORMER_ERROR_CODES.MALFORMED_DATA_STRUCTURE,
      ];

      validationErrors.forEach(code => {
        expect(code).toMatch(/^TRANSFORMER_VALIDATION_\d+$/);
      });
    });

    it('should group business logic errors correctly', () => {
      const businessErrors = [
        TRANSFORMER_ERROR_CODES.NO_MAPPING_RULE_FOUND,
        TRANSFORMER_ERROR_CODES.TRANSFORMATION_FAILED,
        TRANSFORMER_ERROR_CODES.BATCH_TRANSFORMATION_FAILED,
        TRANSFORMER_ERROR_CODES.ALL_TRANSFORMATIONS_FAILED,
        TRANSFORMER_ERROR_CODES.RULE_APPLICATION_FAILED,
        TRANSFORMER_ERROR_CODES.DATA_COMPATIBILITY_FAILED,
        TRANSFORMER_ERROR_CODES.RULE_EXECUTION_FAILED,
        TRANSFORMER_ERROR_CODES.PARTIAL_TRANSFORMATION_SUCCESS,
        TRANSFORMER_ERROR_CODES.TRANSFORMATION_STATISTICS_ERROR,
        TRANSFORMER_ERROR_CODES.RULE_VALIDATION_FAILED,
      ];

      businessErrors.forEach(code => {
        expect(code).toMatch(/^TRANSFORMER_BUSINESS_\d+$/);
      });
    });

    it('should group system resource errors correctly', () => {
      const systemErrors = [
        TRANSFORMER_ERROR_CODES.MAPPING_RULE_LOAD_ERROR,
        TRANSFORMER_ERROR_CODES.RULE_DOCUMENT_ERROR,
        TRANSFORMER_ERROR_CODES.PERFORMANCE_THRESHOLD_EXCEEDED,
        TRANSFORMER_ERROR_CODES.MEMORY_PRESSURE_HIGH,
        TRANSFORMER_ERROR_CODES.PROCESSING_TIMEOUT,
        TRANSFORMER_ERROR_CODES.BATCH_PROCESSING_OVERLOAD,
        TRANSFORMER_ERROR_CODES.RULE_CACHE_ERROR,
        TRANSFORMER_ERROR_CODES.STATISTICS_CALCULATION_ERROR,
      ];

      systemErrors.forEach(code => {
        expect(code).toMatch(/^TRANSFORMER_SYSTEM_\d+$/);
      });
    });

    it('should group external dependency errors correctly', () => {
      const externalErrors = [
        TRANSFORMER_ERROR_CODES.MAPPING_RULE_SERVICE_ERROR,
        TRANSFORMER_ERROR_CODES.FLEXIBLE_MAPPING_SERVICE_ERROR,
        TRANSFORMER_ERROR_CODES.RULE_STORAGE_ERROR,
        TRANSFORMER_ERROR_CODES.EVENT_BUS_ERROR,
        TRANSFORMER_ERROR_CODES.METRICS_COLLECTION_ERROR,
        TRANSFORMER_ERROR_CODES.DATABASE_CONNECTION_ERROR,
        TRANSFORMER_ERROR_CODES.EXTERNAL_RULE_FETCH_ERROR,
      ];

      externalErrors.forEach(code => {
        expect(code).toMatch(/^TRANSFORMER_EXTERNAL_\d+$/);
      });
    });
  });
});
