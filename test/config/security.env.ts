/**
 * 安全测试环境变量配置
 * 专门用于安全漏洞测试的环境配置
 */

// 设置测试环境
process.env.NODE_ENV = "test-security";

// 数据库配置 - 将由MongoDB Memory Server动态设置
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27021/test-security";
process.env.REDIS_URL = "redis://localhost:6379/5"; // 使用专用的Redis数据库

// 认证配置 - 安全测试使用弱配置以便测试
process.env.JWT_SECRET = "security-test-weak-secret-for-testing"; // 故意使用弱密钥测试
process.env.JWT_EXPIRES_IN = "15m"; // 短过期时间测试

// 应用配置
process.env.PORT = "3005";
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

// LongPort API配置 - 安全测试使用Mock
process.env.LONGPORT_APP_KEY = "security-test-app-key";
process.env.LONGPORT_APP_SECRET = "security-test-app-secret";
process.env.LONGPORT_ACCESS_TOKEN = "security-test-access-token";

// 日志配置 - 安全测试需要详细日志来追踪攻击
process.env.LOG_LEVEL = "warn";

// 外部API配置
process.env.DISABLE_EXTERNAL_APIS = "true";
process.env.MOCK_EXTERNAL_SERVICES = "true";

// 测试数据配置
process.env.TEST_DATA_DIR = "test/fixtures";
process.env.USE_REAL_DATABASE = "true";

// 性能监控配置 - 安全测试启用以监控攻击行为
process.env.ENABLE_PERFORMANCE_MONITORING = "true";
process.env.ENABLE_METRICS_COLLECTION = "true";
process.env.ENABLE_SECURITY_MONITORING = "true";

// 缓存配置
process.env.CACHE_TYPE = "redis";
process.env.CACHE_TTL = "300";

// 频率限制器（Throttler）配置 - 为安全测试提供宽松的限制
process.env.THROTTLER_TTL = "1000"; // 1秒
process.env.THROTTLER_LIMIT = "10000"; // 每秒10000次请求

// 安全配置 - 安全测试需要测试各种安全功能
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "10"; // 严格的限流用于测试

// 允许测试环境使用代理头部进行绕过测试
process.env.ALLOW_PROXY_HEADERS_IN_TEST = "true";

// CORS配置 - 测试CORS绕过
process.env.CORS_ENABLED = "true";
process.env.CORS_ORIGIN = "*";
process.env.CORS_CREDENTIALS = "true";

// 输入验证配置
process.env.INPUT_VALIDATION_ENABLED = "true";
process.env.SANITIZE_INPUT = "true";
process.env.MAX_REQUEST_SIZE = "1MB";

// XSS防护配置
process.env.XSS_PROTECTION_ENABLED = "true";
process.env.CONTENT_SECURITY_POLICY_ENABLED = "true";

// SQL注入防护配置
process.env.SQL_INJECTION_PROTECTION_ENABLED = "true";
process.env.PARAMETERIZED_QUERIES_ONLY = "true";

// 文件上传安全配置
process.env.FILE_UPLOAD_ENABLED = "true";
process.env.MAX_FILE_SIZE = "1MB";
process.env.ALLOWED_FILE_TYPES = "jpg,png,pdf,txt";
process.env.VIRUS_SCAN_ENABLED = "false"; // 测试环境禁用

// 会话安全配置
process.env.SESSION_SECURE_COOKIES = "false"; // HTTP测试环境
process.env.SESSION_SAME_SITE = "lax";
process.env.SESSION_HTTP_ONLY = "true";

// 密码策略配置 - 测试弱密码策略
process.env.PASSWORD_MIN_LENGTH = "6"; // 故意设置较低
process.env.PASSWORD_REQUIRE_UPPERCASE = "false";
process.env.PASSWORD_REQUIRE_LOWERCASE = "false";
process.env.PASSWORD_REQUIRE_NUMBERS = "false";
process.env.PASSWORD_REQUIRE_SYMBOLS = "false";

// 暴力破解防护配置
process.env.BRUTE_FORCE_PROTECTION_ENABLED = "true";
process.env.MAX_LOGIN_ATTEMPTS = "3";
process.env.LOCKOUT_DURATION = "300000"; // 5分钟

// 数据库安全配置
process.env.DB_CONNECTION_ENCRYPTION = "false"; // 测试环境
process.env.DB_QUERY_TIMEOUT = "5000";

// API安全配置
process.env.API_VERSIONING_REQUIRED = "true";
process.env.API_RATE_LIMIT_PER_IP = "50";
process.env.API_REQUIRE_USER_AGENT = "false";

// 错误处理配置 - 安全测试需要详细错误信息
process.env.DETAILED_ERROR_MESSAGES = "true";
process.env.STACK_TRACE_IN_ERRORS = "true";

// 审计日志配置
process.env.AUDIT_LOG_ENABLED = "true";
process.env.AUDIT_LOG_LEVEL = "all";
process.env.AUDIT_LOG_SECURITY_EVENTS = "true";

// 安全测试专用标志
process.env.IS_SECURITY_TEST = "true";
process.env.SECURITY_TEST_MODE = "aggressive";
process.env.ALLOW_DANGEROUS_OPERATIONS = "true"; // 仅测试环境

// 漏洞扫描配置
process.env.VULNERABILITY_SCANNING_ENABLED = "true";
process.env.SECURITY_HEADERS_ENABLED = "true";

// 加密配置 - 测试用弱配置
process.env.ENCRYPTION_ALGORITHM = "aes-256-cbc";
process.env.ENCRYPTION_KEY = "test-weak-encryption-key-32-chars!"; // 32字符密钥

console.log("安全测试环境变量已加载");
