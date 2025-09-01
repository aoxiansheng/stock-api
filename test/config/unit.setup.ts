/**
 * 单元测试全局设置
 * 设置单元测试环境，Mock外部依赖
 */

import { jest } from "@jest/globals";

// 设置测试超时
jest.setTimeout(5000);

// Mock外部依赖 - 单元测试应该完全隔离
beforeAll(() => {
  // Mock环境变量
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  process.env.REDIS_URL = "redis://localhost:6379";

  // Mock NestJS Guards and Auth services globally to prevent dependency resolution issues
  jest.doMock("@auth/guards/unified-permissions.guard", () => ({
    UnifiedPermissionsGuard: class MockUnifiedPermissionsGuard {
      canActivate() {
        return true;
      }
    },
  }));

  jest.doMock("@auth/services/permission.service", () => ({
    PermissionService: class MockPermissionService {
      hasPermission() {
        return true;
      }
      checkPermissions() {
        return true;
      }
      getUserPermissions() {
        return ["data:read", "data:write"];
      }
      validateApiKeyPermissions() {
        return true;
      }
      validateUserRolePermissions() {
        return true;
      }
    },
  }));
});

// 每个测试前清理
beforeEach(() => {
  jest.clearAllMocks();
});

// 每个测试后清理
afterEach(() => {
  jest.restoreAllMocks();
});

// 测试结束后清理
afterAll(() => {
  jest.clearAllTimers();
});

// 全局测试工具函数
global.createMockUser = () => ({
  id: "507f1f77bcf86cd799439011",
  username: "testuser",
  email: "test@example.com",
  role: "developer",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

global.createMockApiKey = () => ({
  id: "507f1f77bcf86cd799439012",
  appKey: "test-app-key",
  accessToken: "test-access-token",
  name: "Test API Key",
  userId: "507f1f77bcf86cd799439011",
  permissions: ["data:read", "query:execute"],
  isActive: true,
  usageCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 导入共享测试配置
const globalTestConfig = {
  // 默认超时时间
  DEFAULT_TIMEOUT: 5000,

  // 性能基准
  PERFORMANCE_THRESHOLDS: {
    STRING_SIMILARITY: 10, // StringUtils.calculateSimilarity < 10ms
    STRING_HASH: 5, // StringUtils.generateHash < 5ms
    OBJECT_TRAVERSE: 20, // ObjectUtils深度遍历 < 20ms
    MARKET_STATUS_CACHE_HIT: 5, // 缓存命中 < 5ms (more realistic)
    MARKET_STATUS_CACHE_MISS: 100, // 缓存未命中 < 100ms
    DATA_CHANGE_DETECTION: 50, // 变更检测 < 50ms
    QUICK_CHECKSUM: 10, // 快速校验和 < 10ms
  },

  // 缓存相关
  CACHE_CONFIG: {
    MIN_HIT_RATE: 0.8, // 最低缓存命中率80%
    MAX_CACHE_SIZE: 1000, // 测试用最大缓存大小
    TEST_TTL: 1000, // 测试用TTL 1秒
  },

  // 测试数据配置
  TEST_DATA: {
    SAMPLE_SYMBOLS: ["700.HK", "AAPL.US", "000001.SZ", "600036.SH"],
    LARGE_DATASET_SIZE: 1000,
    PERFORMANCE_TEST_ITERATIONS: 100,
  },
};

// 导出全局配置供测试使用
(global as any).testConfig = globalTestConfig;

// 抑制控制台输出，除非是错误
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // 保留错误输出用于调试
};
