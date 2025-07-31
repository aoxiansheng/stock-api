module.exports = {
  displayName: 'E2E测试',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/jest/e2e/**/*.e2e.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>'],
  
  // E2E测试覆盖率收集 - 关注端到端流程覆盖
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.module.ts'
  ],
  
  // E2E测试覆盖率阈值 - 关注端到端流程
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 65,
      statements: 65
    }
  },
  
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // E2E测试专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/e2e.setup.ts'
  ],
  
  // E2E测试超时设置 - 需要最多时间
  testTimeout: 60000,
  
  // 模块名映射
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@ApiKeyAuth/(.*)$': '<rootDir>/src/auth/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
  },
  
  // TypeScript 转换
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Jest 全局配置
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  
  // E2E测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'E2E测试报告',
        outputPath: 'test-results/e2e-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        sort: 'status:failed,pending,passed'
      },
    ],
  ],
  
  // E2E测试配置
  verbose: true,
  bail: false,
  
  // E2E测试环境变量
  setupFiles: ['<rootDir>/test/config/e2e.env.ts'],
  
  // E2E测试通常需要顺序执行
  maxWorkers: 1,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  forceExit: true,
  
  // E2E测试可能需要重试
  
  
  // 全局设置和清理
  globalSetup: '<rootDir>/test/config/e2e.global-setup.ts',
  globalTeardown: '<rootDir>/test/config/e2e.global-teardown.ts',
};