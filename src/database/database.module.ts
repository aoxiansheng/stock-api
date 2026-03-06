import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { readIntEnv } from "@common/utils/env.util";

/**
 * 统一数据库模块
 *
 * 功能：
 * - 统一管理 MongoDB 连接
 * - 不再聚合领域 Schema；各业务模块自行 forFeature 注册
 * - 消除重复 Schema 注册与跨域耦合
 *
 * 架构原则：
 * - 严格层次边界：只负责Schema注册，不包含Repository
 * - 领域驱动分离：按业务域组织Schema
 * - 单一注册原则：每个Schema只注册一次
 */
@Module({
  imports: [
    (() => {
      const isTest = process.env.NODE_ENV === "test";
      const maxPoolSize = readIntEnv("MONGODB_POOL_SIZE", 100, {
        min: 1,
        max: 1000,
      });
      const retryAttempts = readIntEnv(
        "MONGODB_RETRY_ATTEMPTS",
        isTest ? 1 : 9,
        { min: 0, max: 100 },
      );
      const retryDelay = readIntEnv(
        "MONGODB_RETRY_DELAY_MS",
        isTest ? 500 : 3000,
        { min: 0, max: 60000 },
      );
      const serverSelectionTimeoutMS = readIntEnv(
        "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
        isTest ? 3000 : 30000,
        { min: 0, max: 120000 },
      );
      const connectTimeoutMS = readIntEnv(
        "MONGODB_CONNECT_TIMEOUT_MS",
        isTest ? 3000 : 30000,
        { min: 0, max: 120000 },
      );

      return MongooseModule.forRoot(
        process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data",
        {
          maxPoolSize,
          retryAttempts,
          retryDelay,
          serverSelectionTimeoutMS,
          connectTimeoutMS,
        },
      );
    })(),
  ],
  exports: [
    // 导出 MongooseModule 供业务模块使用（连接复用）
    MongooseModule,
  ],
})
export class DatabaseModule {}
