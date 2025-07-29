module.exports = {
  displayName: '集成测试',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/jest/integration/**/*.integration.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>/test/jest/integration'],
  
  // 覆盖率收集
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
  ],
  
  // 覆盖率阈值 - 集成测试关注模块协作
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 集成测试专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/integration.setup.ts'
  ],
  
  // 集成测试超时设置 - 增加超时时间以适应并发测试
  testTimeout: 60000, // 增加到60秒
  
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
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
  },
  
  // TypeScript 转换
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      // isolatedModules已移除，使用tsconfig.json中的配置
    }],
  },
  
  // 集成测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '集成测试报告',
        outputPath: 'test-results/integration-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true, // 包含控制台日志以便调试
      },
    ],
  ],
  
  // 集成测试配置
  verbose: true,
  bail: false,
  
  // 优化Mock配置
  clearMocks: true, // 每个测试前清理Mock
  restoreMocks: true, // 每个测试后恢复Mock
  resetMocks: false, // 不重置Mock实现
  
  // 集成测试环境变量 (移除此项以避免环境污染)
  // setupFiles: ['<rootDir>/test/config/integration.env.ts'],
  
  // 优化并发配置
  maxWorkers: '50%', // 使用50%的CPU核心，而不是固定的2个
  
  // 资源检测和清理
  detectOpenHandles: true,
  forceExit: true,
  
  // 重试配置已移除，因为在当前Jest版本中不支持
  
  // 内存管理
  logHeapUsage: true, // 记录堆内存使用情况
  
  // 缓存配置
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // 全局配置已移至transform配置中
  
  // 模块路径配置
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // 测试环境选项
  testEnvironmentOptions: {
    // Node.js 测试环境选项
    url: 'http://localhost:3000',
  },
  
  // 忽略的路径
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // 监听忽略的路径
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/test-results/',
  ],
};