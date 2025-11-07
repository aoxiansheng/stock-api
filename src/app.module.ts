import { RedisModule } from "@nestjs-modules/ioredis";
import { BullModule } from "@nestjs/bull";
import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

// 基础设施层模块
import { DatabaseModule } from "./database/database.module"; // 🆕 统一数据库模块

// 应用服务层模块
import { ApplicationModule } from "./appcore/core/application.module";

// 核心业务层模块 - 准备阶段
import { SymbolMapperModule } from "./core/00-prepare/symbol-mapper/module/symbol-mapper.module";
import { DataMapperModule } from "./core/00-prepare/data-mapper/module/data-mapper.module";

// 核心业务层模块 - 入口阶段
import { ReceiverModule } from "./core/01-entry/receiver/module/receiver.module";
import { StreamReceiverModule } from "./core/01-entry/stream-receiver/module/stream-receiver.module";
import { QueryModule } from "./core/01-entry/query/module/query.module";

// 核心业务层模块 - 处理阶段
import { TransformerModule } from "./core/02-processing/transformer/module/data-transformer.module";

// 核心业务层模块 - 存储阶段
import { StorageModule } from "./core/04-storage/storage/module/storage.module";

// 核心业务层模块 - 缓存阶段
import { SmartCacheModule } from "./core/05-caching/module/smart-cache/module/smart-cache.module";

// 领域模块
import { AuthModule as AuthV2Module } from "@authv2/auth.module";
// 监控、告警、通知模块已移除 - 使用外部工具替代
import { ProvidersV2Module } from "@providersv2";
// 移除旧权限验证模块（精简）
import { PaginationModule } from "./common/modules/pagination/modules/pagination.module";

// 安全防护守卫
import { JwtAuthGuard, ApiKeyAuthGuard, PermissionsGuard } from "@authv2/guards";

// 移除旧auth配置（精简）

@Global() // ✅ 添加全局装饰器，使RedisModule全局可用
@Module({
  imports: [
    // ========================================
    // 基础设施层 (Infrastructure Layer)
    // ========================================
    // 配置模块（移除auth旧配置）

    // 统一数据库模块 (替换原有MongooseModule.forRoot)
    DatabaseModule,

    // Redis连接
    RedisModule.forRoot({
      type: "single",
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "localhost"}:${parseInt(process.env.REDIS_PORT) || 6379}`,
      options: {
        enableReadyCheck: false,
        maxRetriesPerRequest: parseInt(
          process.env.AUTH_REDIS_MAX_RETRIES || "3",
        ),
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: parseInt(
          process.env.AUTH_REDIS_CONNECTION_TIMEOUT || "5000",
        ),
        commandTimeout: parseInt(
          process.env.AUTH_REDIS_COMMAND_TIMEOUT || "5000",
        ),
        family: 4,
      },
    }),

    // 消息队列
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),

    // 事件发射器
    EventEmitterModule.forRoot(),

    // ========================================
    // 应用服务层 (Application Services Layer)
    // ========================================
    ApplicationModule,
    PaginationModule, // 通用模块

    // ========================================
    // 核心业务层 (Core Business Layer)
    // ========================================

    // 准备阶段模块
    SymbolMapperModule,
    DataMapperModule,

    // 入口阶段模块
    ReceiverModule,
    StreamReceiverModule, // WebSocket 流接收器
    QueryModule,

    // 处理阶段模块
    TransformerModule,

    // 存储阶段模块
    StorageModule,

    // 缓存阶段模块
    SmartCacheModule, // 智能缓存编排器模块（可选导入，不影响DI可见性）

    // ========================================
    // 领域模块 (Domain Modules)
    // ========================================
    AuthV2Module,
    // MonitoringModule, AlertEnhancedModule, NotificationModule 已移除
    ProvidersV2Module,

    // ========================================
    // 安全防护层 (Security Layer)
    // ========================================
    // 速率限制模块
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || "60000"), // 60秒
        limit: parseInt(process.env.AUTH_RATE_LIMIT_LIMIT || "100"), // 100次
      },
    ]),
  ],
  exports: [
    // ✅ 导出 RedisModule 使其他模块可以使用全局Redis连接
    RedisModule,
  ],
  providers: [
    // 安全防护守卫按执行顺序排列
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 速率限制守卫
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard, // 确保API Key认证先执行
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // JWT认证后执行
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // 权限检查
    },
  ],
})
export class AppModule {}
