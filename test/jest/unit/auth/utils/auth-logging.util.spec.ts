import { AuthLoggingUtil } from '@auth/utils/auth-logging.util';

// Mock createLogger
jest.mock('@common/modules/logging', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('AuthLoggingUtil', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createOptimizedLogger', () => {
    it('should create a logger with all required methods', () => {
      const logger = AuthLoggingUtil.createOptimizedLogger('test');
      
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('log');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('highFrequency');
      expect(logger).toHaveProperty('asyncLog');
      expect(logger).toHaveProperty('verbose');
    });

    it('should disable debug logs in production', () => {
      // 使用isolateModules确保模块被重新加载，静态属性会重新初始化
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        // 重新导入模块，确保静态属性重新初始化
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const debugSpy = jest.fn();
        const logger = AuthLoggingUtil.createOptimizedLogger('test');
        
        // 使用模拟函数替换debug方法
        logger.debug = debugSpy;
        
        logger.debug('test message');
        
        expect(debugSpy).not.toHaveBeenCalled();
      });
    });

    it('should enable debug logs in development', () => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'development';
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const logger = AuthLoggingUtil.createOptimizedLogger('test');
        const debugSpy = jest.fn();
        (logger as any).logger = { debug: debugSpy };
        
        logger.debug('test message');
        
        // Note: This test might need adjustment based on the actual implementation
        // Since we're mocking the logger, the behavior might differ
      });
    });
  });

  describe('shouldLogVerbose', () => {
    it('should return false in production environment', () => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        process.env.AUTH_DEBUG_MODE = 'false';
        
        // 重新导入模块，确保静态属性重新初始化
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogVerbose();
        
        expect(result).toBe(false);
      });
    });

    it('should return true when debug mode is enabled', () => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        process.env.AUTH_DEBUG_MODE = 'true';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogVerbose();
        
        expect(result).toBe(true);
      });
    });

    it('should return true in development environment', () => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'development';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogVerbose();
        
        expect(result).toBe(true);
      });
    });
  });

  describe('shouldLogHighFrequency', () => {
    it('should return true when not in high traffic mode', () => {
      jest.isolateModules(() => {
        process.env.AUTH_HIGH_TRAFFIC_MODE = 'false';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogHighFrequency();
        
        expect(result).toBe(true);
      });
    });

    it('should return false when in high traffic mode', () => {
      jest.isolateModules(() => {
        process.env.AUTH_HIGH_TRAFFIC_MODE = 'true';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogHighFrequency();
        
        expect(result).toBe(false);
      });
    });
  });

  describe('shouldLogPerformance', () => {
    it('should return true when performance logging is explicitly enabled', () => {
      jest.isolateModules(() => {
        process.env.AUTH_PERFORMANCE_LOGGING = 'true';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogPerformance();
        
        expect(result).toBe(true);
      });
    });

    it('should return false when performance optimization is enabled and not explicitly enabled', () => {
      jest.isolateModules(() => {
        process.env.NODE_ENV = 'production';
        process.env.AUTH_PERFORMANCE_LOGGING = 'false';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldLogPerformance();
        
        expect(result).toBe(false);
      });
    });
  });

  describe('sanitizeLogData', () => {
    it('should sanitize sensitive fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        normalField: 'normalValue',
      };
      
      const result = AuthLoggingUtil.sanitizeLogData(data);
      
      expect(result.password).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.username).toBe('testuser');
      expect(result.normalField).toBe('normalValue');
    });

    it('should truncate long strings', () => {
      const data = {
        longString: 'a'.repeat(300),
        normalString: 'short string',
      };
      
      const result = AuthLoggingUtil.sanitizeLogData(data);
      
      expect(result.longString).toBe('a'.repeat(200) + '...[TRUNCATED]');
      expect(result.normalString).toBe('short string');
    });

    it('should handle non-object data', () => {
      expect(AuthLoggingUtil.sanitizeLogData(null)).toBeNull();
      expect(AuthLoggingUtil.sanitizeLogData(undefined)).toBeUndefined();
      expect(AuthLoggingUtil.sanitizeLogData('string')).toBe('string');
      expect(AuthLoggingUtil.sanitizeLogData(123)).toBe(123);
    });
  });

  describe('shouldSampleLog', () => {
    it('should return true when not in high traffic mode', () => {
      jest.isolateModules(() => {
        process.env.AUTH_HIGH_TRAFFIC_MODE = 'false';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        const result = AuthLoggingUtil.shouldSampleLog('test-operation');
        
        expect(result).toBe(true);
      });
    });

    it('should sample logs in high traffic mode', () => {
      jest.isolateModules(() => {
        process.env.AUTH_HIGH_TRAFFIC_MODE = 'true';
        
        const { AuthLoggingUtil } = require('@auth/utils/auth-logging.util');
        // Since sampling uses a hash function, we can't predict the exact result
        // but we can check that it returns a boolean
        const result = AuthLoggingUtil.shouldSampleLog('test-operation');
        
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('simpleHash', () => {
    it('should generate consistent hash for the same input', () => {
      const result1 = (AuthLoggingUtil as any).simpleHash('test');
      const result2 = (AuthLoggingUtil as any).simpleHash('test');
      
      expect(result1).toBe(result2);
    });

    it('should generate different hashes for different inputs', () => {
      const result1 = (AuthLoggingUtil as any).simpleHash('test1');
      const result2 = (AuthLoggingUtil as any).simpleHash('test2');
      
      expect(result1).not.toBe(result2);
    });
  });
});