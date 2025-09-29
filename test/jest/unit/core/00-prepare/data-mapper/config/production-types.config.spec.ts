import {
  getProductionTypeConfig,
  isProductionReady,
  getSupportedEndpoints,
  getFallbackType,
  getProductionReadyTypes,
  validateProductionTypeRegistry,
  ProductionSupportLevel,
  RiskLevel,
  ProductionTypeConfig,
  PRODUCTION_TYPE_REGISTRY,
} from '../../../../../../../src/core/00-prepare/data-mapper/config/production-types.config';
import { RuleListType } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';

describe('Production Types Config', () => {
  describe('Enums', () => {
    describe('ProductionSupportLevel', () => {
      it('should have correct production support level values', () => {
        expect(ProductionSupportLevel.PRODUCTION).toBe('production');
        expect(ProductionSupportLevel.EXPERIMENTAL).toBe('experimental');
        expect(ProductionSupportLevel.DEPRECATED).toBe('deprecated');
      });

      it('should have all required support levels', () => {
        const values = Object.values(ProductionSupportLevel);
        expect(values).toHaveLength(3);
        expect(values).toEqual(['production', 'experimental', 'deprecated']);
      });
    });

    describe('RiskLevel', () => {
      it('should have correct risk level values', () => {
        expect(RiskLevel.LOW).toBe('low');
        expect(RiskLevel.MEDIUM).toBe('medium');
        expect(RiskLevel.HIGH).toBe('high');
      });

      it('should have all required risk levels', () => {
        const values = Object.values(RiskLevel);
        expect(values).toHaveLength(3);
        expect(values).toEqual(['low', 'medium', 'high']);
      });
    });
  });

  describe('PRODUCTION_TYPE_REGISTRY', () => {
    it('should contain all expected rule types', () => {
      const expectedTypes = ['quote_fields', 'basic_info_fields', 'index_fields'];
      const registryTypes = Object.keys(PRODUCTION_TYPE_REGISTRY);

      expectedTypes.forEach(type => {
        expect(registryTypes).toContain(type);
      });
    });

    it('should have valid configuration for quote_fields', () => {
      const config = PRODUCTION_TYPE_REGISTRY.quote_fields;

      expect(config.type).toBe('quote_fields');
      expect(config.supportLevel).toBe(ProductionSupportLevel.PRODUCTION);
      expect(config.endpoints).toEqual(['get-stock-realtime', 'get-stock-history']);
      expect(config.riskLevel).toBe(RiskLevel.LOW);
      expect(config.description).toBe('股票实时和历史行情数据');
      expect(config.enabled).toBe(true);
      expect(config.maxConcurrency).toBe(100);
      expect(config.performanceProfile.avgResponseTime).toBe(50);
      expect(config.performanceProfile.cacheHitRate).toBe(0.95);
      expect(config.performanceProfile.memoryUsage).toBe(10);
    });

    it('should have valid configuration for basic_info_fields', () => {
      const config = PRODUCTION_TYPE_REGISTRY.basic_info_fields;

      expect(config.type).toBe('basic_info_fields');
      expect(config.supportLevel).toBe(ProductionSupportLevel.PRODUCTION);
      expect(config.endpoints).toEqual(['get-stock-basic-info']);
      expect(config.riskLevel).toBe(RiskLevel.LOW);
      expect(config.description).toBe('股票基础信息数据');
      expect(config.enabled).toBe(true);
      expect(config.maxConcurrency).toBe(50);
      expect(config.performanceProfile.avgResponseTime).toBe(30);
      expect(config.performanceProfile.cacheHitRate).toBe(0.98);
      expect(config.performanceProfile.memoryUsage).toBe(5);
    });

    it('should have valid configuration for index_fields', () => {
      const config = PRODUCTION_TYPE_REGISTRY.index_fields;

      expect(config.type).toBe('index_fields');
      expect(config.supportLevel).toBe(ProductionSupportLevel.PRODUCTION);
      expect(config.endpoints).toEqual(['get-index-quote']);
      expect(config.riskLevel).toBe(RiskLevel.LOW);
      expect(config.description).toBe('指数行情数据');
      expect(config.fallbackType).toBe('quote_fields');
      expect(config.enabled).toBe(true);
      expect(config.maxConcurrency).toBe(30);
      expect(config.performanceProfile.avgResponseTime).toBe(80);
      expect(config.performanceProfile.cacheHitRate).toBe(0.85);
      expect(config.performanceProfile.memoryUsage).toBe(15);
    });

    it('should have consistent type keys and config type values', () => {
      Object.entries(PRODUCTION_TYPE_REGISTRY).forEach(([key, config]) => {
        expect(key).toBe(config.type);
      });
    });

    it('should have valid performance profiles for all types', () => {
      Object.values(PRODUCTION_TYPE_REGISTRY).forEach(config => {
        expect(config.performanceProfile.avgResponseTime).toBeGreaterThan(0);
        expect(config.performanceProfile.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(config.performanceProfile.cacheHitRate).toBeLessThanOrEqual(1);
        expect(config.performanceProfile.memoryUsage).toBeGreaterThan(0);
      });
    });
  });

  describe('getProductionTypeConfig', () => {
    it('should return correct configuration for valid type', () => {
      const config = getProductionTypeConfig('quote_fields' as RuleListType);

      expect(config).toBeDefined();
      expect(config.type).toBe('quote_fields');
      expect(config.supportLevel).toBe(ProductionSupportLevel.PRODUCTION);
      expect(config.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should return configuration for all registry types', () => {
      const types: RuleListType[] = ['quote_fields', 'basic_info_fields', 'index_fields'];

      types.forEach(type => {
        const config = getProductionTypeConfig(type);
        expect(config).toBeDefined();
        expect(config.type).toBe(type);
      });
    });

    it('should return same instance from registry', () => {
      const config1 = getProductionTypeConfig('quote_fields' as RuleListType);
      const config2 = getProductionTypeConfig('quote_fields' as RuleListType);

      expect(config1).toBe(config2);
    });
  });

  describe('isProductionReady', () => {
    it('should return true for production-ready enabled types', () => {
      expect(isProductionReady('quote_fields' as RuleListType)).toBe(true);
      expect(isProductionReady('basic_info_fields' as RuleListType)).toBe(true);
      expect(isProductionReady('index_fields' as RuleListType)).toBe(true);
    });

    it('should check both support level and enabled status', () => {
      // Mock a temporarily disabled production type
      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      const testConfig = { ...originalConfig, enabled: false };

      // Temporarily replace the config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      expect(isProductionReady('quote_fields' as RuleListType)).toBe(false);

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should return false for non-production support levels', () => {
      // Mock an experimental type
      const testConfig: ProductionTypeConfig = {
        type: 'quote_fields' as RuleListType,
        supportLevel: ProductionSupportLevel.EXPERIMENTAL,
        endpoints: ['test'],
        riskLevel: RiskLevel.MEDIUM,
        description: 'Test config',
        performanceProfile: {
          avgResponseTime: 100,
          cacheHitRate: 0.8,
          memoryUsage: 20
        },
        enabled: true,
        maxConcurrency: 10
      };

      // Temporarily replace the config
      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      expect(isProductionReady('quote_fields' as RuleListType)).toBe(false);

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });
  });

  describe('getSupportedEndpoints', () => {
    it('should return correct endpoints for quote_fields', () => {
      const endpoints = getSupportedEndpoints('quote_fields' as RuleListType);

      expect(endpoints).toEqual(['get-stock-realtime', 'get-stock-history']);
    });

    it('should return correct endpoints for basic_info_fields', () => {
      const endpoints = getSupportedEndpoints('basic_info_fields' as RuleListType);

      expect(endpoints).toEqual(['get-stock-basic-info']);
    });

    it('should return correct endpoints for index_fields', () => {
      const endpoints = getSupportedEndpoints('index_fields' as RuleListType);

      expect(endpoints).toEqual(['get-index-quote']);
    });

    it('should return array reference from configuration', () => {
      const config = getProductionTypeConfig('quote_fields' as RuleListType);
      const endpoints = getSupportedEndpoints('quote_fields' as RuleListType);

      expect(endpoints).toBe(config.endpoints);
    });
  });

  describe('getFallbackType', () => {
    it('should return fallback type when configured', () => {
      const fallbackType = getFallbackType('index_fields' as RuleListType);

      expect(fallbackType).toBe('quote_fields');
    });

    it('should return null when no fallback is configured', () => {
      const fallbackType = getFallbackType('quote_fields' as RuleListType);

      expect(fallbackType).toBeNull();
    });

    it('should return null for basic_info_fields', () => {
      const fallbackType = getFallbackType('basic_info_fields' as RuleListType);

      expect(fallbackType).toBeNull();
    });

    it('should handle undefined fallbackType gracefully', () => {
      // Mock a config without fallbackType
      const testConfig: ProductionTypeConfig = {
        type: 'quote_fields' as RuleListType,
        supportLevel: ProductionSupportLevel.PRODUCTION,
        endpoints: ['test'],
        riskLevel: RiskLevel.LOW,
        description: 'Test config',
        performanceProfile: {
          avgResponseTime: 50,
          cacheHitRate: 0.9,
          memoryUsage: 10
        },
        enabled: true,
        maxConcurrency: 50
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const fallbackType = getFallbackType('quote_fields' as RuleListType);
      expect(fallbackType).toBeNull();

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });
  });

  describe('getProductionReadyTypes', () => {
    it('should return all production-ready types', () => {
      const productionTypes = getProductionReadyTypes();

      expect(productionTypes).toEqual(
        expect.arrayContaining(['quote_fields', 'basic_info_fields', 'index_fields'])
      );
    });

    it('should filter out non-production types', () => {
      // Mock a deprecated type
      const testConfig: ProductionTypeConfig = {
        type: 'quote_fields' as RuleListType,
        supportLevel: ProductionSupportLevel.DEPRECATED,
        endpoints: ['test'],
        riskLevel: RiskLevel.HIGH,
        description: 'Deprecated config',
        performanceProfile: {
          avgResponseTime: 200,
          cacheHitRate: 0.5,
          memoryUsage: 50
        },
        enabled: false,
        maxConcurrency: 1
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const productionTypes = getProductionReadyTypes();
      expect(productionTypes).not.toContain('quote_fields');

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should return array of RuleListType strings', () => {
      const productionTypes = getProductionReadyTypes();

      productionTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(['quote_fields', 'basic_info_fields', 'index_fields']).toContain(type);
      });
    });
  });

  describe('validateProductionTypeRegistry', () => {
    it('should validate successfully with current registry', () => {
      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect type key mismatch', () => {
      // Mock a config with mismatched key
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        type: 'different_type' as RuleListType
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("类型键名 'quote_fields' 与配置中的类型 'different_type' 不匹配")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should detect empty endpoints', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        endpoints: []
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 的端点列表为空")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should detect invalid response time', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        performanceProfile: {
          ...PRODUCTION_TYPE_REGISTRY.quote_fields.performanceProfile,
          avgResponseTime: 0
        }
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 的平均响应时间必须大于0")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should detect invalid cache hit rate', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        performanceProfile: {
          ...PRODUCTION_TYPE_REGISTRY.quote_fields.performanceProfile,
          cacheHitRate: 1.5
        }
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 的缓存命中率必须在0-1之间")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should detect circular fallback reference', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        fallbackType: 'quote_fields' as RuleListType
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 存在循环降级引用")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should generate warnings for high response time', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        performanceProfile: {
          ...PRODUCTION_TYPE_REGISTRY.quote_fields.performanceProfile,
          avgResponseTime: 300
        }
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.warnings).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 的平均响应时间较高 (300ms)")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should generate warnings for low cache hit rate', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        performanceProfile: {
          ...PRODUCTION_TYPE_REGISTRY.quote_fields.performanceProfile,
          cacheHitRate: 0.7
        }
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.warnings).toContainEqual(
        expect.stringContaining("类型 'quote_fields' 的缓存命中率较低 (0.7)")
      );

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should handle multiple validation issues', () => {
      const testConfig = {
        ...PRODUCTION_TYPE_REGISTRY.quote_fields,
        type: 'different_type' as RuleListType,
        endpoints: [],
        performanceProfile: {
          avgResponseTime: -10,
          cacheHitRate: 2.0,
          memoryUsage: 5
        },
        fallbackType: 'quote_fields' as RuleListType
      };

      const originalConfig = PRODUCTION_TYPE_REGISTRY.quote_fields;
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = testConfig;

      const validation = validateProductionTypeRegistry();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);

      // Restore original config
      (PRODUCTION_TYPE_REGISTRY as any).quote_fields = originalConfig;
    });

    it('should return validation result structure', () => {
      const validation = validateProductionTypeRegistry();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Interface compliance', () => {
    it('should satisfy ProductionTypeConfig interface', () => {
      Object.values(PRODUCTION_TYPE_REGISTRY).forEach(config => {
        // Type checking - these would fail at compile time if interface is violated
        expect(typeof config.type).toBe('string');
        expect(typeof config.supportLevel).toBe('string');
        expect(Array.isArray(config.endpoints)).toBe(true);
        expect(typeof config.riskLevel).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.enabled).toBe('boolean');
        expect(typeof config.maxConcurrency).toBe('number');

        expect(typeof config.performanceProfile).toBe('object');
        expect(typeof config.performanceProfile.avgResponseTime).toBe('number');
        expect(typeof config.performanceProfile.cacheHitRate).toBe('number');
        expect(typeof config.performanceProfile.memoryUsage).toBe('number');

        if (config.fallbackType !== undefined) {
          expect(typeof config.fallbackType).toBe('string');
        }
      });
    });
  });
});
