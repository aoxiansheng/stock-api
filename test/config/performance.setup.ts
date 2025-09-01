/**
 * Performance Test Setup
 * 配置性能测试环境，启用垃圾回收监控
 */

// 启用垃圾回收监控
if (typeof global.gc === "undefined") {
  // 如果 GC 不可用，提供模拟函数
  (global as any).gc = () => {
    console.warn(
      "⚠️ Garbage collection not exposed. Run with --expose-gc flag for accurate memory testing.",
    );
  };
}

// 性能测试全局配置
beforeAll(() => {
  console.log("🚀 Performance test environment initialized");
  console.log("💾 Memory monitoring enabled");
  console.log("⚡ High-concurrency testing ready");
});

afterAll(() => {
  console.log("✅ Performance test environment cleaned up");
});

// 每个测试前记录内存状态
beforeEach(() => {
  const memUsage = process.memoryUsage();
  console.log(
    `📊 Test start memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
});

// 每个测试后进行垃圾回收
afterEach(() => {
  if (global.gc) {
    global.gc();
  }
  const memUsage = process.memoryUsage();
  console.log(
    `📊 Test end memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
});
