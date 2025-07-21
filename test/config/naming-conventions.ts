/**
 * 测试文件命名规范
 */
export const NAMING_CONVENTIONS = {
  unit: {
    pattern: /^.*\.spec\.ts$/,
    location: "test/jest/unit/**/*.spec.ts",
    description: "单元测试文件必须以 .spec.ts 结尾",
    examples: [
      "auth.service.spec.ts",
      "data-transformer.util.spec.ts",
      "validation.pipe.spec.ts"
    ]
  },
  integration: {
    pattern: /^.*\.integration\.test\.ts$/,
    location: "test/jest/integration/**/*.integration.test.ts",
    description: "集成测试文件必须以 .integration.test.ts 结尾",
    examples: [
      "auth.integration.test.ts",
      "database.integration.test.ts",
      "cache.integration.test.ts"
    ]
  },
  e2e: {
    pattern: /^.*\.e2e\.test\.ts$/,
    location: "test/jest/e2e/**/*.e2e.test.ts",
    description: "端到端测试文件必须以 .e2e.test.ts 结尾",
    examples: [
      "auth-flow.e2e.test.ts",
      "data-query.e2e.test.ts",
      "user-journey.e2e.test.ts"
    ]
  },
  security: {
    pattern: /^.*\.security\.test\.ts$/,
    location: "test/jest/security/**/*.security.test.ts",
    description: "安全测试文件必须以 .security.test.ts 结尾",
    examples: [
      "auth-security.security.test.ts",
      "input-validation.security.test.ts",
      "sql-injection.security.test.ts"
    ]
  },
  performance: {
    pattern: /^.*\.perf\.test\.js$/,
    location: "test/k6/**/*.perf.test.js",
    description: "性能测试文件必须以 .perf.test.js 结尾（K6使用JS）",
    examples: [
      "auth-load.perf.test.js",
      "api-stress.perf.test.js",
      "data-spike.perf.test.js"
    ]
  }
} as const;

/**
 * 目录结构规范
 */
export const DIRECTORY_STRUCTURE = {
  "test/": {
    description: "新的测试根目录",
    children: {
      "jest/": {
        description: "Jest测试套件",
        children: {
          "unit/": {
            description: "单元测试",
            children: {
              "auth/": "认证相关单元测试",
              "core/": "核心模块单元测试",
              "common/": "共享组件单元测试",
              "monitoring/": "监控组件单元测试"
            }
          },
          "integration/": {
            description: "集成测试",
            children: {
              "auth/": "认证集成测试",
              "core/": "核心模块集成测试",
              "common/": "共享服务集成测试",
              "monitoring/": "监控集成测试"
            }
          },
          "e2e/": {
            description: "端到端测试",
            children: {
              "auth/": "认证流程E2E测试",
              "core/": "核心功能E2E测试",
              "common/": "共享功能E2E测试",
              "monitoring/": "监控功能E2E测试"
            }
          },
          "security/": {
            description: "安全测试",
            children: {
              "auth/": "认证安全测试",
              "core/": "核心安全测试",
              "common/": "共享安全测试",
              "monitoring/": "监控安全测试"
            }
          }
        }
      },
      "k6/": {
        description: "K6性能测试套件",
        children: {
          "load/": {
            description: "负载测试",
            children: {
              "auth/": "认证负载测试",
              "data-flow/": "数据流负载测试",
              "api/": "API负载测试"
            }
          },
          "stress/": {
            description: "压力测试",
            children: {
              "auth/": "认证压力测试",
              "data-flow/": "数据流压力测试",
              "api/": "API压力测试"
            }
          },
          "spike/": {
            description: "峰值测试",
            children: {
              "auth/": "认证峰值测试",
              "data-flow/": "数据流峰值测试",
              "api/": "API峰值测试"
            }
          }
        }
      },
      "config/": {
        description: "测试配置文件",
        files: [
          "jest.unit.config.js",
          "jest.integration.config.js",
          "jest.e2e.config.js",
          "jest.security.config.js",
          "k6.config.js"
        ]
      },
      "utils/": {
        description: "测试工具和帮助函数",
        files: [
          "test-boundary-guard.ts",
          "test-data-factory.ts",
          "test-helpers.ts",
          "mock-factory.ts"
        ]
      },
      "fixtures/": {
        description: "测试数据和固定装置",
        files: [
          "test-data.ts",
          "mock-responses.ts",
          "sample-data.json"
        ]
      }
    }
  }
} as const;

/**
 * 文件命名验证函数
 */
export class NamingValidator {
  static validateFileName(filePath: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // 检查每种测试类型的命名规范
    for (const [testType, config] of Object.entries(NAMING_CONVENTIONS)) {
      if (filePath.includes(testType)) {
        const fileName = filePath.split('/').pop() || '';
        if (!config.pattern.test(fileName)) {
          violations.push(`${testType}测试文件应该匹配模式: ${config.pattern.toString()}`);
        }
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }
  
  static getRecommendedFileName(testType: keyof typeof NAMING_CONVENTIONS, baseName: string): string {
    const config = NAMING_CONVENTIONS[testType];
    const examples = config.examples[0];
    
    // 从示例中提取模式
    const pattern = examples.replace(/^.*?\./, `${baseName}.`);
    return pattern;
  }
}

/**
 * 目录结构验证函数
 */
export class DirectoryValidator {
  static validateDirectory(filePath: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // 检查是否在正确的目录结构中
    const pathParts = filePath.split('/');
    const testNewIndex = pathParts.findIndex(part => part === 'test');
    
    if (testNewIndex === -1) {
      violations.push('测试文件应该在 test 目录下');
      return { isValid: false, violations };
    }
    
    const relativePath = pathParts.slice(testNewIndex + 1);
    if (relativePath.length < 3) {
      violations.push('测试文件应该至少在三级目录中: test/技术栈/测试类型/功能模块/');
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

export type TestTypeKey = keyof typeof NAMING_CONVENTIONS;