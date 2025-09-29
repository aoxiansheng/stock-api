import {
  validateRuleType,
  validateRuleTypes,
  performTypeHealthCheck,
  getOptimalFallbackStrategy,
  TypeValidationResult,
} from '../../../../../../../src/core/00-prepare/data-mapper/utils/type-validation.utils';
import { RuleListType } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';

// Mock the logger to avoid console output during tests
jest.mock('@common/utils/logger.utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the production type config
jest.mock('@core/00-prepare/data-mapper/config/production-types.config', () => ({
  getProductionTypeConfig: jest.fn((type: string) => {
    const configs = {
      quote_fields: {
        enabled: true,
        supportLevel: 'PRODUCTION',
        riskLevel: 'LOW',
        fallbackType: 'basic_info_fields',
        performanceProfile: {
          avgResponseTime: 50,
          cacheHitRate: 0.9,
          memoryUsage: 20,
        },
        endpoints: ['/api/quotes', '/api/stock-data'],
      },
      basic_info_fields: {
        enabled: true,
        supportLevel: 'PRODUCTION',
        riskLevel: 'LOW',
        fallbackType: null,
        performanceProfile: {
          avgResponseTime: 30,
          cacheHitRate: 0.95,
          memoryUsage: 15,
        },
        endpoints: ['/api/info', '/api/basic'],
      },
      disabled_type: {
        enabled: false,
        supportLevel: 'DEPRECATED',
        riskLevel: 'HIGH',
        fallbackType: 'quote_fields',
        performanceProfile: {
          avgResponseTime: 200,
          cacheHitRate: 0.5,
          memoryUsage: 60,
        },
        endpoints: [],
      },
      experimental_type: {
        enabled: true,
        supportLevel: 'EXPERIMENTAL',
        riskLevel: 'MEDIUM',
        fallbackType: 'quote_fields',
        performanceProfile: {
          avgResponseTime: 120,
          cacheHitRate: 0.7,
          memoryUsage: 40,
        },
        endpoints: ['/api/experimental'],
      },
      high_risk_type: {
        enabled: true,
        supportLevel: 'PRODUCTION',
        riskLevel: 'HIGH',
        fallbackType: 'quote_fields',
        performanceProfile: {
          avgResponseTime: 150,
          cacheHitRate: 0.6,
          memoryUsage: 55,
        },
        endpoints: ['/api/quotes'],
      },
    };
    return configs[type] || null;
  }),
  getSupportedEndpoints: jest.fn((type: string) => {
    const endpointMap = {
      quote_fields: ['/api/quotes', '/api/stock-data'],
      basic_info_fields: ['/api/info', '/api/basic'],
      disabled_type: [],
      experimental_type: ['/api/experimental'],
      high_risk_type: ['/api/quotes'],
    };
    return endpointMap[type] || [];
  }),
  getFallbackType: jest.fn((type: string) => {
    const fallbackMap = {
      disabled_type: 'quote_fields',
      experimental_type: 'quote_fields',
      high_risk_type: 'quote_fields',
    };
    return fallbackMap[type] || null;
  }),
  isProductionReady: jest.fn((type: string) => {
    return type === 'quote_fields' || type === 'basic_info_fields';
  }),
}));

describe('Type Validation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRuleType', () => {
    describe('basic validation', () => {
      it('should validate a supported rule type successfully', () => {
        const result = validateRuleType('quote_fields');

        expect(result.isValid).toBe(true);
        expect(result.type).toBe('quote_fields');
        expect(result.isFallback).toBe(false);
        expect(result.error).toBeUndefined();
        expect(result.warnings).toEqual([]);
      });

      it('should throw error for null or undefined type', () => {
        expect(() => validateRuleType(null as any)).toThrow();
        expect(() => validateRuleType(undefined as any)).toThrow();
        expect(() => validateRuleType('')).toThrow();
      });

      it('should throw error for non-string type', () => {
        expect(() => validateRuleType(123 as any)).toThrow();
        expect(() => validateRuleType({} as any)).toThrow();
        expect(() => validateRuleType([] as any)).toThrow();
      });

      it('should throw error for unsupported rule type', () => {
        expect(() => validateRuleType('unsupported_type')).toThrow();
      });

      it('should throw error for type without configuration', () => {
        expect(() => validateRuleType('unknown_type')).toThrow();
      });
    });

    describe('disabled type handling', () => {
      it('should fallback to alternative type when allowFallback is true', () => {
        const result = validateRuleType('disabled_type', { allowFallback: true });

        expect(result.isValid).toBe(true);
        expect(result.type).toBe('quote_fields'); // fallback type
        expect(result.isFallback).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('已从禁用类型 disabled_type 降级到 quote_fields')
        );
      });

      it('should throw error for disabled type when allowFallback is false', () => {
        expect(() =>
          validateRuleType('disabled_type', { allowFallback: false })
        ).toThrow();
      });

      it('should throw error for disabled type without fallback', () => {
        // Mock a disabled type without fallback
        const { getProductionTypeConfig } = require('@core/00-prepare/data-mapper/config/production-types.config');
        getProductionTypeConfig.mockReturnValueOnce({
          enabled: false,
          supportLevel: 'DEPRECATED',
          riskLevel: 'HIGH',
          fallbackType: null,
          performanceProfile: { avgResponseTime: 200, cacheHitRate: 0.5, memoryUsage: 60 },
          endpoints: [],
        });

        expect(() =>
          validateRuleType('disabled_type', { allowFallback: true })
        ).toThrow();
      });
    });

    describe('strict mode validation', () => {
      it('should allow production level types in strict mode', () => {
        const result = validateRuleType('quote_fields', { strictMode: true });

        expect(result.isValid).toBe(true);
        expect(result.isFallback).toBe(false);
      });

      it('should fallback for non-production types in strict mode', () => {
        const result = validateRuleType('experimental_type', {
          strictMode: true,
          allowFallback: true
        });

        expect(result.isValid).toBe(true);
        expect(result.type).toBe('quote_fields'); // fallback type
        expect(result.isFallback).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('严格模式下已从 experimental_type 降级到 quote_fields')
        );
      });

      it('should throw error for non-production types in strict mode without fallback', () => {
        expect(() =>
          validateRuleType('experimental_type', { strictMode: true, allowFallback: false })
        ).toThrow();
      });
    });

    describe('endpoint compatibility validation', () => {
      it('should validate successfully for supported endpoint', () => {
        const result = validateRuleType('quote_fields', {
          targetEndpoint: '/api/quotes'
        });

        expect(result.isValid).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should fallback for unsupported endpoint', () => {
        const result = validateRuleType('quote_fields', {
          targetEndpoint: '/api/unsupported',
          allowFallback: true
        });

        expect(result.isValid).toBe(true);
        expect(result.type).toBe('basic_info_fields'); // fallback type
        expect(result.isFallback).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('类型 quote_fields 不支持端点 /api/unsupported')
        );
      });

      it('should throw error for unsupported endpoint without fallback', () => {
        expect(() =>
          validateRuleType('quote_fields', {
            targetEndpoint: '/api/unsupported',
            allowFallback: false
          })
        ).toThrow();
      });
    });

    describe('risk level warnings', () => {
      it('should add warning for high risk types', () => {
        const result = validateRuleType('high_risk_type');

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('类型 high_risk_type 标记为高风险')
        );
        expect(result.suggestions).toContain(
          expect.stringContaining('建议使用更安全的类型: quote_fields')
        );
      });

      it('should add warning for medium risk types', () => {
        const result = validateRuleType('experimental_type');

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('类型 experimental_type 标记为中等风险')
        );
      });

      it('should not add risk warnings for low risk types', () => {
        const result = validateRuleType('quote_fields');

        expect(result.isValid).toBe(true);
        expect(result.warnings.filter(w => w.includes('风险'))).toHaveLength(0);
      });
    });

    describe('performance warnings', () => {
      it('should add warning for slow response time', () => {
        const result = validateRuleType('high_risk_type');

        expect(result.warnings).toContain(
          expect.stringContaining('响应时间较慢 (150ms)')
        );
      });

      it('should add warning for low cache hit rate', () => {
        const result = validateRuleType('high_risk_type');

        expect(result.warnings).toContain(
          expect.stringContaining('缓存命中率较低 (60%)')
        );
      });

      it('should not add performance warnings for good metrics', () => {
        const result = validateRuleType('basic_info_fields');

        expect(result.warnings.filter(w =>
          w.includes('响应时间') || w.includes('缓存命中率')
        )).toHaveLength(0);
      });
    });
  });

  describe('validateRuleTypes', () => {
    it('should validate multiple types successfully', () => {
      const types = ['quote_fields' as RuleListType, 'basic_info_fields' as RuleListType];
      const results = validateRuleTypes(types);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[0].type).toBe('quote_fields');
      expect(results[1].isValid).toBe(true);
      expect(results[1].type).toBe('basic_info_fields');
    });

    it('should handle mix of valid and invalid types', () => {
      const types = ['quote_fields' as RuleListType, 'disabled_type' as RuleListType];
      const results = validateRuleTypes(types, { allowFallback: true });

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[0].isFallback).toBe(false);
      expect(results[1].isValid).toBe(true);
      expect(results[1].isFallback).toBe(true);
    });

    it('should throw error for empty array', () => {
      expect(() => validateRuleTypes([])).toThrow();
    });

    it('should pass options to individual validations', () => {
      const types = ['experimental_type' as RuleListType];
      const results = validateRuleTypes(types, {
        strictMode: true,
        allowFallback: true
      });

      expect(results[0].isFallback).toBe(true);
    });
  });

  describe('performTypeHealthCheck', () => {
    it('should return health report for single type', () => {
      const healthReport = performTypeHealthCheck('quote_fields' as RuleListType);

      expect(healthReport.type).toBe('quote_fields');
      expect(healthReport.isHealthy).toBe(true);
      expect(healthReport.supportLevel).toBe('PRODUCTION');
      expect(healthReport.riskLevel).toBe('LOW');
      expect(healthReport.performance).toBeDefined();
      expect(healthReport.issues).toBeDefined();
      expect(healthReport.recommendations).toBeDefined();
    });

    it('should detect unhealthy disabled types', () => {
      const healthReport = performTypeHealthCheck('disabled_type' as RuleListType);

      expect(healthReport.type).toBe('disabled_type');
      expect(healthReport.isHealthy).toBe(false);
      expect(healthReport.issues.length).toBeGreaterThan(0);
      expect(healthReport.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect performance issues', () => {
      const healthReport = performTypeHealthCheck('high_risk_type' as RuleListType);

      expect(healthReport.type).toBe('high_risk_type');
      expect(healthReport.isHealthy).toBe(false);
      expect(healthReport.riskLevel).toBe('HIGH');
      expect(healthReport.issues.some(issue => issue.includes('高风险'))).toBe(true);
    });
  });

  describe('getOptimalFallbackStrategy', () => {
    it('should return optimal fallback for disabled type', () => {
      const strategy = getOptimalFallbackStrategy('disabled_type' as RuleListType);

      expect(strategy.recommendedType).toBe('quote_fields');
      expect(strategy.reason).toContain('配置的降级类型');
      expect(strategy.expectedImpact).toBeDefined();
    });

    it('should return optimal fallback for high-risk type', () => {
      const strategy = getOptimalFallbackStrategy('high_risk_type' as RuleListType);

      expect(strategy.recommendedType).toBe('quote_fields');
      expect(strategy.reason).toBeDefined();
      expect(strategy.expectedImpact).toBeDefined();
    });

    it('should return fallback strategy for any type', () => {
      const strategy = getOptimalFallbackStrategy('basic_info_fields' as RuleListType);

      expect(strategy.recommendedType).toBeDefined();
      expect(strategy.reason).toBeDefined();
      expect(strategy.expectedImpact).toBeDefined();
    });

    it('should handle context parameters', () => {
      const strategy = getOptimalFallbackStrategy('quote_fields' as RuleListType, {
        targetEndpoint: '/api/quotes',
        performanceRequirement: 'fast',
        riskTolerance: 'low'
      });

      expect(strategy.recommendedType).toBeDefined();
      expect(strategy.reason).toBeDefined();
      expect(strategy.expectedImpact).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw exception for validation failures', () => {
      expect(() => validateRuleType('invalid_type')).toThrow();
    });

    it('should throw exception for unsupported types', () => {
      expect(() => validateRuleType('unsupported_type')).toThrow();
    });

    it('should handle null and undefined gracefully', () => {
      expect(() => validateRuleType(null as any)).toThrow();
      expect(() => validateRuleType(undefined as any)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle circular fallback prevention', () => {
      // Mock a circular fallback scenario
      const { getProductionTypeConfig } = require('@core/00-prepare/data-mapper/config/production-types.config');

      getProductionTypeConfig.mockImplementation((type: string) => {
        if (type === 'type_a') {
          return {
            enabled: false,
            fallbackType: 'type_b',
            supportLevel: 'DEPRECATED',
            riskLevel: 'HIGH',
            performanceProfile: { avgResponseTime: 100, cacheHitRate: 0.8, memoryUsage: 30 },
            endpoints: [],
          };
        }
        if (type === 'type_b') {
          return {
            enabled: false,
            fallbackType: 'type_a', // circular reference
            supportLevel: 'DEPRECATED',
            riskLevel: 'HIGH',
            performanceProfile: { avgResponseTime: 100, cacheHitRate: 0.8, memoryUsage: 30 },
            endpoints: [],
          };
        }
        return null;
      });

      expect(() =>
        validateRuleType('type_a', { allowFallback: true })
      ).toThrow();
    });

    it('should handle multiple warnings accumulation', () => {
      const result = validateRuleType('high_risk_type');

      expect(result.warnings.length).toBeGreaterThan(1);
      expect(result.warnings.some(w => w.includes('风险'))).toBe(true);
      expect(result.warnings.some(w => w.includes('响应时间'))).toBe(true);
      expect(result.warnings.some(w => w.includes('缓存命中率'))).toBe(true);
    });
  });
});