/**
 * E2E 测试配置（Jest + ts-jest）
 * - 测试目标：黑盒 HTTP 接口（基于 Nest 测试服务器）
 */
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(__dirname, '../.env.test') });

const DEFAULT_E2E_TEST_TIMEOUT_MS = 120000;
const parsedE2eTimeout = Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS || '', 10);
const e2eTestTimeoutMs =
  Number.isFinite(parsedE2eTimeout) && parsedE2eTimeout > 0
    ? parsedE2eTimeout
    : DEFAULT_E2E_TEST_TIMEOUT_MS;

// 统一写回环境变量，供 setup/spec 读取同一值
process.env.E2E_TEST_TIMEOUT_MS = String(e2eTestTimeoutMs);

const detectOpenHandles = process.env.E2E_DETECT_OPEN_HANDLES === '1';

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
  // 测试超时设置（统一来源：E2E_TEST_TIMEOUT_MS）
  testTimeout: e2eTestTimeoutMs,
  // open-handle 诊断模式下建议单线程，避免并发噪音
  maxWorkers: detectOpenHandles ? 1 : 4,
  // 不强制退出，让未释放句柄通过 detectOpenHandles 暴露
  forceExit: false,
  detectOpenHandles,
  // 给句柄探测更多时间，减少误报
  openHandlesTimeout: 5000,
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
