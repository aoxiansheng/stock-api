/**
 * 测试职责矩阵 - 定义不同测试类型的职责边界
 */
export const TEST_RESPONSIBILITY_MATRIX = {
  unit: {
    scope: "单个类/函数的逻辑",
    dependencies: "全部mock",
    database: "禁止",
    network: "禁止",
    redis: "禁止",
    filesystem: "可以(临时文件)",
    examples: [
      "service方法逻辑",
      "工具函数",
      "validators验证",
      "DTOs转换",
      "常量和枚举"
    ],
    testTimeout: 5000,
    setupComplexity: "简单",
    isolation: "完全隔离"
  },
  integration: {
    scope: "模块间协作",
    dependencies: "真实服务(内部)",
    database: "允许(测试DB)",
    network: "内部服务only",
    redis: "允许(测试Redis)",
    filesystem: "允许",
    examples: [
      "controller+service协作",
      "repository+database交互",
      "cache+service集成",
      "多模块数据流"
    ],
    testTimeout: 30000,
    setupComplexity: "中等",
    isolation: "模块级隔离"
  },
  e2e: {
    scope: "完整用户场景",
    dependencies: "完整应用",
    database: "允许",
    network: "允许",
    redis: "允许",
    filesystem: "允许",
    examples: [
      "用户完整注册流程",
      "数据查询完整链路",
      "认证到数据获取",
      "错误处理流程"
    ],
    testTimeout: 60000,
    setupComplexity: "复杂",
    isolation: "应用级隔离"
  },
  security: {
    scope: "安全专项验证",
    dependencies: "根据测试需要",
    database: "按需",
    network: "按需",
    redis: "按需",
    filesystem: "按需",
    examples: [
      "认证授权验证",
      "输入验证安全",
      "SQL注入防护",
      "XSS防护",
      "CSRF防护",
      "率限制验证"
    ],
    testTimeout: 30000,
    setupComplexity: "中等到复杂",
    isolation: "安全边界隔离"
  }
} as const;

/**
 * 测试类型验证规则
 */
export const TEST_VALIDATION_RULES = {
  unit: {
    forbiddenImports: [
      '@nestjs/testing',
      'supertest',
      'mongoose',
      'ioredis',
      'axios',
      'node-fetch'
    ],
    requiredMocks: [
      'database connections',
      'external API calls',
      'file system operations',
      'network requests'
    ]
  },
  integration: {
    forbiddenImports: [
      'supertest' // 应该在e2e中使用
    ],
    requiredSetup: [
      'test database',
      'test redis',
      'test modules'
    ]
  },
  e2e: {
    requiredSetup: [
      'full application bootstrap',
      'test database',
      'test redis',
      'authentication setup'
    ]
  },
  security: {
    requiredFocus: [
      'authentication',
      'authorization',
      'input validation',
      'data protection'
    ]
  }
} as const;

/**
 * 测试优先级矩阵
 */
export const TEST_PRIORITY_MATRIX = {
  critical: {
    description: "核心业务功能，必须100%通过",
    categories: ["认证", "核心数据流", "安全"],
    unit_coverage: 95,
    integration_coverage: 90,
    e2e_coverage: 85
  },
  high: {
    description: "重要功能，影响用户体验",
    categories: ["数据查询", "转换", "缓存"],
    unit_coverage: 90,
    integration_coverage: 80,
    e2e_coverage: 70
  },
  medium: {
    description: "一般功能，增强系统稳定性",
    categories: ["监控", "日志", "工具"],
    unit_coverage: 80,
    integration_coverage: 70,
    e2e_coverage: 50
  },
  low: {
    description: "辅助功能，可选覆盖",
    categories: ["文档", "示例", "调试"],
    unit_coverage: 60,
    integration_coverage: 40,
    e2e_coverage: 20
  }
} as const;

export type TestType = keyof typeof TEST_RESPONSIBILITY_MATRIX;
export type TestPriority = keyof typeof TEST_PRIORITY_MATRIX;