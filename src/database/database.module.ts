import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// 导入领域数据库模块
import { AuthDatabaseModule } from "./domains/auth.database";
import { CoreDatabaseModule } from "./domains/core.database";
import { NotificationDatabaseModule } from "./domains/notification.database";

/**
 * 统一数据库模块
 *
 * 功能：
 * - 统一管理MongoDB连接
 * - 聚合所有领域数据库模块
 * - 消除MongooseModule重复初始化问题
 * - 提供统一的数据访问入口
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

    // 领域数据库模块
    AuthDatabaseModule,
    CoreDatabaseModule,
    NotificationDatabaseModule,
  ],
  exports: [
    // 导出领域模块供业务模块使用
    AuthDatabaseModule,
    CoreDatabaseModule,
    NotificationDatabaseModule,
  ],
})
export class DatabaseModule {}
