/**
 * 真实环境黑盒测试环境变量配置
 */

// 设置测试环境
process.env.NODE_ENV = "test";

// 真实项目连接配置
process.env.TEST_BASE_URL =
  process.env.TEST_BASE_URL || "http://localhost:3000";

// 测试超时配置
process.env.TEST_TIMEOUT = process.env.TEST_TIMEOUT || "120000";

// 日志级别
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "info";

console.log("🔧 真实环境黑盒测试配置加载完成");
console.log(`   项目地址: ${process.env.TEST_BASE_URL}`);
console.log(`   测试超时: ${process.env.TEST_TIMEOUT}ms`);
