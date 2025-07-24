/**
 * E2E测试环境变量配置
 * 设置端到端测试的完整环境配置
 */

// 设置测试环境
process.env.NODE_ENV = "test-e2e";

// 数据库配置 - 将由MongoDB Memory Server动态设置
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27019/test-e2e";
process.env.REDIS_URL = "redis://localhost:6379/3"; // 使用专用的Redis数据库

// 认证配置
process.env.JWT_SECRET = "e2e-test-jwt-secret-key-for-testing-only";
process.env.JWT_EXPIRES_IN = "1d";

// 应用配置
process.env.PORT = "3003";
process.env.NODE_OPTIONS = "--max-old-space-size=6144";

// LongPort API配置 - E2E测试使用开发环境的真实凭据
process.env.LONGPORT_APP_KEY = "dda77f94a1a12559e46b31c349c4049e";
process.env.LONGPORT_APP_SECRET =
  "2aaf7ed9ab25f152b78d8ae164581ababbd3896b68f5b7fbd0900f6a019e4557";
process.env.LONGPORT_ACCESS_TOKEN =
  "m_eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsb25nYnJpZGdlIiwic3ViIjoiYWNjZXNzX3Rva2VuIiwiZXhwIjoxNzU4OTU1MjM4LCJpYXQiOjE3NTExNzkyMzgsImFrIjoiZGRhNzdmOTRhMWExMjU1OWU0NmIzMWMzNDljNDA0OWUiLCJhYWlkIjoyMDYzMjUyNiwiYWMiOiJsYiIsIm1pZCI6ODQ4Mzc4LCJzaWQiOiIvaGZNc3RiR21SV3BVRjBGcFFKUnNRPT0iLCJibCI6MywidWwiOjAsImlrIjoibGJfMjA2MzI1MjYifQ.5O5KPuMC1jUh9hZCcYMhRHNIyAS3l9SguWh3Zp_pn67bJH2sNYRSk9_qTWywUkKt5RMyq_XOtOkVV-8WUp0m5fkyxwPd1FgTl_0LCAQ5ECYpBNSAeUlZg0m6uaU_JaBFQyH54p1sMemoXdz3IMDuVGNuxxsMi_VqGG1GQFEIL5lQXLVpeGN1NM50v1hmSyXGGZKtyQSHbLr3H8xg7Nb8MwXeh3n0ucpzQG5LRFJeUOWet4uUNLehI-faPwRbkWkjccmfIjOHH386zZjl00ZnhFVG3WpsPxjT8sphMaeCYjQi7CaMRjl0wp5ab3v0FQVq2kgPyxzFW_IHdxmn9sefpaiPTVVLapASJsQ2halK4iKcJPAeJcEoTenT9WRwIFIgdnpmgP0uA-bJkVkUM-uZ2MeSrAxar5GTTP4Cu1WdrlsKuOoGnSHLAIdMevr0UNqy-NhOu_0JlOtd0Cpgb4Xn4rFHEA2Mq5y5hfHoj10G9G2GqwKBYKhDSyefrk9dSoY5_GBLtgGaLaSO8uqCcJ62OpwEHJ9xkFePJoKmiYHeviNldHqEAbPo0---kqedICtJC440mBDA_GF9Nri6o9VgLtmOfpb7IbRBQSN3aC3dz76Pp_DWCfxhDd28uCHnrdLAX7Z7Rk38KmoJ5YJZg3bnxuFPbenS5uOIZtOpzIy-lp4";

// 日志配置 - E2E测试需要详细日志
process.env.LOG_LEVEL = "debug";

// 外部API配置 - E2E测试使用真实API以测试完整流程
process.env.DISABLE_EXTERNAL_APIS = "false";
process.env.MOCK_EXTERNAL_SERVICES = "false"; // E2E测试使用真实API

// 测试数据配置
process.env.TEST_DATA_DIR = "test/fixtures";
process.env.USE_REAL_DATABASE = "true";

// 性能监控配置 - E2E测试需要测试完整功能
process.env.ENABLE_PERFORMANCE_MONITORING = "true";
process.env.ENABLE_METRICS_COLLECTION = "true";

// 缓存配置 - E2E测试使用完整缓存功能
process.env.CACHE_TYPE = "redis";
process.env.CACHE_TTL = "600";

// 频率限制器（Throttler）配置 - 为E2E测试提供宽松的限制
process.env.THROTTLER_TTL = "1000"; // 1秒
process.env.THROTTLER_LIMIT = "1000"; // 每秒1000次请求

// 安全配置 - E2E测试需要测试安全功能
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "1000"; // E2E测试需要较高限制

// 允许E2E测试环境使用代理头部
process.env.ALLOW_PROXY_HEADERS_IN_TEST = "true";

// CORS配置
process.env.CORS_ENABLED = "true";
process.env.CORS_ORIGIN = "*";

// 文件上传配置
process.env.MAX_FILE_SIZE = "10MB";
process.env.UPLOAD_PATH = "uploads/test";

// 邮件配置 - E2E测试使用Mock
process.env.MAIL_ENABLED = "false";
process.env.MAIL_PROVIDER = "mock";

// WebSocket配置
process.env.WEBSOCKET_ENABLED = "true";
process.env.WEBSOCKET_PORT = "3004";

// 健康检查配置
process.env.HEALTH_CHECK_ENABLED = "true";
process.env.HEALTH_CHECK_PATH = "/health";

// 数据库连接池配置
process.env.DB_MAX_POOL_SIZE = "10";
process.env.DB_MIN_POOL_SIZE = "2";
process.env.DB_CONNECTION_TIMEOUT = "30000";

// 并发配置
process.env.MAX_CONCURRENT_REQUESTS = "50";
process.env.REQUEST_TIMEOUT = "60000";

// Swagger配置
process.env.SWAGGER_ENABLED = "true";
process.env.SWAGGER_PATH = "api/docs";

// E2E测试专用标志
process.env.IS_E2E_TEST = "true";
process.env.SKIP_AUTH_GUARD = "false"; // E2E测试必须测试完整的认证流程
process.env.ENABLE_REQUEST_LOGGING = "true";

// 测试超时配置
process.env.TEST_TIMEOUT = "60000";
process.env.APP_STARTUP_TIMEOUT = "30000";

console.log("E2E测试环境变量已加载");
