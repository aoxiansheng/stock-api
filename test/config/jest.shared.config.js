/**
 * Jest配置 - Shared组件测试专用
 * 针对shared组件的测试进行优化配置
 */

module.exports = {
  displayName: 'Shared Components',
  
  // 测试文件匹配模式
  testMatch: [
    '**/test/jest/unit/core/shared/**/*.spec.ts'
  ],
  
  // 测试环境设置
  testEnvironment: 'node',
  
  // TypeScript配置
  preset: 'ts-jest',
  
  // 测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/test/jest/shared/setup.ts'
  ],
  
  // 模块路径映射（与tsconfig.json保持一致）
  moduleNameMapping: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/core/shared/**/*.ts',
    '!src/core/shared/**/*.spec.ts',
    '!src/core/shared/**/*.interface.ts',
    '!src/core/shared/**/*.types.ts',
    '!src/core/shared/**/*.config.ts',
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // 对核心工具类要求更高
    'src/core/shared/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // 对核心服务要求较高
    'src/core/shared/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // 忽略覆盖率的路径
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '.spec.ts',
    '.config.ts',
    '.interface.ts',
    '.types.ts',
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // 测试超时设置
  testTimeout: 10000, // 10秒超时
  
  // 并行测试数量
  maxWorkers: '50%',
  
  // 清除Mock
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止测试
  bail: false,
  
  // 强制退出
  forceExit: true,
  
  // 静默控制台警告
  silent: false,
  
  // 全局变量设置
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
      },
    },
  },
  
  // 转换配置
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // 文件扩展名
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  
  // 性能监控
  notify: false,
  notifyMode: 'failure-change',
};