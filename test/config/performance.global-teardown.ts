/**
 * Performance Test Global Teardown
 * 全局性能测试环境清理
 */

export default async function globalTeardown() {
  console.log("🧹 Starting performance test global teardown...");

  // 最终垃圾回收
  if (global.gc) {
    global.gc();
    console.log("🗑️ Final garbage collection completed");
  }

  // 记录最终系统状态
  const finalMemory = process.memoryUsage();
  console.log(
    `📊 Final system memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );

  // 清理数据库连接等资源
  try {
    console.log("🔌 Cleaning up database connections...");
    // 这里可以添加数据库连接清理逻辑
  } catch (error) {
    console.error("❌ Cleanup error:", error.message);
  }

  console.log("✅ Performance test global teardown completed");
}
