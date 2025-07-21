module.exports = {
  displayName: '安全测试',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 测试文件匹配模式 - 包含所有安全相关测试
  testMatch: [
    '<rootDir>/test/jest/security/**/*.security.test.ts',
    '<rootDir>/test/jest/security/**/*-security.test.ts',
    '<rootDir>/test/jest/security/**/security-*.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>/test/jest/security'],
  
  // 安全测试专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/security.setup.ts'
  ],
  
  // 安全测试超时设置
  testTimeout: 30000,
  
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
  
  // 安全测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '安全测试报告',
        outputPath: 'test-results/security-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
      },
    ],
  ],
  
  // 安全测试配置
  verbose: true,
  bail: true, // 安全测试失败应该立即停止
  
  // 安全测试环境变量
  setupFiles: ['<rootDir>/test/config/security.env.ts'],
  
  // 安全测试可能需要顺序执行以避免互相干扰
  maxWorkers: 1,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  forceExit: true,
  
  // 安全测试覆盖率收集 - 关注安全相关代码覆盖
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    // 特别关注安全相关文件
    'src/auth/**/*.ts',
    'src/security/**/*.ts',
    'src/common/guards/**/*.ts',
    'src/common/filters/**/*.ts'
  ],
  
  // 安全测试覆盖率阈值 - 安全相关代码要求较高覆盖率
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 对安全模块要求更高覆盖率
    'src/auth/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/security/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  coverageDirectory: 'coverage/security',
  coverageReporters: ['text', 'lcov', 'html'],
};