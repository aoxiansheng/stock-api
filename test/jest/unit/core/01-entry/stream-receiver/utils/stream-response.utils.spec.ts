import {
  createStreamSuccessResponse,
  createStreamErrorResponse,
  StreamResponses,
  StreamSuccessResponse,
  StreamErrorResponse
} from '@core/01-entry/stream-receiver/utils/stream-response.utils';

// Mock the error codes constants
jest.mock('@core/01-entry/stream-receiver/constants/stream-receiver-error-codes.constants', () => ({
  STREAM_RECEIVER_ERROR_CODES: {
    SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
    UNSUBSCRIBE_FAILED: 'UNSUBSCRIBE_FAILED',
    RECOVERY_REQUEST_FAILED: 'RECOVERY_REQUEST_FAILED',
    RECOVERY_WINDOW_EXCEEDED: 'RECOVERY_WINDOW_EXCEEDED',
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
    SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED'
  }
}));

describe('Stream Response Utils', () => {
  // Mock Date.now to make timestamp testing predictable
  const mockTimestamp = 1640995200000;
  let originalDateNow: any;

  beforeAll(() => {
    originalDateNow = Date.now;
    Date.now = jest.fn(() => mockTimestamp);
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStreamSuccessResponse', () => {
    it('should create success response with message only', () => {
      const message = 'Operation successful';
      const response = createStreamSuccessResponse(message);

      expect(response).toEqual({
        success: true,
        message,
        data: undefined,
        timestamp: mockTimestamp
      });
    });

    it('should create success response with message and data', () => {
      const message = 'Data retrieved';
      const data = { symbols: ['AAPL.US'], count: 1 };
      const response = createStreamSuccessResponse(message, data);

      expect(response).toEqual({
        success: true,
        message,
        data,
        timestamp: mockTimestamp
      });
    });

    it('should handle different data types', () => {
      // String data
      const stringResponse = createStreamSuccessResponse('String data', 'test string');
      expect(stringResponse.data).toBe('test string');

      // Number data
      const numberResponse = createStreamSuccessResponse('Number data', 42);
      expect(numberResponse.data).toBe(42);

      // Array data
      const arrayResponse = createStreamSuccessResponse('Array data', [1, 2, 3]);
      expect(arrayResponse.data).toEqual([1, 2, 3]);

      // Boolean data
      const booleanResponse = createStreamSuccessResponse('Boolean data', true);
      expect(booleanResponse.data).toBe(true);
    });

    it('should create response with current timestamp', () => {
      const response = createStreamSuccessResponse('Test');
      expect(response.timestamp).toBe(mockTimestamp);
      expect(Date.now).toHaveBeenCalled();
    });
  });

  describe('createStreamErrorResponse', () => {
    it('should create error response with required fields', () => {
      const code = 'TEST_ERROR';
      const message = 'Test error occurred';
      const response = createStreamErrorResponse(code, message);

      expect(response).toEqual({
        success: false,
        error: {
          code,
          message,
          details: undefined
        },
        timestamp: mockTimestamp
      });
    });

    it('should create error response with details', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Validation failed';
      const details = { field: 'symbols', value: 'invalid' };
      const response = createStreamErrorResponse(code, message, details);

      expect(response).toEqual({
        success: false,
        error: {
          code,
          message,
          details
        },
        timestamp: mockTimestamp
      });
    });

    it('should handle different detail types', () => {
      // String details
      const stringResponse = createStreamErrorResponse('ERROR', 'Message', 'string detail');
      expect(stringResponse.error.details).toBe('string detail');

      // Object details
      const objectResponse = createStreamErrorResponse('ERROR', 'Message', { key: 'value' });
      expect(objectResponse.error.details).toEqual({ key: 'value' });

      // Array details
      const arrayResponse = createStreamErrorResponse('ERROR', 'Message', ['item1', 'item2']);
      expect(arrayResponse.error.details).toEqual(['item1', 'item2']);
    });
  });

  describe('StreamResponses', () => {
    describe('connected', () => {
      it('should create connection success response', () => {
        const clientId = 'client-123';
        const response = StreamResponses.connected(clientId);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Connection established successfully');
        expect(response.data).toEqual({ clientId });
        expect(response.timestamp).toBe(mockTimestamp);
      });
    });

    describe('subscribeSuccess', () => {
      it('should create subscription success response', () => {
        const symbols = ['AAPL.US', '0700.HK'];
        const wsCapabilityType = 'quote';
        const response = StreamResponses.subscribeSuccess(symbols, wsCapabilityType);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Subscription successful');
        expect(response.data).toEqual({ symbols, wsCapabilityType });
      });

      it('should handle empty symbols array', () => {
        const response = StreamResponses.subscribeSuccess([], 'quote');
        expect(response.data?.symbols).toEqual([]);
      });
    });

    describe('subscribeError', () => {
      it('should create subscription error response', () => {
        const message = 'Invalid symbols provided';
        const symbols = ['INVALID'];
        const response = StreamResponses.subscribeError(message, symbols);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('SUBSCRIPTION_FAILED');
        expect(response.error.message).toBe(message);
        expect(response.error.details).toEqual({ symbols });
      });

      it('should handle error without symbols', () => {
        const message = 'General subscription error';
        const response = StreamResponses.subscribeError(message);

        expect(response.error.details).toEqual({ symbols: undefined });
      });
    });

    describe('unsubscribeSuccess', () => {
      it('should create unsubscription success response', () => {
        const symbols = ['AAPL.US'];
        const response = StreamResponses.unsubscribeSuccess(symbols);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Unsubscription successful');
        expect(response.data).toEqual({ symbols });
      });
    });

    describe('unsubscribeError', () => {
      it('should create unsubscription error response', () => {
        const message = 'Symbols not found in subscription';
        const symbols = ['NONEXISTENT'];
        const response = StreamResponses.unsubscribeError(message, symbols);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('UNSUBSCRIBE_FAILED');
        expect(response.error.message).toBe(message);
        expect(response.error.details).toEqual({ symbols });
      });
    });

    describe('recoveryStarted', () => {
      it('should create recovery started response', () => {
        const symbols = ['AAPL.US', '0700.HK'];
        const estimatedDataPoints = '~500 data points';
        const response = StreamResponses.recoveryStarted(symbols, estimatedDataPoints);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Data recovery started, please wait for data transmission');
        expect(response.data).toEqual({ symbols, estimatedDataPoints });
      });
    });

    describe('recoveryError', () => {
      it('should create recovery error response', () => {
        const type = 'time_range';
        const message = 'Invalid time range for recovery';
        const response = StreamResponses.recoveryError(type, message);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('RECOVERY_REQUEST_FAILED');
        expect(response.error.message).toBe(message);
        expect(response.error.details).toEqual({ type });
      });
    });

    describe('recoveryWindowExceeded', () => {
      it('should create recovery window exceeded response', () => {
        const response = StreamResponses.recoveryWindowExceeded();

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('RECOVERY_WINDOW_EXCEEDED');
        expect(response.error.message).toBe('Recovery time window too large, maximum 24 hours supported');
        expect(response.error.details).toBeUndefined();
      });
    });

    describe('validationError', () => {
      it('should create validation error response without details', () => {
        const message = 'Invalid input format';
        const response = StreamResponses.validationError(message);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('DATA_VALIDATION_FAILED');
        expect(response.error.message).toBe(message);
        expect(response.error.details).toBeUndefined();
      });

      it('should create validation error response with details', () => {
        const message = 'Field validation failed';
        const details = { field: 'symbols', errors: ['required', 'array'] };
        const response = StreamResponses.validationError(message, details);

        expect(response.error.details).toEqual(details);
      });
    });

    describe('statusSuccess', () => {
      it('should create status success response with data', () => {
        const data = {
          activeSubscriptions: 5,
          totalConnections: 10,
          health: 'good'
        };
        const response = StreamResponses.statusSuccess(data);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Status retrieved successfully');
        expect(response.data).toEqual(data);
      });

      it('should handle different data types for status', () => {
        const stringData = 'healthy';
        const response = StreamResponses.statusSuccess(stringData);
        expect(response.data).toBe(stringData);
      });
    });

    describe('statusError', () => {
      it('should create status error response', () => {
        const message = 'Status information not available';
        const response = StreamResponses.statusError(message);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
        expect(response.error.message).toBe(message);
      });
    });

    describe('authenticationError', () => {
      it('should create authentication error response', () => {
        const reason = 'Invalid JWT token';
        const response = StreamResponses.authenticationError(reason);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe('AUTHENTICATION_FAILED');
        expect(response.error.message).toBe('Authentication failed');
        expect(response.error.details).toEqual({ reason });
      });
    });
  });

  describe('response type validation', () => {
    it('should ensure StreamSuccessResponse type compliance', () => {
      const response = createStreamSuccessResponse('test', { data: 'value' });

      // Type assertions to ensure interface compliance
      const successResponse: StreamSuccessResponse = response;
      expect(successResponse.success).toBe(true);
      expect(typeof successResponse.message).toBe('string');
      expect(typeof successResponse.timestamp).toBe('number');
      expect(successResponse.data).toBeDefined();
    });

    it('should ensure StreamErrorResponse type compliance', () => {
      const response = createStreamErrorResponse('CODE', 'message', { detail: 'value' });

      // Type assertions to ensure interface compliance
      const errorResponse: StreamErrorResponse = response;
      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.error.code).toBe('string');
      expect(typeof errorResponse.error.message).toBe('string');
      expect(typeof errorResponse.timestamp).toBe('number');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete subscription workflow', () => {
      const symbols = ['AAPL.US', '0700.HK'];
      const wsCapabilityType = 'quote';
      const clientId = 'client-123';

      // Connection
      const connectionResponse = StreamResponses.connected(clientId);
      expect(connectionResponse.success).toBe(true);

      // Subscription
      const subscriptionResponse = StreamResponses.subscribeSuccess(symbols, wsCapabilityType);
      expect(subscriptionResponse.success).toBe(true);
      expect(subscriptionResponse.data?.symbols).toEqual(symbols);

      // Status check
      const statusData = { active: symbols, count: symbols.length };
      const statusResponse = StreamResponses.statusSuccess(statusData);
      expect(statusResponse.success).toBe(true);

      // Unsubscription
      const unsubResponse = StreamResponses.unsubscribeSuccess(symbols);
      expect(unsubResponse.success).toBe(true);
    });

    it('should handle error workflow scenarios', () => {
      const invalidSymbols = ['INVALID'];

      // Subscription fails
      const subscriptionError = StreamResponses.subscribeError('Invalid symbols', invalidSymbols);
      expect(subscriptionError.success).toBe(false);
      expect(subscriptionError.error.details?.symbols).toEqual(invalidSymbols);

      // Validation error
      const validationError = StreamResponses.validationError('Symbol format invalid', {
        symbols: invalidSymbols,
        format: 'Expected: SYMBOL.MARKET'
      });
      expect(validationError.success).toBe(false);

      // Authentication error
      const authError = StreamResponses.authenticationError('Token expired');
      expect(authError.success).toBe(false);
      expect(authError.error.details?.reason).toBe('Token expired');
    });

    it('should handle recovery workflow', () => {
      const symbols = ['AAPL.US'];
      const estimatedDataPoints = '~100 data points';

      // Recovery started
      const recoveryStarted = StreamResponses.recoveryStarted(symbols, estimatedDataPoints);
      expect(recoveryStarted.success).toBe(true);
      expect(recoveryStarted.data?.symbols).toEqual(symbols);
      expect(recoveryStarted.data?.estimatedDataPoints).toBe(estimatedDataPoints);

      // Recovery error scenarios
      const recoveryError = StreamResponses.recoveryError('invalid_range', 'Time range too large');
      expect(recoveryError.success).toBe(false);

      const windowExceeded = StreamResponses.recoveryWindowExceeded();
      expect(windowExceeded.success).toBe(false);
      expect(windowExceeded.error.message).toContain('24 hours');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty and null values gracefully', () => {
      // Empty string message
      const emptyMessage = createStreamSuccessResponse('');
      expect(emptyMessage.message).toBe('');

      // Null data (should be undefined due to TypeScript)
      const nullDataResponse = createStreamSuccessResponse('test', null);
      expect(nullDataResponse.data).toBeNull();

      // Empty array symbols
      const emptySymbols = StreamResponses.subscribeSuccess([], 'quote');
      expect(emptySymbols.data?.symbols).toEqual([]);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Error: símbol "AAPL.US" não encontrado! @#$%^&*()';
      const response = createStreamErrorResponse('SPECIAL_ERROR', specialMessage);
      expect(response.error.message).toBe(specialMessage);
    });

    it('should handle very long data structures', () => {
      const largeSymbolArray = Array(1000).fill(null).map((_, i) => `STOCK${i}.US`);
      const response = StreamResponses.subscribeSuccess(largeSymbolArray, 'quote');

      expect(response.data?.symbols).toHaveLength(1000);
      expect(response.success).toBe(true);
    });

    it('should handle nested object details', () => {
      const nestedDetails = {
        validation: {
          symbols: {
            errors: ['format', 'market'],
            values: ['INVALID1', 'INVALID2']
          }
        },
        suggestions: ['Use format: SYMBOL.MARKET']
      };

      const response = StreamResponses.validationError('Complex validation error', nestedDetails);
      expect(response.error.details).toEqual(nestedDetails);
    });
  });

  describe('performance considerations', () => {
    it('should create responses efficiently for large batches', () => {
      const startTime = Date.now();

      // Create 1000 responses
      const responses = [];
      for (let i = 0; i < 1000; i++) {
        responses.push(createStreamSuccessResponse(`Message ${i}`, { index: i }));
      }

      const endTime = Date.now();
      expect(responses).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should handle concurrent response creation', () => {
      const promises = Array(100).fill(null).map((_, i) =>
        Promise.resolve(StreamResponses.subscribeSuccess([`STOCK${i}.US`], 'quote'))
      );

      return Promise.all(promises).then(responses => {
        expect(responses).toHaveLength(100);
        responses.forEach((response, index) => {
          expect(response.success).toBe(true);
          expect(response.data?.symbols).toEqual([`STOCK${index}.US`]);
        });
      });
    });
  });
});