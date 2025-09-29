const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.json');

module.exports = {
  displayName: 'unit',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../../',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/jest/unit/**/*.spec.ts',
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // 模块名映射 - 支持 TypeScript 路径别名
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  
  // TypeScript 配置 - 使用现代 ts-jest 语法
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
      },
      useESM: false,
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
      },
      useESM: false,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // 收集覆盖率配置
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.type.ts',
    '!src/main.ts',
  ],
  
  // 覆盖率报告
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Jest 设置
  setupFilesAfterEnv: [],
  verbose: true,
  silent: false,
  
  // 超时设置
  testTimeout: 30000,
  
  // 移除已弃用的 globals 配置，使用现代 transform 配置
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
};