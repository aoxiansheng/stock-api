/**
 * E2E测试全局启动设置
 * 在所有E2E测试开始前执行的全局设置
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import * as fs from "fs";

let mongoServer: MongoMemoryServer;

export default async function globalSetup() {
  console.log("🌍 开始E2E测试全局设置...");

  try {
    // 启动专用的MongoDB内存服务器
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "test-e2e-global",
        port: 27020,
      },
    });

    const mongoUri = mongoServer.getUri();

    // 设置全局环境变量
    process.env.MONGODB_URI = mongoUri;
    process.env.E2E_MONGO_SERVER_URI = mongoUri;

    console.log(`✅ E2E全局MongoDB服务器启动: ${mongoUri}`);

    // 验证数据库连接
    await mongoose.connect(mongoUri);

    console.log("✅ E2E数据库连接验证成功");

    await mongoose.disconnect();

    // 设置Redis配置
    process.env.REDIS_URL = "redis://localhost:6379/4";

    // 使用try-catch包裹目录创建逻辑，避免因此中断测试
    try {
      // 创建必要的目录，使用require方式导入的fs
      const testResultsDir = "./test-results";
      if (!fs.existsSync(testResultsDir)) {
        fs.mkdirSync(testResultsDir, { recursive: true });
        console.log("✅ 测试结果目录已创建");
      }
  
      const coverageDir = "./coverage";
      if (!fs.existsSync(coverageDir)) {
        fs.mkdirSync(coverageDir, { recursive: true });
        console.log("✅ 覆盖率目录已创建");
      }
    } catch (dirError) {
      console.warn("⚠️ 创建目录时出错，但测试将继续:", dirError);
      // 不抛出错误，避免中断测试
    }

    console.log("✅ E2E测试全局设置完成");
  } catch (error) {
    console.error("❌ E2E测试全局设置失败:", error);
    throw error;
  }
}
