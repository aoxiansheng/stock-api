import {
  SUPPORTED_CAPABILITY_TYPES,
  RECEIVER_OPERATIONS,
  RECEIVER_STATUS,
  RECEIVER_EVENTS,
  RECEIVER_METRICS,
} from '@core/01-entry/receiver/constants/operations.constants';

describe('Receiver Operations Constants', () => {
  describe('SUPPORTED_CAPABILITY_TYPES', () => {
    it('should be defined and frozen', () => {
      expect(SUPPORTED_CAPABILITY_TYPES).toBeDefined();
      expect(Object.isFrozen(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
    });

    it('should contain expected capability types', () => {
      expect(SUPPORTED_CAPABILITY_TYPES).toContain('get-stock-quote');
      expect(SUPPORTED_CAPABILITY_TYPES).toContain('get-stock-basic-info');
      expect(SUPPORTED_CAPABILITY_TYPES).toContain('get-index-quote');
      expect(SUPPORTED_CAPABILITY_TYPES).toContain('get-market-status');
    });

    it('should be an array', () => {
      expect(Array.isArray(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
    });

    it('should contain only strings', () => {
      SUPPORTED_CAPABILITY_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should not contain duplicates', () => {
      const uniqueTypes = [...new Set(SUPPORTED_CAPABILITY_TYPES)];
      expect(uniqueTypes).toHaveLength(SUPPORTED_CAPABILITY_TYPES.length);
    });
  });

  describe('RECEIVER_OPERATIONS', () => {
    it('should be defined and frozen', () => {
      expect(RECEIVER_OPERATIONS).toBeDefined();
      expect(Object.isFrozen(RECEIVER_OPERATIONS)).toBe(true);
    });

    it('should contain expected operation keys', () => {
      const expectedKeys = [
        'HANDLE_REQUEST',
        'VALIDATE_REQUEST',
        'DETERMINE_PROVIDER',
        'VALIDATE_PREFERRED_PROVIDER',
        'TRANSFORM_SYMBOLS',
        'EXECUTE_DATA_FETCHING',
        'RECORD_PERFORMANCE',
        'INFER_MARKET',
        'GET_MARKET_FROM_SYMBOL',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_OPERATIONS).toHaveProperty(key);
      });
    });

    it('should have correct operation values', () => {
      expect(RECEIVER_OPERATIONS.HANDLE_REQUEST).toBe('handleRequest');
      expect(RECEIVER_OPERATIONS.VALIDATE_REQUEST).toBe('validateRequest');
      expect(RECEIVER_OPERATIONS.DETERMINE_PROVIDER).toBe('determineOptimalProvider');
      expect(RECEIVER_OPERATIONS.VALIDATE_PREFERRED_PROVIDER).toBe('validatePreferredProvider');
    });

    it('should contain only string values', () => {
      Object.values(RECEIVER_OPERATIONS).forEach(operation => {
        expect(typeof operation).toBe('string');
        expect(operation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('RECEIVER_STATUS', () => {
    it('should be defined and frozen', () => {
      expect(RECEIVER_STATUS).toBeDefined();
      expect(Object.isFrozen(RECEIVER_STATUS)).toBe(true);
    });

    it('should contain expected status keys', () => {
      const expectedKeys = [
        'PENDING',
        'VALIDATING',
        'SELECTING_PROVIDER',
        'TRANSFORMING_SYMBOLS',
        'FETCHING_DATA',
        'SUCCESS',
        'FAILED',
        'TIMEOUT',
        'CANCELLED',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_STATUS).toHaveProperty(key);
      });
    });

    it('should have meaningful status values', () => {
      expect(RECEIVER_STATUS.VALIDATING).toBe('validating');
      expect(RECEIVER_STATUS.SELECTING_PROVIDER).toBe('selecting_provider');
      expect(RECEIVER_STATUS.SUCCESS).toBe('success');
      expect(RECEIVER_STATUS.FAILED).toBe('failed');
    });
  });

  describe('RECEIVER_EVENTS', () => {
    it('should be defined and frozen', () => {
      expect(RECEIVER_EVENTS).toBeDefined();
      expect(Object.isFrozen(RECEIVER_EVENTS)).toBe(true);
    });

    it('should have consistent event naming pattern', () => {
      Object.values(RECEIVER_EVENTS).forEach(event => {
        expect(event).toMatch(/^receiver\./);
        expect(event.split('.').length).toBe(2);
      });
    });

    it('should have correct event values', () => {
      expect(RECEIVER_EVENTS.REQUEST_RECEIVED).toBe('receiver.request_received');
      expect(RECEIVER_EVENTS.VALIDATION_COMPLETED).toBe('receiver.validation_completed');
      expect(RECEIVER_EVENTS.DATA_FETCHED).toBe('receiver.data_fetched');
    });
  });

  describe('RECEIVER_METRICS', () => {
    it('should be defined and frozen', () => {
      expect(RECEIVER_METRICS).toBeDefined();
      expect(Object.isFrozen(RECEIVER_METRICS)).toBe(true);
    });

    it('should have consistent metric naming pattern', () => {
      Object.values(RECEIVER_METRICS).forEach(metric => {
        expect(metric).toMatch(/^receiver_/);
        expect(metric).toMatch(/^[a-z_]+$/);
      });
    });

    it('should have correct metric values', () => {
      expect(RECEIVER_METRICS.REQUESTS_TOTAL).toBe('receiver_requests_total');
      expect(RECEIVER_METRICS.REQUEST_DURATION).toBe('receiver_request_duration');
      expect(RECEIVER_METRICS.SUCCESS_RATE).toBe('receiver_success_rate');
    });
  });
});