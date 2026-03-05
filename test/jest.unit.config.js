/**
 * Unit 测试配置（Jest + ts-jest）
 * - 测试目标：纯单元测试（test/unit 下的 *.spec.ts）
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../",
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@appcore/(.*)$": "<rootDir>/src/appcore/$1",
    "^@config/(.*)$": "<rootDir>/src/appcore/config/$1",
    "^@common/logging/(.*)$": "<rootDir>/src/common/modules/logging/$1",
    "^@common/(.*)$": "<rootDir>/src/common/$1",
    "^@common-types/(.*)$": "<rootDir>/src/common/types/$1",
    "^@common-utils/(.*)$": "<rootDir>/src/common/utils/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@providers/(.*)$": "<rootDir>/src/providers/$1",
    "^@providersv2$": "<rootDir>/src/providersv2/index.ts",
    "^@providersv2/(.*)$": "<rootDir>/src/providersv2/$1",
    "^@authv2$": "<rootDir>/src/authv2/index.ts",
    "^@authv2/(.*)$": "<rootDir>/src/authv2/$1",
    "^@cachev2$": "<rootDir>/src/cachev2/index.ts",
    "^@cachev2/(.*)$": "<rootDir>/src/cachev2/$1",
    "^@scripts/(.*)$": "<rootDir>/src/scripts/$1",
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },
  testTimeout: 30000,
  maxWorkers: 4,
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
    "!src/main.ts",
  ],
  coverageDirectory: "<rootDir>/coverage/unit",
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
  },
};
