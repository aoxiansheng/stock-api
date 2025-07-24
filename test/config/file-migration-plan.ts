/**
 * 测试文件迁移计划
 * 将现有测试文件重新组织到新结构中
 */
export const FILE_MIGRATION_PLAN = {
  // 从问题严重的 api.test.ts 开始拆分
  "test/e2e/workflows/api.test.ts": {
    action: "split",
    target_files: [
      {
        source_sections: ["Complete Data Flow"],
        target: "test/jest/e2e/core/complete-data-flow.e2e.test.ts",
        description: "完整数据流程测试",
      },
      {
        source_sections: ["Cross-Module Integration"],
        target: "test/jest/e2e/core/cross-module-integration.e2e.test.ts",
        description: "跨模块集成测试",
      },
      {
        source_sections: ["Error Handling and Recovery"],
        target: "test/jest/e2e/core/error-handling.e2e.test.ts",
        description: "错误处理测试",
      },
      {
        source_sections: ["Performance and Scalability"],
        target: "test/k6/load/api/bulk-requests.perf.test.js",
        description: "性能测试迁移到K6",
      },
      {
        source_sections: ["Security and Authorization"],
        target: "test/jest/security/auth/authorization.security.test.ts",
        description: "安全测试专门化",
      },
      {
        source_sections: ["Data Quality and Integrity"],
        target: "test/jest/e2e/core/data-quality.e2e.test.ts",
        description: "数据质量测试",
      },
    ],
  },

  // 认证相关测试整理
  "test/e2e/auth/": {
    action: "reorganize",
    files: [
      {
        source: "auth-flow.e2e.test.ts",
        target: "test/jest/e2e/auth/auth-flow.e2e.test.ts",
        type: "move",
      },
      {
        source: "comprehensive-auth-e2e.test.ts",
        target: "test/jest/e2e/auth/comprehensive-auth.e2e.test.ts",
        type: "move",
      },
      {
        source: "live-auth-api.e2e.test.ts",
        target: "test/jest/e2e/auth/live-auth-api.e2e.test.ts",
        type: "move",
      },
      {
        source: "minimal-auth.e2e.test.ts",
        target: "test/jest/e2e/auth/minimal-auth.e2e.test.ts",
        type: "move",
      },
    ],
  },

  // 速率限制测试整理
  "test/e2e/rate-limit/": {
    action: "reorganize",
    files: [
      {
        source: "optimized-dual-rate-limit.e2e.test.ts",
        target: "test/jest/e2e/auth/rate-limit-optimized.e2e.test.ts",
        type: "move",
      },
      {
        source: "rate-limit-debug.e2e.test.ts",
        target: "test/jest/e2e/auth/rate-limit-debug.e2e.test.ts",
        type: "move",
      },
      {
        source: "rate-limit-system.e2e.test.ts",
        target: "test/jest/e2e/auth/rate-limit-system.e2e.test.ts",
        type: "move",
      },
      {
        source: "simple-rate-limit.e2e.test.ts",
        target: "test/jest/e2e/auth/rate-limit-simple.e2e.test.ts",
        type: "move",
      },
    ],
  },

  // 其他E2E测试整理
  "test/e2e/workflows/": {
    action: "reorganize",
    files: [
      {
        source: "basic.e2e.test.ts",
        target: "test/jest/e2e/core/basic-workflow.e2e.test.ts",
        type: "move",
      },
      {
        source: "comprehensive-data-flow-e2e.test.ts",
        target: "test/jest/e2e/core/comprehensive-data-flow.e2e.test.ts",
        type: "move",
      },
      {
        source: "comprehensive-monitoring-security-e2e.test.ts",
        target: "test/jest/e2e/monitoring/comprehensive-monitoring.e2e.test.ts",
        type: "move",
      },
      {
        source: "guard-integration.e2e.test.ts",
        target: "test/jest/e2e/auth/guard-integration.e2e.test.ts",
        type: "move",
      },
      {
        source: "working-e2e-test.ts",
        target: "test/jest/e2e/core/working-e2e.e2e.test.ts",
        type: "move",
      },
    ],
  },

  // 集成测试整理
  "test/integration/": {
    action: "reorganize",
    files: [
      {
        source: "api/auth.integration.test.ts",
        target: "test/jest/integration/auth/auth.integration.test.ts",
        type: "move",
      },
      {
        source: "api/enhanced-auth.integration.test.ts",
        target: "test/jest/integration/auth/enhanced-auth.integration.test.ts",
        type: "move",
      },
      {
        source: "api/receiver.integration.test.ts",
        target: "test/jest/integration/core/receiver.integration.test.ts",
        type: "move",
      },
      {
        source: "api/simple-integration.integration.test.ts",
        target:
          "test/jest/integration/core/simple-integration.integration.test.ts",
        type: "move",
      },
      {
        source: "services/core-modules.integration.test.ts",
        target: "test/jest/integration/core/core-modules.integration.test.ts",
        type: "move",
      },
      {
        source: "services/monitoring-security.integration.test.ts",
        target:
          "test/jest/integration/monitoring/monitoring-security.integration.test.ts",
        type: "move",
      },
      {
        source: "services/performance.integration.test.ts",
        target:
          "test/jest/integration/monitoring/performance.integration.test.ts",
        type: "move",
      },
    ],
  },

  // 性能测试迁移
  "test/performance/": {
    action: "migrate",
    files: [
      {
        source: "api-load.perf.test.js",
        target: "test/k6/load/api/api-load.perf.test.js",
        type: "move",
      },
    ],
  },

  // 单元测试整理
  "test/unit/": {
    action: "reorganize",
    files: [
      // 认证相关
      {
        source: "auth/auth.controller.spec.ts",
        target: "test/jest/unit/auth/auth.controller.spec.ts",
        type: "move",
      },
      {
        source: "auth/auth.service.spec.ts",
        target: "test/jest/unit/auth/auth.service.spec.ts",
        type: "move",
      },
      {
        source: "auth/rate-limit.service.spec.ts",
        target: "test/jest/unit/auth/rate-limit.service.spec.ts",
        type: "move",
      },
      // 核心模块
      {
        source: "core/receiver.controller.spec.ts",
        target: "test/jest/unit/core/receiver.controller.spec.ts",
        type: "move",
      },
      {
        source: "core/receiver.service.spec.ts",
        target: "test/jest/unit/core/receiver.service.spec.ts",
        type: "move",
      },
      {
        source: "core/query.controller.spec.ts",
        target: "test/jest/unit/core/query.controller.spec.ts",
        type: "move",
      },
      {
        source: "core/query.service.spec.ts",
        target: "test/jest/unit/core/query.service.spec.ts",
        type: "move",
      },
      {
        source: "core/transformer.service.spec.ts",
        target: "test/jest/unit/core/transformer.service.spec.ts",
        type: "move",
      },
      // 共享组件
      {
        source: "common/cache-optimization.service.spec.ts",
        target: "test/jest/unit/common/cache-optimization.service.spec.ts",
        type: "move",
      },
      {
        source: "common/performance-monitor.service.spec.ts",
        target: "test/jest/unit/common/performance-monitor.service.spec.ts",
        type: "move",
      },
      // 监控相关
      {
        source: "monitoring/monitoring.controller.spec.ts",
        target: "test/jest/unit/monitoring/monitoring.controller.spec.ts",
        type: "move",
      },
      {
        source: "security/security.controller.spec.ts",
        target: "test/jest/unit/monitoring/security.controller.spec.ts",
        type: "move",
      },
    ],
  },

  // Setup文件整理
  "test/setup/": {
    action: "consolidate",
    files: [
      {
        source: "jest.setup.ts",
        target: "test/jest/unit/setup.ts",
        type: "adapt",
      },
      {
        source: "e2e.setup.ts",
        target: "test/jest/e2e/setup.ts",
        type: "adapt",
      },
      {
        source: "integration.setup.ts",
        target: "test/jest/integration/setup.ts",
        type: "adapt",
      },
      {
        source: "global.setup.ts",
        target: "test/config/global.setup.ts",
        type: "adapt",
      },
    ],
  },

  // 工具文件
  "test/utils/": {
    action: "move",
    files: [
      {
        source: "auth-helper.ts",
        target: "test/utils/auth-helper.ts",
        type: "move",
      },
      {
        source: "test-app.ts",
        target: "test/utils/test-app.ts",
        type: "move",
      },
      {
        source: "simple-test-app.ts",
        target: "test/utils/simple-test-app.ts",
        type: "move",
      },
    ],
  },

  // 固定数据
  "test/fixtures/": {
    action: "move",
    files: [
      {
        source: "test-data.ts",
        target: "test/fixtures/test-data.ts",
        type: "move",
      },
    ],
  },
} as const;

