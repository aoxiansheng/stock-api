/**
 * 单元测试环境变量配置
 * 设置单元测试专用的环境变量
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 数据库配置 - 单元测试不连接真实数据库
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-unit';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// 认证配置
process.env.JWT_SECRET = 'unit-test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// 应用配置
process.env.PORT = '3001';
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// LongPort API配置 - 使用测试凭证
process.env.LONGPORT_APP_KEY = 'test-app-key';
process.env.LONGPORT_APP_SECRET = 'test-app-secret';
process.env.LONGPORT_ACCESS_TOKEN = 'test-access-token';

// 日志配置
process.env.LOG_LEVEL = 'error'; // 单元测试时只输出错误日志

// 禁用外部API调用
process.env.DISABLE_EXTERNAL_APIS = 'true';

// 测试数据配置
process.env.TEST_DATA_DIR = 'test/fixtures';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

// 性能监控配置 - 测试环境禁用
process.env.ENABLE_PERFORMANCE_MONITORING = 'false';
process.env.ENABLE_METRICS_COLLECTION = 'false';

// 缓存配置 - 单元测试使用内存缓存
process.env.CACHE_TYPE = 'memory';
process.env.CACHE_TTL = '60';

// 安全配置 - 测试环境宽松配置
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.CORS_ENABLED = 'true';

console.log('单元测试环境变量已加载');