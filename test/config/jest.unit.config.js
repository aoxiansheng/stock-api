module.exports = {
  displayName: '单元测试',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/jest/unit/**/*.spec.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>/test/jest/unit'],
  
  // 覆盖率收集
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.module.ts'
  ],
  
  // 覆盖率阈值 - 单元测试要求较高覆盖率
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 单元测试专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/unit.setup.ts'
  ],
  
  // 单元测试超时设置 - 应该很快
  testTimeout: 5000,
  
  // 模块名映射
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@ApiKeyAuth/(.*)$': '<rootDir>/src/auth/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@alert/(.*)$': '<rootDir>/src/alert/$1',
    '^@cache/(.*)$': '<rootDir>/src/cache/$1',
    '^@metrics/(.*)$': '<rootDir>/src/metrics/$1',
    '^@security/(.*)$': '<rootDir>/src/security/$1',
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
  
  // 单元测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '单元测试报告',
        outputPath: 'test-results/unit-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
  
  // 单元测试应该快速运行
  verbose: false,
  bail: false,
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 强制退出防止悬挂进程
  forceExit: true,
  detectOpenHandles: true,
  
  // 单元测试环境变量
  setupFiles: ['<rootDir>/test/config/unit.env.ts'],
};