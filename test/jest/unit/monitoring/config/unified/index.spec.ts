/**
 * Monitoring Unified Configuration Index Unit Tests
 * 测试监控统一配置模块的完整性和导出正确性
 */

import {
  // TTL Configuration
  MonitoringUnifiedTtlConfig,
  MonitoringUnifiedTtl,
  MonitoringTtlUtils,
  TtlDataType,
  EnvironmentType,

  // Limits Configuration
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  DataCleanupBatchConfig,
  SystemLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MonitoringLimitsUtils,
  BatchSizeType,
  ProcessingType,

  // Core Environment Configuration
  MonitoringCoreEnvConfig,
  MonitoringCoreEnvUtils,
  monitoringCoreEnvConfig,
  MonitoringCoreEnvType,
} from '@monitoring/config/unified';

describe('Monitoring Unified Configuration Module', () => {
  describe('TTL Configuration Exports', () => {
    it('should export MonitoringUnifiedTtlConfig class', () => {
      expect(MonitoringUnifiedTtlConfig).toBeDefined();
      expect(typeof MonitoringUnifiedTtlConfig).toBe('function');

      const instance = new MonitoringUnifiedTtlConfig();
      expect(instance).toBeInstanceOf(MonitoringUnifiedTtlConfig);
      expect(instance.health).toBe(300);
      expect(instance.trend).toBe(600);
    });

    it('should export MonitoringUnifiedTtl factory function', () => {
      expect(MonitoringUnifiedTtl).toBeDefined();
      expect(typeof MonitoringUnifiedTtl).toBe('function');

      const config = MonitoringUnifiedTtl();
      expect(config).toBeInstanceOf(MonitoringUnifiedTtlConfig);
    });

    it('should export MonitoringTtlUtils utility class', () => {
      expect(MonitoringTtlUtils).toBeDefined();
      expect(typeof MonitoringTtlUtils).toBe('function');
      expect(typeof MonitoringTtlUtils.secondsToMs).toBe('function');
      expect(typeof MonitoringTtlUtils.isValidTtl).toBe('function');
    });

    it('should export TtlDataType and EnvironmentType types', () => {
      // Type checking occurs at compile time
      const validTtlTypes: TtlDataType[] = ['health', 'trend', 'performance', 'alert', 'cacheStats'];
      const validEnvTypes: EnvironmentType[] = ['development', 'test', 'production'];

      expect(validTtlTypes).toHaveLength(5);
      expect(validEnvTypes).toHaveLength(3);
    });
  });

  describe('Limits Configuration Exports', () => {
    it('should export MonitoringUnifiedLimitsConfig class', () => {
      expect(MonitoringUnifiedLimitsConfig).toBeDefined();
      expect(typeof MonitoringUnifiedLimitsConfig).toBe('function');

      const instance = new MonitoringUnifiedLimitsConfig();
      expect(instance).toBeInstanceOf(MonitoringUnifiedLimitsConfig);
      expect(instance.alertBatch).toBeDefined();
      expect(instance.dataProcessingBatch).toBeDefined();
    });

    it('should export batch configuration classes', () => {
      expect(AlertBatchConfig).toBeDefined();
      expect(DataProcessingBatchConfig).toBeDefined();
      expect(DataCleanupBatchConfig).toBeDefined();
      expect(SystemLimitsConfig).toBeDefined();

      const alertBatch = new AlertBatchConfig();
      const dataProcessing = new DataProcessingBatchConfig();
      const dataCleanup = new DataCleanupBatchConfig();
      const systemLimits = new SystemLimitsConfig();

      expect(alertBatch).toBeInstanceOf(AlertBatchConfig);
      expect(dataProcessing).toBeInstanceOf(DataProcessingBatchConfig);
      expect(dataCleanup).toBeInstanceOf(DataCleanupBatchConfig);
      expect(systemLimits).toBeInstanceOf(SystemLimitsConfig);
    });

    it('should export monitoringUnifiedLimitsConfig factory function', () => {
      expect(monitoringUnifiedLimitsConfig).toBeDefined();
      expect(typeof monitoringUnifiedLimitsConfig).toBe('function');

      const config = monitoringUnifiedLimitsConfig();
      expect(config).toBeInstanceOf(MonitoringUnifiedLimitsConfig);
    });

    it('should export MonitoringLimitsUtils utility class', () => {
      expect(MonitoringLimitsUtils).toBeDefined();
      expect(typeof MonitoringLimitsUtils).toBe('function');
      expect(typeof MonitoringLimitsUtils.selectBatchSize).toBe('function');
      expect(typeof MonitoringLimitsUtils.calculateBatchCount).toBe('function');
    });

    it('should export BatchSizeType and ProcessingType types', () => {
      // Type checking occurs at compile time
      const validBatchTypes: BatchSizeType[] = ['small', 'medium', 'large'];
      const validProcessingTypes: ProcessingType[] = ['alert', 'data', 'cleanup', 'analysis'];

      expect(validBatchTypes).toHaveLength(3);
      expect(validProcessingTypes).toHaveLength(3);
    });
  });

  describe('Core Environment Configuration Exports', () => {
    it('should export MonitoringCoreEnvConfig class', () => {
      expect(MonitoringCoreEnvConfig).toBeDefined();
      expect(typeof MonitoringCoreEnvConfig).toBe('function');

      const instance = new MonitoringCoreEnvConfig();
      expect(instance).toBeInstanceOf(MonitoringCoreEnvConfig);
    });

    it('should export monitoringCoreEnvConfig factory function', () => {
      expect(monitoringCoreEnvConfig).toBeDefined();
      expect(typeof monitoringCoreEnvConfig).toBe('function');

      const config = monitoringCoreEnvConfig();
      expect(config).toBeInstanceOf(MonitoringCoreEnvConfig);
    });

    it('should export MonitoringCoreEnvUtils utility class', () => {
      expect(MonitoringCoreEnvUtils).toBeDefined();
      expect(typeof MonitoringCoreEnvUtils).toBe('function');
    });

    it('should export MonitoringCoreEnvType type', () => {
      // Type checking occurs at compile time - this test validates export exists
      const envType: MonitoringCoreEnvType = new MonitoringCoreEnvConfig();
      expect(typeof envType).toBe('object');
      expect(envType.defaultTtl).toBeDefined();
      expect(envType.defaultBatchSize).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should allow all configurations to work together', () => {
      const ttlConfig = new MonitoringUnifiedTtlConfig();
      const limitsConfig = new MonitoringUnifiedLimitsConfig();
      const coreEnvConfig = new MonitoringCoreEnvConfig();

      expect(ttlConfig.health).toBeGreaterThan(0);
      expect(limitsConfig.alertBatch.small).toBeGreaterThan(0);
      expect(coreEnvConfig).toBeDefined();
    });

    it('should provide utility functions for configuration management', () => {
      expect(MonitoringTtlUtils.isValidTtl).toBeDefined();
      expect(MonitoringLimitsUtils.selectBatchSize).toBeDefined();
      expect(MonitoringCoreEnvUtils).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for configuration objects', () => {
      const ttlConfig = new MonitoringUnifiedTtlConfig();
      const limitsConfig = new MonitoringUnifiedLimitsConfig();

      // These should be numbers
      expect(typeof ttlConfig.health).toBe('number');
      expect(typeof ttlConfig.trend).toBe('number');
      expect(typeof limitsConfig.alertBatch.small).toBe('number');
      expect(typeof limitsConfig.alertBatch.medium).toBe('number');
    });

    it('should provide proper TypeScript type definitions', () => {
      // Test that types are properly exported and usable
      const validateTtlType = (type: TtlDataType): boolean => {
        return ['health', 'trend', 'performance', 'alert', 'cacheStats'].includes(type);
      };

      const validateEnvType = (env: EnvironmentType): boolean => {
        return ['development', 'test', 'production'].includes(env);
      };

      expect(validateTtlType('health')).toBe(true);
      expect(validateEnvType('development')).toBe(true);
    });
  });
});