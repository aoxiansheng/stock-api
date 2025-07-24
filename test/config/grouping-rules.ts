/**
 * 测试分组规则和文件映射
 */
export const GROUPING_RULES = {
  // 按功能模块聚合的子目录规则
  functional_modules: {
    auth: {
      description: "认证授权相关功能",
      submodules: [
        "login",
        "register",
        "jwt",
        "api-key",
        "rate-limit",
        "permissions",
      ],
      priority: "critical",
    },
    core: {
      description: "核心业务功能",
      submodules: [
        "receiver",
        "transformer",
        "query",
        "storage",
        "symbol-mapper",
        "data-mapper",
      ],
      priority: "critical",
    },
    common: {
      description: "共享组件和服务",
      submodules: [
        "cache",
        "database",
        "interceptors",
        "pipes",
        "filters",
        "decorators",
      ],
      priority: "high",
    },
    monitoring: {
      description: "监控和安全相关",
      submodules: ["performance", "security", "health", "logging", "metrics"],
      priority: "medium",
    },
  },

  // 测试类型与功能模块的映射矩阵
  test_mapping_matrix: {
    "auth/login": {
      unit: "login.service.spec.ts",
      integration: "login.integration.test.ts",
      e2e: "login-flow.e2e.test.ts",
      security: "login-security.security.test.ts",
      performance: "login-load.perf.test.js",
    },
    "auth/register": {
      unit: "register.service.spec.ts",
      integration: "register.integration.test.ts",
      e2e: "register-flow.e2e.test.ts",
      security: "register-security.security.test.ts",
    },
    "auth/jwt": {
      unit: "jwt.service.spec.ts",
      integration: "jwt.integration.test.ts",
      security: "jwt-security.security.test.ts",
    },
    "auth/api-key": {
      unit: "api-key.service.spec.ts",
      integration: "api-key.integration.test.ts",
      e2e: "api-key-flow.e2e.test.ts",
      security: "api-key-security.security.test.ts",
    },
    "auth/rate-limit": {
      unit: "rate-limit.service.spec.ts",
      integration: "rate-limit.integration.test.ts",
      e2e: "rate-limit-flow.e2e.test.ts",
      security: "rate-limit-security.security.test.ts",
      performance: "rate-limit-load.perf.test.js",
    },
    "core/receiver": {
      unit: "receiver.service.spec.ts",
      integration: "receiver.integration.test.ts",
      e2e: "data-request.e2e.test.ts",
      performance: "receiver-load.perf.test.js",
    },
    "core/transformer": {
      unit: "transformer.service.spec.ts",
      integration: "transformer.integration.test.ts",
      e2e: "data-transform.e2e.test.ts",
    },
    "core/query": {
      unit: "query.service.spec.ts",
      integration: "query.integration.test.ts",
      e2e: "data-query.e2e.test.ts",
      performance: "query-load.perf.test.js",
    },
    "core/storage": {
      unit: "storage.service.spec.ts",
      integration: "storage.integration.test.ts",
      performance: "storage-load.perf.test.js",
    },
    "core/symbol-mapper": {
      unit: "symbol-mapper.service.spec.ts",
      integration: "symbol-mapper.integration.test.ts",
      e2e: "symbol-mapping.e2e.test.ts",
    },
    "core/data-mapper": {
      unit: "data-mapper.service.spec.ts",
      integration: "data-mapper.integration.test.ts",
      e2e: "data-mapping.e2e.test.ts",
    },
    "common/cache": {
      unit: "cache.service.spec.ts",
      integration: "cache.integration.test.ts",
      performance: "cache-load.perf.test.js",
    },
    "common/database": {
      unit: "database.service.spec.ts",
      integration: "database.integration.test.ts",
      performance: "database-load.perf.test.js",
    },
    "monitoring/performance": {
      unit: "performance-monitor.service.spec.ts",
      integration: "performance-monitor.integration.test.ts",
      e2e: "performance-monitoring.e2e.test.ts",
    },
    "monitoring/security": {
      unit: "security-scanner.service.spec.ts",
      integration: "security-scanner.integration.test.ts",
      security: "security-scanning.security.test.ts",
    },
  },

  // 测试覆盖范围映射
  coverage_mapping: {
    "src/auth/": {
      unit: [
        "test/jest/unit/auth/auth.service.spec.ts",
        "test/jest/unit/auth/jwt.service.spec.ts",
        "test/jest/unit/auth/api-key.service.spec.ts",
        "test/jest/unit/auth/rate-limit.service.spec.ts",
      ],
      integration: [
        "test/jest/integration/auth/auth.integration.test.ts",
        "test/jest/integration/auth/rate-limit.integration.test.ts",
      ],
      e2e: [
        "test/jest/e2e/auth/auth-flow.e2e.test.ts",
        "test/jest/e2e/auth/api-key-flow.e2e.test.ts",
      ],
      security: [
        "test/jest/security/auth/auth-security.security.test.ts",
        "test/jest/security/auth/rate-limit-security.security.test.ts",
      ],
      performance: [
        "test/k6/load/auth/auth-load.perf.test.js",
        "test/k6/stress/auth/auth-stress.perf.test.js",
      ],
    },
    "src/core/receiver/": {
      unit: [
        "test/jest/unit/core/receiver.service.spec.ts",
        "test/jest/unit/core/receiver.controller.spec.ts",
      ],
      integration: ["test/jest/integration/core/receiver.integration.test.ts"],
      e2e: ["test/jest/e2e/core/data-request.e2e.test.ts"],
      performance: ["test/k6/load/data-flow/receiver-load.perf.test.js"],
    },
    "src/core/transformer/": {
      unit: [
        "test/jest/unit/core/transformer.service.spec.ts",
        "test/jest/unit/core/transformer.controller.spec.ts",
      ],
      integration: [
        "test/jest/integration/core/transformer.integration.test.ts",
      ],
      e2e: ["test/jest/e2e/core/data-transform.e2e.test.ts"],
    },
    "src/common/": {
      unit: [
        "test/jest/unit/common/cache.service.spec.ts",
        "test/jest/unit/common/performance-monitor.service.spec.ts",
      ],
      integration: [
        "test/jest/integration/common/cache.integration.test.ts",
        "test/jest/integration/common/database.integration.test.ts",
      ],
      performance: ["test/k6/load/api/cache-load.perf.test.js"],
    },
  },
} as const;