/**
 * 重复文件检测和合并计划
 */
export const DUPLICATE_RESOLUTION_PLAN = {
  auth_tests: {
    duplicates: [
      "auth-flow.e2e.test.ts",
      "comprehensive-auth-e2e.test.ts",
      "minimal-auth.e2e.test.ts",
    ],
    resolution: "merge_into_single_comprehensive_auth_test",
    target: "test/jest/e2e/auth/auth-comprehensive.e2e.test.ts",
  },

  rate_limit_tests: {
    duplicates: [
      "rate-limit-debug.e2e.test.ts",
      "rate-limit-system.e2e.test.ts",
      "simple-rate-limit.e2e.test.ts",
      "optimized-dual-rate-limit.e2e.test.ts",
    ],
    resolution: "create_focused_test_suite",
    target: "test/jest/e2e/auth/rate-limit-comprehensive.e2e.test.ts",
  },

  setup_files: {
    duplicates: [
      "jest.setup.ts",
      "e2e.setup.ts",
      "integration.setup.ts",
      "global.setup.ts",
      "setup.ts",
    ],
    resolution: "create_specialized_setup_files",
    targets: [
      "test/config/jest.unit.setup.ts",
      "test/config/jest.integration.setup.ts",
      "test/config/jest.e2e.setup.ts",
      "test/config/global.setup.ts",
    ],
  },
} as const;

/**
 * 文件迁移优先级
 */
export const MIGRATION_PRIORITY = {
  high: [
    "test/e2e/workflows/api.test.ts", // 最大的问题文件
    "test/setup/", // 配置文件先整理
    "test/unit/", // 单元测试基础
  ],
  medium: ["test/e2e/auth/", "test/e2e/rate-limit/", "test/integration/"],
  low: [
    "test/e2e/workflows/",
    "test/performance/",
    "test/utils/",
    "test/fixtures/",
  ],
} as const;

export type MigrationAction =
  | "split"
  | "reorganize"
  | "migrate"
  | "consolidate"
  | "move";
export type MigrationPriority = keyof typeof MIGRATION_PRIORITY;
