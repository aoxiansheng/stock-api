import {
  ENVIRONMENT_DETECTION,
  ENVIRONMENT_FEATURES,
  ENVIRONMENT_RESOURCE_LIMITS,
  EnvironmentConfigManager,
  EnvironmentConfigUtil
} from '@common/constants/application/environment-config.constants';
import { Environment, LogLevel } from '@common/types/enums/shared-base.enum';

describe('Environment Config Constants', () => {
  describe('ENVIRONMENT_DETECTION', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(ENVIRONMENT_DETECTION)).toBe(true);
    });

    it('should have correct identifier mappings', () => {
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.DEVELOPMENT]).toContain('dev');
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.DEVELOPMENT]).toContain('development');
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.DEVELOPMENT]).toContain('local');

      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.TEST]).toContain('test');
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.TEST]).toContain('testing');

      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.STAGING]).toContain('staging');
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.STAGING]).toContain('pre');

      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.PRODUCTION]).toContain('prod');
      expect(ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING[Environment.PRODUCTION]).toContain('production');
    });

    it('should have correct default environment', () => {
      expect(ENVIRONMENT_DETECTION.DEFAULT_ENVIRONMENT).toBe(Environment.DEVELOPMENT);
    });

    it('should have correct detection priority order', () => {
      expect(ENVIRONMENT_DETECTION.DETECTION_PRIORITY).toEqual([
        'NODE_ENV',
        'APP_ENV',
        'DEPLOY_ENV',
        'ENVIRONMENT'
      ]);
    });

    it('should not allow modifications to identifier mappings', () => {
      expect(() => {
        (ENVIRONMENT_DETECTION.IDENTIFIER_MAPPING as any)[Environment.DEVELOPMENT] = ['modified'];
      }).toThrow();
    });
  });

  describe('ENVIRONMENT_FEATURES', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(ENVIRONMENT_FEATURES)).toBe(true);
    });

    it('should have features for all environments', () => {
      expect(ENVIRONMENT_FEATURES).toHaveProperty(Environment.DEVELOPMENT);
      expect(ENVIRONMENT_FEATURES).toHaveProperty(Environment.TEST);
      expect(ENVIRONMENT_FEATURES).toHaveProperty(Environment.STAGING);
      expect(ENVIRONMENT_FEATURES).toHaveProperty(Environment.PRODUCTION);
    });

    describe('development features', () => {
      it('should have DEBUG, PERFORMANCE, DEV_TOOLS, and SECURITY sections', () => {
        const devFeatures = ENVIRONMENT_FEATURES[Environment.DEVELOPMENT];
        expect(devFeatures).toHaveProperty('DEBUG');
        expect(devFeatures).toHaveProperty('PERFORMANCE');
        expect(devFeatures).toHaveProperty('DEV_TOOLS');
        expect(devFeatures).toHaveProperty('SECURITY');
      });
    });

    describe('test environment features', () => {
      it('should have test-appropriate debug settings', () => {
        const testFeatures = ENVIRONMENT_FEATURES[Environment.TEST];
        expect(testFeatures.DEBUG.ENABLE_DEBUG_LOGS).toBe(true);
        expect(testFeatures.DEBUG.ENABLE_VERBOSE_ERRORS).toBe(true);
        expect(testFeatures.DEBUG.ENABLE_REQUEST_LOGGING).toBe(false);
      });

      it('should allow auth skip for testing', () => {
        const testFeatures = ENVIRONMENT_FEATURES[Environment.TEST];
        expect(testFeatures.PERFORMANCE.SKIP_AUTH_FOR_TESTING).toBe(true);
      });

      it('should have relaxed security for testing', () => {
        const testFeatures = ENVIRONMENT_FEATURES[Environment.TEST];
        expect(testFeatures.SECURITY.CORS_ALLOW_ALL).toBe(true);
        expect(testFeatures.SECURITY.DISABLE_CSRF).toBe(true);
      });
    });

    describe('production environment features', () => {
      it('should have all debug features disabled', () => {
        const prodFeatures = ENVIRONMENT_FEATURES[Environment.PRODUCTION];
        expect(prodFeatures.DEBUG.ENABLE_DEBUG_LOGS).toBe(false);
        expect(prodFeatures.DEBUG.ENABLE_VERBOSE_ERRORS).toBe(false);
        expect(prodFeatures.DEBUG.ENABLE_STACK_TRACES).toBe(false);
      });

      it('should have all dev tools disabled', () => {
        const prodFeatures = ENVIRONMENT_FEATURES[Environment.PRODUCTION];
        expect(prodFeatures.DEV_TOOLS.ENABLE_API_DOCS).toBe(false);
        expect(prodFeatures.DEV_TOOLS.ENABLE_SWAGGER_UI).toBe(false);
        expect(prodFeatures.DEV_TOOLS.ENABLE_METRICS_ENDPOINT).toBe(false);
      });

      it('should have strict security settings', () => {
        const prodFeatures = ENVIRONMENT_FEATURES[Environment.PRODUCTION];
        expect(prodFeatures.SECURITY.CORS_ALLOW_ALL).toBe(false);
        expect(prodFeatures.SECURITY.DISABLE_CSRF).toBe(false);
        expect(prodFeatures.SECURITY.ALLOW_HTTP).toBe(false);
      });
    });
  });

  describe('ENVIRONMENT_RESOURCE_LIMITS', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(ENVIRONMENT_RESOURCE_LIMITS)).toBe(true);
    });

    it('should have resource limits for all environments', () => {
      expect(ENVIRONMENT_RESOURCE_LIMITS).toHaveProperty(Environment.DEVELOPMENT);
      expect(ENVIRONMENT_RESOURCE_LIMITS).toHaveProperty(Environment.TEST);
      expect(ENVIRONMENT_RESOURCE_LIMITS).toHaveProperty(Environment.STAGING);
      expect(ENVIRONMENT_RESOURCE_LIMITS).toHaveProperty(Environment.PRODUCTION);
    });

    describe('test environment limits', () => {
      it('should have minimal resource limits for testing', () => {
        const testLimits = ENVIRONMENT_RESOURCE_LIMITS[Environment.TEST];
        expect(testLimits.MEMORY.MAX_HEAP_SIZE_MB).toBe(256);
        expect(testLimits.CPU.MAX_WORKERS).toBe(1);
        expect(testLimits.CPU.MAX_CONCURRENT_REQUESTS).toBe(5);
      });
    });

    describe('production environment limits', () => {
      it('should have appropriate production resource limits', () => {
        const prodLimits = ENVIRONMENT_RESOURCE_LIMITS[Environment.PRODUCTION];
        expect(prodLimits.MEMORY.MAX_HEAP_SIZE_MB).toBe(4096);
        expect(prodLimits.CPU.MAX_WORKERS).toBe(8);
        expect(prodLimits.CPU.MAX_CONCURRENT_REQUESTS).toBe(1000);
        expect(prodLimits.NETWORK.MAX_CONNECTIONS).toBe(1000);
      });

      it('should have longer retention periods', () => {
        const prodLimits = ENVIRONMENT_RESOURCE_LIMITS[Environment.PRODUCTION];
        expect(prodLimits.STORAGE.LOG_RETENTION_DAYS).toBe(90);
      });
    });

    describe('resource limit progression', () => {
      it('should have increasing memory limits from test to production', () => {
        const testMem = ENVIRONMENT_RESOURCE_LIMITS[Environment.TEST].MEMORY.MAX_HEAP_SIZE_MB;
        const stagingMem = ENVIRONMENT_RESOURCE_LIMITS[Environment.STAGING].MEMORY.MAX_HEAP_SIZE_MB;
        const prodMem = ENVIRONMENT_RESOURCE_LIMITS[Environment.PRODUCTION].MEMORY.MAX_HEAP_SIZE_MB;

        expect(testMem).toBeLessThan(stagingMem);
        expect(stagingMem).toBeLessThan(prodMem);
      });
    });
  });

  describe('EnvironmentConfigManager', () => {
    let manager: EnvironmentConfigManager;
    let originalProcessEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalProcessEnv = { ...process.env };
      // Reset singleton instance
      (EnvironmentConfigManager as any).instance = undefined;
    });

    afterEach(() => {
      process.env = originalProcessEnv;
      (EnvironmentConfigManager as any).instance = undefined;
    });

    describe('singleton pattern', () => {
      it('should return the same instance', () => {
        const instance1 = EnvironmentConfigManager.getInstance();
        const instance2 = EnvironmentConfigManager.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('environment detection', () => {
      it('should detect development environment from NODE_ENV', () => {
        process.env.NODE_ENV = 'development';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getCurrentEnvironment()).toBe(Environment.DEVELOPMENT);
      });

      it('should detect production environment from NODE_ENV', () => {
        process.env.NODE_ENV = 'production';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getCurrentEnvironment()).toBe(Environment.PRODUCTION);
      });

      it('should detect test environment from NODE_ENV', () => {
        process.env.NODE_ENV = 'test';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getCurrentEnvironment()).toBe(Environment.TEST);
      });

      it('should use default environment when NODE_ENV is not set', () => {
        delete process.env.NODE_ENV;
        delete process.env.APP_ENV;
        delete process.env.DEPLOY_ENV;
        delete process.env.ENVIRONMENT;
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getCurrentEnvironment()).toBe(Environment.DEVELOPMENT);
      });

      it('should respect detection priority order', () => {
        process.env.NODE_ENV = 'development';
        process.env.APP_ENV = 'production';
        manager = EnvironmentConfigManager.getInstance();
        // NODE_ENV has higher priority
        expect(manager.getCurrentEnvironment()).toBe(Environment.DEVELOPMENT);
      });

      it('should handle environment aliases correctly', () => {
        process.env.NODE_ENV = 'dev';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getCurrentEnvironment()).toBe(Environment.DEVELOPMENT);
      });
    });

    describe('environment checking methods', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
        manager = EnvironmentConfigManager.getInstance();
      });

      it('should correctly identify current environment', () => {
        expect(manager.isEnvironment(Environment.TEST)).toBe(true);
        expect(manager.isEnvironment(Environment.PRODUCTION)).toBe(false);
      });

      it('should have working convenience methods', () => {
        expect(manager.isTesting()).toBe(true);
        expect(manager.isDevelopment()).toBe(false);
        expect(manager.isProduction()).toBe(false);
        expect(manager.isStaging()).toBe(false);
      });
    });

    describe('environment variable handling', () => {
      beforeEach(() => {
        process.env.TEST_VAR = 'test_value';
        process.env.TEST_BOOL_TRUE = 'true';
        process.env.TEST_BOOL_FALSE = 'false';
        process.env.TEST_NUMBER = '42';
        process.env.TEST_INVALID_NUMBER = 'not_a_number';
        manager = EnvironmentConfigManager.getInstance();
      });

      it('should get environment variable values', () => {
        expect(manager.getEnvVariable('TEST_VAR')).toBe('test_value');
        expect(manager.getEnvVariable('NON_EXISTENT')).toBeUndefined();
        expect(manager.getEnvVariable('NON_EXISTENT', 'default')).toBe('default');
      });

      it('should parse boolean environment variables', () => {
        expect(manager.getBooleanEnvVariable('TEST_BOOL_TRUE')).toBe(true);
        expect(manager.getBooleanEnvVariable('TEST_BOOL_FALSE')).toBe(false);
        expect(manager.getBooleanEnvVariable('NON_EXISTENT')).toBe(false);
        expect(manager.getBooleanEnvVariable('NON_EXISTENT', true)).toBe(true);
      });

      it('should parse number environment variables', () => {
        expect(manager.getNumberEnvVariable('TEST_NUMBER')).toBe(42);
        expect(manager.getNumberEnvVariable('TEST_INVALID_NUMBER')).toBe(0);
        expect(manager.getNumberEnvVariable('NON_EXISTENT')).toBe(0);
        expect(manager.getNumberEnvVariable('NON_EXISTENT', 99)).toBe(99);
      });
    });

    describe('feature checking', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
        manager = EnvironmentConfigManager.getInstance();
      });

      it('should check if features are enabled', () => {
        expect(manager.isFeatureEnabled('DEBUG', 'ENABLE_DEBUG_LOGS')).toBe(true);
        expect(manager.isFeatureEnabled('SECURITY', 'CORS_ALLOW_ALL')).toBe(true);
        expect(manager.isFeatureEnabled('INVALID_CATEGORY', 'INVALID_FEATURE')).toBe(false);
      });

      it('should get environment features', () => {
        const features = manager.getEnvironmentFeatures();
        expect(features).toBe(ENVIRONMENT_FEATURES[Environment.TEST]);
      });
    });

    describe('resource limits', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        manager = EnvironmentConfigManager.getInstance();
      });

      it('should get resource limits for current environment', () => {
        const limits = manager.getResourceLimits();
        expect(limits).toBe(ENVIRONMENT_RESOURCE_LIMITS[Environment.PRODUCTION]);
        expect(limits.MEMORY.MAX_HEAP_SIZE_MB).toBe(4096);
      });
    });

    describe('log level recommendation', () => {
      it('should recommend DEBUG for development', () => {
        process.env.NODE_ENV = 'development';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getRecommendedLogLevel()).toBe(LogLevel.DEBUG);
      });

      it('should recommend ERROR for production', () => {
        process.env.NODE_ENV = 'production';
        manager = EnvironmentConfigManager.getInstance();
        expect(manager.getRecommendedLogLevel()).toBe(LogLevel.ERROR);
      });
    });

    describe('configuration validation', () => {
      it('should validate missing NODE_ENV', () => {
        delete process.env.NODE_ENV;
        manager = EnvironmentConfigManager.getInstance();
        const validation = manager.validateEnvironmentConfig();
        expect(validation.valid).toBe(false);
        expect(validation.warnings).toContain('Missing required environment variable: NODE_ENV');
      });

      it('should warn about debug logs in production', () => {
        process.env.NODE_ENV = 'production';
        manager = EnvironmentConfigManager.getInstance();

        // Mock the isFeatureEnabled to return true for debug logs
        jest.spyOn(manager, 'isFeatureEnabled').mockImplementation((category, feature) => {
          if (category === 'DEBUG' && feature === 'ENABLE_DEBUG_LOGS') return true;
          return false;
        });

        const validation = manager.validateEnvironmentConfig();
        expect(validation.warnings).toContain('Debug logs are enabled in production environment');
      });
    });

    describe('configuration summary', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
        manager = EnvironmentConfigManager.getInstance();
      });

      it('should provide complete configuration summary', () => {
        const summary = manager.getConfigSummary();
        expect(summary).toHaveProperty('environment', Environment.TEST);
        expect(summary).toHaveProperty('features');
        expect(summary).toHaveProperty('resourceLimits');
        expect(summary).toHaveProperty('logLevel');
        expect(summary).toHaveProperty('isDevelopment', false);
        expect(summary).toHaveProperty('isProduction', false);
        expect(summary).toHaveProperty('envVariableCount');
      });
    });
  });

  describe('EnvironmentConfigUtil', () => {
    describe('createEnvironmentConfig', () => {
      it('should create config for specific environment', () => {
        const config = EnvironmentConfigUtil.createEnvironmentConfig(Environment.PRODUCTION);
        expect(config.environment).toBe(Environment.PRODUCTION);
        expect(config.features).toBe(ENVIRONMENT_FEATURES[Environment.PRODUCTION]);
        expect(config.resourceLimits).toBe(ENVIRONMENT_RESOURCE_LIMITS[Environment.PRODUCTION]);
      });
    });

    describe('compareEnvironmentConfigs', () => {
      it('should identify differences between environments', () => {
        const differences = EnvironmentConfigUtil.compareEnvironmentConfigs(
          Environment.DEVELOPMENT,
          Environment.PRODUCTION
        );
        expect(differences).toHaveProperty('features');
        expect(differences).toHaveProperty('resourceLimits');
      });
    });

    describe('getEnvironmentMigrationAdvice', () => {
      it('should provide advice for dev to production migration', () => {
        const advice = EnvironmentConfigUtil.getEnvironmentMigrationAdvice(
          Environment.DEVELOPMENT,
          Environment.PRODUCTION
        );
        expect(advice).toContain('禁用所有调试功能');
        expect(advice).toContain('启用安全功能（CORS、CSRF等）');
        expect(advice).toContain('设置适当的日志级别');
      });

      it('should provide advice for test to production migration', () => {
        const advice = EnvironmentConfigUtil.getEnvironmentMigrationAdvice(
          Environment.TEST,
          Environment.PRODUCTION
        );
        expect(advice).toContain('确保认证功能正常启用');
        expect(advice).toContain('调整并发和资源限制');
      });

      it('should provide empty advice for same environment', () => {
        const advice = EnvironmentConfigUtil.getEnvironmentMigrationAdvice(
          Environment.PRODUCTION,
          Environment.PRODUCTION
        );
        expect(advice).toEqual([]);
      });
    });
  });

  describe('Type exports', () => {
    it('should export correct types', () => {
      // Type checking - this will be validated at compile time
      type Features = typeof ENVIRONMENT_FEATURES;
      type Limits = typeof ENVIRONMENT_RESOURCE_LIMITS;

      // Just verify the objects exist and have expected structure
      expect(ENVIRONMENT_FEATURES).toBeDefined();
      expect(ENVIRONMENT_RESOURCE_LIMITS).toBeDefined();
    });
  });
});
