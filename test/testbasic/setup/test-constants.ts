/**
 * 测试常量定义
 * 提供测试中使用的标准常量和配置
 */

export const TEST_CONSTANTS = {
  // 测试用户ID
  USER_IDS: {
    ADMIN: '507f1f77bcf86cd799439021',
    DEVELOPER: '507f1f77bcf86cd799439022',
    GUEST: '507f1f77bcf86cd799439023',
    DEFAULT: '507f1f77bcf86cd799439011',
  },

  // 测试API Key
  API_KEYS: {
    VALID: 'ak_live_1234567890abcdef1234567890abcdef',
    EXPIRED: 'ak_live_expired345678expired345678expired34',
    READONLY: 'ak_live_readonly123456readonly123456readonly',
    FULLPERM: 'ak_live_fullperm789012fullperm789012fullperm',
  },

  // 测试JWT Token
  JWT_TOKENS: {
    VALID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.access.token',
    EXPIRED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token',
    REFRESH: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.refresh.token',
  },

  // 测试时间
  TIMESTAMPS: {
    PAST: new Date('2023-01-01T10:00:00.000Z'),
    CURRENT: new Date('2024-01-01T10:00:00.000Z'),
    FUTURE: new Date('2025-01-01T10:00:00.000Z'),
    RECENT: new Date('2024-01-01T11:30:00.000Z'),
  },

  // 测试邮箱
  EMAILS: {
    ADMIN: 'admin@example.com',
    DEVELOPER: 'developer@example.com',
    GUEST: 'guest@example.com',
    TEST: 'test@example.com',
    UPDATED: 'updated@example.com',
  },

  // 测试用户名
  USERNAMES: {
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    GUEST: 'guest',
    TEST: 'testuser',
  },

  // 缓存键前缀
  CACHE_KEYS: {
    AUTH: 'auth:',
    SESSION: 'auth:session:',
    API_KEY: 'auth:apikey:',
    PERMISSION: 'auth:permission:',
    RATE_LIMIT: 'auth:ratelimit:',
    DATA: 'data:',
    MONITORING: 'monitoring:',
    TEST: 'test:',
  },

  // HTTP状态码
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },

  // 测试配置
  TEST_CONFIG: {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 100,
    BATCH_SIZE: 10,
    PAGE_SIZE: 20,
  },

  // 错误消息
  ERROR_MESSAGES: {
    INVALID_ID: '无效的ID格式',
    NOT_FOUND: '资源未找到',
    UNAUTHORIZED: '未授权访问',
    FORBIDDEN: '权限不足',
    VALIDATION_FAILED: '数据验证失败',
    CACHE_ERROR: '缓存操作失败',
    DATABASE_ERROR: '数据库操作失败',
  },

  // 权限
  PERMISSIONS: {
    DATA_READ: 'data:read',
    DATA_WRITE: 'data:write',
    USER_MANAGE: 'user:manage',
    SYSTEM_ADMIN: 'system:admin',
  },

  // 用户角色
  USER_ROLES: {
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    GUEST: 'guest',
  },

  // 操作状态
  OPERATION_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
  },

  // 测试数据大小
  DATA_SIZES: {
    SMALL: 100,
    MEDIUM: 1000,
    LARGE: 10000,
    BATCH_SMALL: 10,
    BATCH_MEDIUM: 50,
    BATCH_LARGE: 100,
  },

  // 测试延迟
  DELAYS: {
    SHORT: 100,
    MEDIUM: 500,
    LONG: 1000,
    TIMEOUT: 5000,
  },

  // 正则表达式
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    OBJECT_ID: /^[0-9a-fA-F]{24}$/,
    API_KEY: /^ak_(live|test)_[a-zA-Z0-9]{32}$/,
    JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  },

  // 环境配置
  ENVIRONMENT: {
    NODE_ENV: 'test',
    DISABLE_AUTO_INIT: true,
    LOG_LEVEL: 'error',
    CACHE_ENABLED: true,
    COMPRESSION_ENABLED: false,
  },
} as const;

/**
 * 测试环境变量
 */
export const TEST_ENV_VARS = {
  NODE_ENV: 'test',
  DISABLE_AUTO_INIT: 'true',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  JWT_EXPIRES_IN: '24h',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  MONGODB_URI: 'mongodb://localhost:27017/test-smart-stock-data',
  LOG_LEVEL: 'error',
} as const;

/**
 * 测试数据生成器配置
 */
export const TEST_DATA_CONFIG = {
  // 用户数据生成
  USER_GENERATION: {
    DEFAULT_PASSWORD_HASH: '$2b$12$hashedpassword.example.hash.string',
    DEFAULT_ROLE: 'developer',
    DEFAULT_STATUS: 'active',
  },

  // API Key数据生成
  API_KEY_GENERATION: {
    DEFAULT_PREFIX: 'ak_live_',
    DEFAULT_LENGTH: 32,
    DEFAULT_PERMISSIONS: ['data:read'],
    DEFAULT_RATE_LIMIT: {
      requestsPerMinute: 1000,
      requestsPerDay: 50000,
    },
  },

  // 缓存数据生成
  CACHE_GENERATION: {
    DEFAULT_TTL: 300,
    COMPRESSION_THRESHOLD: 1024,
    MAX_BATCH_SIZE: 100,
    KEY_PREFIX: 'test:',
  },
} as const;