/**
 * 测试场景分组
 */
export const TEST_SCENARIOS = {
  // 核心用户场景
  user_journeys: {
    complete_data_flow: {
      description: "完整的数据请求流程",
      steps: ["认证", "数据请求", "符号映射", "数据转换", "结果返回"],
      test_types: ["e2e", "performance"],
      files: [
        "test/jest/e2e/core/complete-data-flow.e2e.test.ts",
        "test/k6/load/data-flow/complete-flow-load.perf.test.js",
      ],
    },
    user_registration_to_api_usage: {
      description: "从用户注册到API使用的完整流程",
      steps: ["用户注册", "登录", "创建API Key", "使用API", "数据获取"],
      test_types: ["e2e", "security"],
      files: [
        "test/jest/e2e/auth/user-journey.e2e.test.ts",
        "test/jest/security/auth/user-journey-security.security.test.ts",
      ],
    },
  },

  // 错误处理场景
  error_scenarios: {
    authentication_failures: {
      description: "各种认证失败场景",
      test_types: ["e2e", "security"],
      files: [
        "test/jest/e2e/auth/auth-errors.e2e.test.ts",
        "test/jest/security/auth/auth-failures.security.test.ts",
      ],
    },
    rate_limit_exceeded: {
      description: "速率限制超出场景",
      test_types: ["e2e", "security", "performance"],
      files: [
        "test/jest/e2e/auth/rate-limit-errors.e2e.test.ts",
        "test/jest/security/auth/rate-limit-security.security.test.ts",
        "test/k6/stress/auth/rate-limit-stress.perf.test.js",
      ],
    },
  },
} as const;

/**
 * 测试依赖关系
 */
export const TEST_DEPENDENCIES = {
  // 测试执行顺序依赖
  execution_order: {
    unit: {
      dependencies: [],
      description: "单元测试无依赖，可并行执行",
    },
    integration: {
      dependencies: ["unit"],
      description: "集成测试依赖单元测试通过",
    },
    e2e: {
      dependencies: ["unit", "integration"],
      description: "E2E测试依赖单元和集成测试通过",
    },
    security: {
      dependencies: ["unit"],
      description: "安全测试可与集成测试并行执行",
    },
    performance: {
      dependencies: ["unit", "integration", "e2e"],
      description: "性能测试依赖所有功能测试通过",
    },
  },

  // 测试数据依赖
  data_dependencies: {
    auth_tests: {
      setup: ["test_database", "test_redis"],
      cleanup: ["clear_test_users", "clear_api_keys"],
    },
    core_tests: {
      setup: ["test_database", "test_redis", "mock_external_apis"],
      cleanup: ["clear_test_data", "clear_cache"],
    },
  },
} as const;

export type FunctionalModule = keyof typeof GROUPING_RULES.functional_modules;
export type TestScenario = keyof typeof TEST_SCENARIOS.user_journeys;
export type TestDependency = keyof typeof TEST_DEPENDENCIES.execution_order;
