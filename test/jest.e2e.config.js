/**
 * E2E 测试配置（Jest + ts-jest）
 * - 测试目标：黑盒 HTTP 接口（基于 Nest 测试服务器）
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/e2e/jest-setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@appcore/(.*)$': '<rootDir>/src/appcore/$1',
    '^@config/(.*)$': '<rootDir>/src/appcore/config/$1',
    '^@common/logging/(.*)$': '<rootDir>/src/common/modules/logging/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@common-types/(.*)$': '<rootDir>/src/common/types/$1',
    '^@common-utils/(.*)$': '<rootDir>/src/common/utils/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@providersv2$': '<rootDir>/src/providersv2/index.ts',
    '^@providersv2/(.*)$': '<rootDir>/src/providersv2/$1',
    '^@authv2$': '<rootDir>/src/authv2/index.ts',
    '^@authv2/(.*)$': '<rootDir>/src/authv2/$1',
    '^@cachev2$': '<rootDir>/src/cachev2/index.ts',
    '^@cachev2/(.*)$': '<rootDir>/src/cachev2/$1',
    '^@scripts/(.*)$': '<rootDir>/src/scripts/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  // 测试超时设置
  testTimeout: 30000,
  // 最大workers数量
  maxWorkers: 4,
  // 收集覆盖率配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
};
