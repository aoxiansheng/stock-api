module.exports = {
  displayName: 'Performance Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 性能测试文件匹配模式
  testMatch: [
    '<rootDir>/test/jest/performance/**/*.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>'],
  
  // 性能测试覆盖率收集 - 关注性能瓶颈
  collectCoverageFrom: [
    'src/core/public/symbol-mapper/**/*.ts',
    'src/common/config/feature-flags.config.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.module.ts'
  ],
  
  // 性能测试覆盖率阈值 - 关注关键路径
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  coverageDirectory: 'coverage/performance',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 性能测试专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/performance.setup.ts'
  ],
  
  // 性能测试超时设置 - 需要更长时间
  testTimeout: 120000, // 2分钟
  
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
  
  // 性能测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Performance Test Report',
        outputPath: 'test-results/performance-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        sort: 'status:failed,pending,passed'
      },
    ],
  ],
  
  // 性能测试配置
  verbose: true,
  bail: false,
  
  // 性能测试环境变量
  setupFiles: ['<rootDir>/test/config/performance.env.ts'],
  
  // 性能测试通常需要顺序执行以避免资源竞争
  maxWorkers: 1,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  forceExit: true,
  
  // 全局设置和清理
  globalSetup: '<rootDir>/test/config/performance.global-setup.ts',
  globalTeardown: '<rootDir>/test/config/performance.global-teardown.ts',
  
  // 性能测试特殊配置
  slowTestThreshold: 10000, // 10秒以上的测试标记为慢速
  
  // 缓存设置
  cache: true,
  cacheDirectory: '/tmp/jest_performance_cache',
};