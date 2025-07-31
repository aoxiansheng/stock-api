/**
 * 真实环境黑盒E2E测试配置
 * 专门用于连接真实运行项目的黑盒测试
 */

module.exports = {
  displayName: '真实环境黑盒E2E测试',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 设置正确的根目录
  rootDir: '../..',
  
  // 匹配所有真实环境黑盒测试文件
  testMatch: [
    '<rootDir>/test/jest/e2e/blackbox/*.e2e.test.ts'
  ],
  
  // 测试根目录
  roots: ['<rootDir>'],
  
  // 不收集覆盖率（黑盒测试关注功能而非代码覆盖）
  collectCoverage: false,
  
  // 黑盒测试专用设置 - 不使用任何测试环境设置
  // setupFilesAfterEnv: [], // 不使用现有的E2E设置
  
  // 超长超时 - 真实环境可能较慢
  testTimeout: 120000, // 2分钟
  
  // 模块名映射
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
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
  
  // 黑盒测试报告
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '真实环境黑盒E2E测试报告',
        outputPath: 'test-results/blackbox-test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        sort: 'status:failed,pending,passed'
      },
    ],
  ],
  
  // 详细输出
  verbose: true,
  bail: false,
  
  // 单线程执行确保稳定性
  maxWorkers: 1,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  forceExit: true,
  
  // 环境变量
  setupFiles: ['<rootDir>/test/config/blackbox.env.ts'],
};