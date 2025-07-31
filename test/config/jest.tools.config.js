module.exports = {
  displayName: '测试工具',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 测试文件匹配模式 - 测试工具不是Jest测试，而是独立脚本
  testMatch: [
    '<rootDir>/test/utils/**/*.test.ts',
    '<rootDir>/test/scripts/**/*.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>/test/utils', '<rootDir>/test/scripts'],
  
  // 工具测试不需要覆盖率，关注工具功能正确性
  collectCoverage: false,
  
  // 测试工具专用设置
  setupFilesAfterEnv: [
    '<rootDir>/test/config/unit.setup.ts' // 复用单元测试设置
  ],
  
  // 工具测试超时设置
  testTimeout: 30000,
  
  // 模块名映射
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
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
  
  // 测试工具报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '测试工具执行报告',
        outputPath: 'test-results/tools-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        sort: 'status:failed,pending,passed'
      },
    ],
  ],
  
  // 工具测试配置
  verbose: true,
  bail: false,
  
  // 工具测试通常是独立的
  maxWorkers: 1,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  forceExit: true,
};