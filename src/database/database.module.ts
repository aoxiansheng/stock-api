import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

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
    // MongoDB核心连接 - 只初始化一次
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data",
      {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 100,
      },
    ),
  ],
  exports: [
    // 导出 MongooseModule 供业务模块使用（连接复用）
    MongooseModule,
  ],
})
export class DatabaseModule {}
