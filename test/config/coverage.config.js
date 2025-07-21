/**
 * 统一覆盖率配置
 * 支持不同测试类型的覆盖率收集、合并和报告
 */

const path = require('path');

// 基础覆盖率配置
const BASE_COVERAGE_CONFIG = {
  // 覆盖率收集路径
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.schema.ts',
    // 排除测试文件
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    // 排除配置文件
    '!src/config/**',
    // 排除类型定义
    '!src/types/**',
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',           // 控制台输出
    'text-summary',   // 简要总结
    'html',           // HTML报告
    'lcov',           // LCOV格式（SonarQube等工具）
    'json',           // JSON格式（用于合并）
    'json-summary',   // JSON摘要
    'cobertura',      // Cobertura XML（Jenkins等）
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率提供者
  coverageProvider: 'v8', // 更快更准确
  
  // 覆盖率路径映射
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/test/',
    '/dist/',
    '/coverage/',
  ],
};

// 不同测试类型的覆盖率要求
const COVERAGE_THRESHOLDS = {
  // 单元测试 - 最高要求
  unit: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // 核心模块更高要求
    'src/core/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // 认证模块高要求
    'src/auth/**/*.ts': {
      branches: 88,
      functions: 92,
      lines: 92,
      statements: 92,
    },
    // 共享模块中等要求
    'src/common/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // 集成测试 - 中等要求
  integration: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // 核心模块集成
    'src/core/**/*.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // E2E测试 - 关注业务流程
  e2e: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // 控制器覆盖率
    'src/**/controllers/*.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // 综合覆盖率要求
  combined: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // 按模块分别要求
    'src/core/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/auth/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/common/**/*.ts': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/monitoring/**/*.ts': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};

// 不同环境的覆盖率配置
const ENVIRONMENT_CONFIGS = {
  development: {
    ...BASE_COVERAGE_CONFIG,
    coverageThreshold: COVERAGE_THRESHOLDS.unit,
    // 开发环境收集详细信息
    collectCoverage: true,
    coverageReporters: ['text', 'html', 'lcov'],
  },
  
  ci: {
    ...BASE_COVERAGE_CONFIG,
    coverageThreshold: COVERAGE_THRESHOLDS.combined,
    // CI环境优化性能
    collectCoverage: true,
    coverageReporters: ['text', 'json', 'lcov', 'cobertura'],
    // CI环境更严格
    bail: true,
  },
  
  production: {
    ...BASE_COVERAGE_CONFIG,
    coverageThreshold: COVERAGE_THRESHOLDS.combined,
    // 生产环境最完整的报告
    collectCoverage: true,
    coverageReporters: ['text', 'html', 'lcov', 'json', 'cobertura'],
  },
};

// 覆盖率合并配置
const COVERAGE_MERGE_CONFIG = {
  // 合并来源
  sources: [
    'coverage/unit/coverage-final.json',
    'coverage/integration/coverage-final.json',
    'coverage/e2e/coverage-final.json',
  ],
  
  // 合并输出
  output: 'coverage/merged/coverage-final.json',
  
  // 合并策略
  strategy: 'union', // union | intersection
  
  // 报告生成
  reports: {
    html: 'coverage/merged/html',
    lcov: 'coverage/merged/lcov.info',
    json: 'coverage/merged/coverage-final.json',
    'json-summary': 'coverage/merged/coverage-summary.json',
    text: true, // 输出到控制台
  },
};

// 覆盖率质量门禁
const QUALITY_GATES = {
  // 最低要求（失败阈值）
  minimum: {
    branches: 60,
    functions: 70,
    lines: 70,
    statements: 70,
  },
  
  // 良好水平
  good: {
    branches: 75,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  
  // 优秀水平
  excellent: {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  
  // 模块特定要求
  moduleSpecific: {
    'src/core': 'excellent',
    'src/auth': 'excellent', 
    'src/common': 'good',
    'src/monitoring': 'good',
    'src/providers': 'good',
  },
};

// 覆盖率趋势配置
const TREND_CONFIG = {
  // 历史数据存储
  historyFile: 'coverage/history/coverage-history.json',
  
  // 趋势分析配置
  analysis: {
    // 最小数据点
    minDataPoints: 5,
    // 趋势检测窗口
    trendWindow: 10,
    // 警告阈值（下降百分比）
    warningThreshold: 5,
    // 错误阈值（下降百分比）
    errorThreshold: 10,
  },
  
  // 报告配置
  reporting: {
    // 生成趋势图
    generateChart: true,
    // 图表输出路径
    chartOutput: 'coverage/history/trend-chart.html',
    // 包含的指标
    metrics: ['branches', 'functions', 'lines', 'statements'],
  },
};

// 忽略文件配置
const IGNORE_PATTERNS = {
  // 全局忽略
  global: [
    '**/*.d.ts',
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/test/**',
    '**/test/**',
  ],
  
  // 按文件类型忽略
  byType: {
    interfaces: ['**/*.interface.ts'],
    enums: ['**/*.enum.ts'],
    constants: ['**/*.constant.ts'],
    types: ['**/*.type.ts'],
    schemas: ['**/*.schema.ts'],
    dtos: ['**/*.dto.ts'],
  },
  
  // 按功能忽略
  byFunction: {
    main: ['**/main.ts'],
    config: ['**/config/**'],
    migrations: ['**/migrations/**'],
    seeds: ['**/seeds/**'],
    scripts: ['**/scripts/**'],
  },
};

module.exports = {
  BASE_COVERAGE_CONFIG,
  COVERAGE_THRESHOLDS,
  ENVIRONMENT_CONFIGS,
  COVERAGE_MERGE_CONFIG,
  QUALITY_GATES,
  TREND_CONFIG,
  IGNORE_PATTERNS,
  
  // 获取特定环境的配置
  getConfigForEnvironment(env = 'development') {
    return ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS.development;
  },
  
  // 获取特定测试类型的阈值
  getThresholdForTestType(testType = 'unit') {
    return COVERAGE_THRESHOLDS[testType] || COVERAGE_THRESHOLDS.unit;
  },
  
  // 获取模块特定的质量门禁
  getQualityGateForModule(modulePath) {
    for (const [path, gate] of Object.entries(QUALITY_GATES.moduleSpecific)) {
      if (modulePath.includes(path)) {
        return QUALITY_GATES[gate] || QUALITY_GATES.good;
      }
    }
    return QUALITY_GATES.good;
  },
};