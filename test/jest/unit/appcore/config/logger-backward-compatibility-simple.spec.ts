import { 
  CustomLogger, 
  EnhancedCustomLogger, 
  createLogger,
  createEnhancedLogger,
  createStandardLogger 
} from '../../../../../src/appcore/config/logger.config';

describe('Logger Backward Compatibility - Simple Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Basic Functionality', () => {
    it('should create standard logger when enhanced logging is disabled', () => {
      delete process.env.ENHANCED_LOGGING_ENABLED;
      
      const logger = createLogger('TestService');
      expect(logger).toBeInstanceOf(CustomLogger);
      expect(logger.constructor.name).toBe('CustomLogger');
    });

    it('should create enhanced logger when enhanced logging is enabled', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      const logger = createLogger('TestService');
      expect(logger).toBeInstanceOf(EnhancedCustomLogger);
      expect(logger).toBeInstanceOf(CustomLogger); // Should inherit from CustomLogger
    });

    it('should provide working logging methods in all cases', () => {
      const standardLogger = createStandardLogger('Standard');
      const enhancedLogger = createEnhancedLogger('Enhanced');
      
      // All these should not throw
      expect(() => {
        standardLogger.log('Standard log');
        standardLogger.error('Standard error');
        standardLogger.warn('Standard warn');
        standardLogger.debug('Standard debug');
        standardLogger.verbose('Standard verbose');
        
        enhancedLogger.log('Enhanced log');
        enhancedLogger.error('Enhanced error');
        enhancedLogger.warn('Enhanced warn');
        enhancedLogger.debug('Enhanced debug');
        enhancedLogger.verbose('Enhanced verbose');
      }).not.toThrow();
    });

    it('should handle context setting', () => {
      const logger = createStandardLogger('InitialContext');
      
      expect(() => {
        logger.setContext('NewContext');
        logger.log('Message with new context');
      }).not.toThrow();
    });

    it('should work with various parameter types', () => {
      const logger = createStandardLogger('ParamTest');
      
      expect(() => {
        logger.log('Simple string');
        logger.log({ object: 'data' });
        logger.log('String with object', { context: 'test' });
        logger.error('Error with error object', new Error('Test error'));
        logger.debug('Debug with multiple params', 'param1', { param2: 'value' });
      }).not.toThrow();
    });
  });

  describe('Environment Variable Handling', () => {
    const testCases = [
      { value: undefined, description: 'undefined' },
      { value: '', description: 'empty string' },
      { value: 'false', description: 'false string' },
      { value: 'true', description: 'true string' },
    ];

    testCases.forEach(({ value, description }) => {
      it(`should handle ENHANCED_LOGGING_ENABLED = ${description}`, () => {
        if (value === undefined) {
          delete process.env.ENHANCED_LOGGING_ENABLED;
        } else {
          process.env.ENHANCED_LOGGING_ENABLED = value;
        }

        const logger = createLogger('EnvTest');
        
        // Should always create a working logger
        expect(logger).toBeInstanceOf(CustomLogger);
        expect(typeof logger.log).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.verbose).toBe('function');
        
        // Should not throw when used
        expect(() => {
          logger.log('Test message');
          logger.error('Test error');
        }).not.toThrow();
      });
    });
  });

  describe('Enhanced Logger Features', () => {
    it('should provide enhanced status when enhanced', () => {
      const enhancedLogger = createEnhancedLogger('Enhanced');
      
      expect(typeof enhancedLogger.getEnhancedLoggingStatus).toBe('function');
      
      const status = enhancedLogger.getEnhancedLoggingStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('controllerReady');
      expect(status).toHaveProperty('context');
      expect(status.context).toBe('Enhanced');
    });

    it('should not have enhanced methods on standard logger', () => {
      const standardLogger = createStandardLogger('Standard');
      
      // Standard logger should not have enhanced-specific methods
      // Check by attempting to call and expecting it to be undefined
      const hasEnhancedMethod = 'getEnhancedLoggingStatus' in standardLogger;
      expect(hasEnhancedMethod).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle logging gracefully even with potential errors', () => {
      const logger = createEnhancedLogger('ErrorTest');
      
      // These should never throw, even if internal errors occur
      expect(() => {
        logger.log('Message 1');
        logger.error('Error message');
        logger.debug('Debug message');
        logger.verbose('Verbose message');
      }).not.toThrow();
    });

    it('should fallback gracefully when enhanced logger fails', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      // Even if there are issues, should still create a working logger
      const logger = createLogger('FallbackTest');
      
      expect(logger).toBeInstanceOf(CustomLogger);
      expect(() => {
        logger.log('Fallback message');
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not significantly impact logging performance', () => {
      const standardLogger = createStandardLogger('PerfStandard');
      const enhancedLogger = createEnhancedLogger('PerfEnhanced');
      
      const iterations = 100;
      
      // Test standard logger
      const standardStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        standardLogger.log(`Standard message ${i}`);
      }
      const standardTime = Date.now() - standardStart;
      
      // Test enhanced logger
      const enhancedStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        enhancedLogger.log(`Enhanced message ${i}`);
      }
      const enhancedTime = Date.now() - enhancedStart;
      
      // Both should complete in reasonable time (less than 100ms each)
      expect(standardTime).toBeLessThan(100);
      expect(enhancedTime).toBeLessThan(100);
    });
  });

  describe('Integration Compatibility', () => {
    it('should work as drop-in replacement', () => {
      // Simulate existing code patterns that should continue working
      delete process.env.ENHANCED_LOGGING_ENABLED;
      
      // Pattern 1: Service initialization
      const serviceLogger = createLogger('MyService');
      serviceLogger.log('Service initialized');
      
      // Pattern 2: Error handling
      try {
        throw new Error('Simulated error');
      } catch (error) {
        serviceLogger.error('Service error occurred', error);
      }
      
      // Pattern 3: Debug logging
      const debugData = { userId: 123, action: 'login' };
      serviceLogger.debug('User action', debugData);
      
      // Pattern 4: Context switching
      serviceLogger.setContext('NewContext');
      serviceLogger.log('Context changed');
      
      // All of the above should work without throwing
      expect(true).toBe(true); // Test passes if no exceptions thrown
    });
  });
});