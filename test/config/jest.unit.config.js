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
  
  // 单元测试超时设置 - MongoDB Memory Server需要更多时间
  testTimeout: 60000,
  
  // 禁用计时器模拟以兼容Mongoose
  fakeTimers: {
    enableGlobally: false,
  },
  
  // 模块名映射
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@alert/(.*)$': '<rootDir>/src/alert/$1',
    '^@cache/(.*)$': '<rootDir>/src/cache/$1',
    '^@metrics/(.*)$': '<rootDir>/src/metrics/$1',
    '^@security/(.*)$': '<rootDir>/src/security/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    // Mock FeatureFlags to prevent StreamPerformanceMetrics errors
    '^@common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    '^../../src/common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    '^../../../common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    '^../../../../common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    '^../../../../../common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    '^../../../../../../src/common/config/feature-flags\\.config$': '<rootDir>/test/__mocks__/feature-flags.config.js',
    
    // Mock PermissionService to prevent UnifiedPermissionsGuard errors
    // '^@auth/services/permission\\.service$': '<rootDir>/test/mocks/permission.service.js',
    // '^../../../../../src/auth/services/permission\\.service$': '<rootDir>/test/mocks/permission.service.js',
    
    // Mock UnifiedPermissionsGuard to prevent dependency issues (disabled for true guard testing)
    // '^@auth/guards/unified-permissions\\.guard$': '<rootDir>/test/mocks/unified-permissions.guard.js',
    // '^../../../../../src/auth/guards/unified-permissions\\.guard$': '<rootDir>/test/mocks/unified-permissions.guard.js',
  },
  
  // TypeScript 转换 - 更新配置方式
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // Jest 全局配置 - 移除已弃用的 ts-jest 配置
  globals: {},
  
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
        sort: 'status:failed,pending,passed'
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