/**
 * Performance Test Environment Variables
 * 设置性能测试专用的环境变量
 */

// 性能测试环境变量
process.env.NODE_ENV = "test";
process.env.DISABLE_AUTO_INIT = "true";

// MongoDB 测试数据库
process.env.MONGODB_URI_TEST =
  "mongodb://localhost:27017/symbol-mapper-performance-test";

// Redis 测试配置
process.env.REDIS_URL_TEST = "redis://localhost:6379/15";

// 缓存配置优化 - 性能测试专用
process.env.SYMBOL_MAPPING_CACHE_ENABLED = "true";
process.env.RULE_CACHE_MAX_SIZE = "200";
process.env.RULE_CACHE_TTL = "600000";
process.env.SYMBOL_CACHE_MAX_SIZE = "5000";
process.env.SYMBOL_CACHE_TTL = "300000";
process.env.BATCH_RESULT_CACHE_MAX_SIZE = "2000";
process.env.BATCH_RESULT_CACHE_TTL = "7200000";

// 日志级别 - 性能测试期间减少日志输出
process.env.LOG_LEVEL = "warn";

// 垃圾回收暴露
process.env.NODE_OPTIONS = "--expose-gc";

console.log("⚡ Performance test environment variables loaded");
console.log(
  `📊 Cache config: Rules=${process.env.RULE_CACHE_MAX_SIZE}, Symbols=${process.env.SYMBOL_CACHE_MAX_SIZE}, Batch=${process.env.BATCH_RESULT_CACHE_MAX_SIZE}`,
);
