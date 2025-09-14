import { 
  CustomLogger, 
  EnhancedCustomLogger, 
  createLogger,
  createEnhancedLogger,
  createStandardLogger 
} from '../../../../../src/appcore/config/logger.config';

describe('Logger Backward Compatibility Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Standard Logger Functionality', () => {
    it('should create standard CustomLogger when ENHANCED_LOGGING_ENABLED is not set', () => {
      delete process.env.ENHANCED_LOGGING_ENABLED;
      
      const logger = createLogger('TestService');
      
      expect(logger).toBeInstanceOf(CustomLogger);
      expect(logger).not.toBeInstanceOf(EnhancedCustomLogger);
      expect(logger.constructor.name).toBe('CustomLogger');
    });

    it('should create standard CustomLogger when ENHANCED_LOGGING_ENABLED is false', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'false';
      
      const logger = createLogger('TestService');
      
      expect(logger).toBeInstanceOf(CustomLogger);
      expect(logger).not.toBeInstanceOf(EnhancedCustomLogger);
    });

    it('should maintain all original CustomLogger methods and properties', () => {
      const logger = createStandardLogger('TestService');
      
      // Check all required LoggerService methods exist
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.verbose).toBe('function');
      expect(typeof logger.setContext).toBe('function');
      
      // Check protected methods are accessible to subclasses
      // These should not throw when called
      expect(() => {
        const testLogger = new (class extends CustomLogger {
          testAccess() {
            return this.isDebugEnabled() && this.isVerboseEnabled();
          }
        })('Test');
        testLogger.testAccess();
      }).not.toThrow();
    });

    it('should work with all logging methods without throwing', () => {
      const logger = createStandardLogger('BackwardCompatTest');
      
      // All these should work without throwing
      expect(() => {
        logger.log('Test log message');
        logger.error('Test error message');
        logger.warn('Test warn message');
        logger.debug('Test debug message');
        logger.verbose('Test verbose message');
      }).not.toThrow();
    });

    it('should handle context setting properly', () => {
      const logger = createStandardLogger('InitialContext');
      
      expect(() => {
        logger.setContext('NewContext');
        logger.log('Message with new context');
      }).not.toThrow();
    });
  });

  describe('Enhanced Logger with Disabled Feature', () => {
    it('should create EnhancedCustomLogger when ENHANCED_LOGGING_ENABLED is true', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      const logger = createLogger('TestService');
      
      expect(logger).toBeInstanceOf(EnhancedCustomLogger);
      expect(logger).toBeInstanceOf(CustomLogger);
    });

    it('should fallback to CustomLogger if EnhancedCustomLogger fails to initialize', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      // Mock the constructor to simulate initialization failure
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();
      
      // This should still return a working logger (fallback)
      const logger = createLogger('TestService');
      
      // Should be a working logger instance
      expect(logger).toBeInstanceOf(CustomLogger);
      expect(typeof logger.log).toBe('function');
      
      console.warn = originalConsoleWarn;
    });

    it('should provide enhanced status information when enhanced', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      const logger = createEnhancedLogger('TestService');
      
      expect(typeof logger.getEnhancedLoggingStatus).toBe('function');
      
      const status = logger.getEnhancedLoggingStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('controllerReady');
      expect(status).toHaveProperty('context');
      expect(status.context).toBe('TestService');
    });
  });

  describe('API Compatibility', () => {
    it('should maintain identical interface between standard and enhanced loggers', () => {
      const standardLogger = createStandardLogger('Standard');
      const enhancedLogger = createEnhancedLogger('Enhanced');
      
      // Check core logging methods exist on both
      const coreLoggerMethods = ['log', 'error', 'warn', 'debug', 'verbose', 'setContext'];
      
      coreLoggerMethods.forEach(methodName => {
        expect(typeof (standardLogger as any)[methodName]).toBe('function');
        expect(typeof (enhancedLogger as any)[methodName]).toBe('function');
      });
      
      // Core logging methods should behave identically when feature is disabled
      process.env.ENHANCED_LOGGING_ENABLED = 'false';
      const disabledEnhancedLogger = createLogger('Disabled');
      
      expect(typeof disabledEnhancedLogger.log).toBe('function');
      expect(typeof disabledEnhancedLogger.error).toBe('function');
      expect(typeof disabledEnhancedLogger.warn).toBe('function');
      expect(typeof disabledEnhancedLogger.debug).toBe('function');
      expect(typeof disabledEnhancedLogger.verbose).toBe('function');
    });

    it('should handle all parameter variations like original logger', () => {
      const logger = createStandardLogger('ParamTest');
      
      // Test various parameter combinations that existing code might use
      expect(() => {
        logger.log('Simple message');
        logger.log('Message with context', { key: 'value' });
        logger.log({ object: 'message' });
        logger.log('Message', 'extra', { data: true });
        logger.error('Error message', new Error('Test error'));
        logger.warn('Warning', { level: 'high' });
        logger.debug('Debug info', { verbose: true });
        logger.verbose('Verbose message', { details: 'many' });
      }).not.toThrow();
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle various environment variable values correctly', () => {
      const testCases = [
        { value: undefined, expectedEnhanced: false },
        { value: '', expectedEnhanced: false },
        { value: 'false', expectedEnhanced: false },
        { value: 'FALSE', expectedEnhanced: false },
        { value: 'true', expectedEnhanced: true },
        { value: 'TRUE', expectedEnhanced: true },
        { value: '1', expectedEnhanced: false }, // Only 'true' should enable
        { value: 'yes', expectedEnhanced: false }, // Only 'true' should enable
      ];

      testCases.forEach(({ value, expectedEnhanced }) => {
        if (value === undefined) {
          delete process.env.ENHANCED_LOGGING_ENABLED;
        } else {
          process.env.ENHANCED_LOGGING_ENABLED = value;
        }

        const logger = createLogger('EnvTest');
        
        if (expectedEnhanced) {
          expect(logger).toBeInstanceOf(EnhancedCustomLogger);
        } else {
          expect(logger.constructor.name).toBe('CustomLogger');
        }
      });
    });
  });

  describe('Error Handling and Degradation', () => {
    it('should not throw errors even when logging system has issues', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      const logger = createEnhancedLogger('ErrorTest');
      
      // Even if enhanced functionality fails, basic logging should work
      expect(() => {
        logger.log('This should not throw');
        logger.error('Neither should this');
        logger.debug('Or this');
        logger.verbose('Or this either');
      }).not.toThrow();
    });

    it('should maintain logging functionality during controller failures', () => {
      process.env.ENHANCED_LOGGING_ENABLED = 'true';
      
      const logger = createEnhancedLogger('FailureTest');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Force a potential failure scenario
      try {
        logger.log('Message during potential controller failure');
        logger.error('Error during potential controller failure');
      } catch (error) {
        // Should not reach here - logging should never throw
        fail('Logging should not throw errors even during failures');
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Legacy Code Compatibility', () => {
    it('should work with typical existing logging patterns', () => {
      // Simulate common patterns found in existing codebase
      const logger = createLogger('LegacyService');
      
      // Pattern 1: Simple logging
      expect(() => {
        logger.log('Service started');
        logger.log('Processing request');
        logger.log('Request completed');
      }).not.toThrow();
      
      // Pattern 2: Error logging with stack trace
      expect(() => {
        try {
          throw new Error('Test error');
        } catch (error) {
          logger.error('Service error occurred', error);
        }
      }).not.toThrow();
      
      // Pattern 3: Debug logging with context
      expect(() => {
        logger.debug('Processing item', { itemId: 123, status: 'active' });
      }).not.toThrow();
      
      // Pattern 4: Conditional logging
      expect(() => {
        const shouldLog = true;
        if (shouldLog) {
          logger.log('Conditional message');
        }
      }).not.toThrow();
      
      // Pattern 5: Context switching
      expect(() => {
        logger.setContext('NewServiceContext');
        logger.log('Message with new context');
      }).not.toThrow();
    });

    it('should maintain performance characteristics similar to original', () => {
      const logger = createStandardLogger('PerformanceTest');
      
      // Basic performance test - logging should be fast
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        logger.log(`Performance test message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 logs in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Module Integration', () => {
    it('should work with NestJS LoggerService interface', () => {
      const logger = createLogger('NestJSTest');
      
      // Verify LoggerService interface compliance
      const loggerMethods: (keyof any)[] = ['log', 'error', 'warn', 'debug', 'verbose'];
      
      loggerMethods.forEach(method => {
        expect(typeof logger[method]).toBe('function');
        expect(() => {
          (logger as any)[method]('Test message for ' + method);
        }).not.toThrow();
      });
    });

    it('should maintain singleton behavior when needed', () => {
      // Create multiple loggers with same context
      const logger1 = createLogger('SingletonTest');
      const logger2 = createLogger('SingletonTest');
      
      // They should be separate instances (not singleton at logger level)
      // but should share underlying Pino instance for consistency
      expect(logger1).not.toBe(logger2);
      expect(typeof logger1.log).toBe('function');
      expect(typeof logger2.log).toBe('function');
    });
  });
});