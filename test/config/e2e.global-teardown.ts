/**
 * E2E测试全局清理
 * 在所有E2E测试完成后执行的全局清理
 */

import mongoose from "mongoose";
import Redis from "ioredis";
import fs from "fs";
import path from "path";

export default async function globalTeardown() {
  console.log("🧹 开始E2E测试全局清理...");

  try {
    // 清理MongoDB连接
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("✅ E2E MongoDB连接已断开");
    }

    // 停止MongoDB内存服务器（如果在全局设置中启动了）
    const mongoUri = process.env.E2E_MONGO_SERVER_URI;
    if (mongoUri) {
      // 这里通过环境变量获取服务器实例比较困难
      // 实际的清理会在每个测试文件的 afterAll 中进行
      console.log("ℹ️ MongoDB内存服务器将在各测试文件中清理");
    }

    // 清理Redis连接
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.flushdb();
      await redis.quit();
      console.log("✅ E2E Redis连接已清理");
    } catch (error) {
      console.warn("⚠️ Redis清理失败:", error.message);
    }

    // 清理环境变量
    delete process.env.E2E_MONGO_SERVER_URI;

    // 清理临时文件
    try {
      const tempDir = path.join(process.cwd(), "temp");
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("✅ 临时文件已清理");
      }
    } catch (error) {
      console.warn("⚠️ 临时文件清理失败:", error.message);
    }

    // 生成测试报告摘要
    try {
      const testResultsDir = path.join(process.cwd(), "test-results");
      if (fs.existsSync(testResultsDir)) {
        const files = fs.readdirSync(testResultsDir);
        if (files && Array.isArray(files)) {
          const htmlReports = files.filter((f) => f && f.endsWith(".html"));

          if (htmlReports.length > 0) {
            console.log(`📊 生成了 ${htmlReports.length} 个测试报告:`);
            htmlReports.forEach((report) => {
              console.log(`   - ${report}`);
            });
          }
        }
      }
    } catch (error) {
      console.warn("⚠️ 生成测试报告摘要失败:", error.message);
    }

    console.log("✅ E2E测试全局清理完成");
  } catch (error) {
    console.error("❌ E2E测试全局清理失败:", error);
    // 不抛出错误，避免影响测试结果
  }
}
