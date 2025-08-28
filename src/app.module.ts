import { RedisModule } from "@liaoliaots/nestjs-redis";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { DatabaseModule } from "./database/database.module"; // 🆕 统一数据库模块
import { AlertModule } from "./alert/module/alert.module";
import { AuthModule } from "./auth/module/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { ApiKeyAuthGuard } from "./auth/guards/apikey-auth.guard";
import { UnifiedPermissionsGuard } from "./auth/guards/unified-permissions.guard";
import { RateLimitGuard } from "./auth/guards/rate-limit.guard";
import { QueryModule } from "./core/01-entry/query/module/query.module";
import { ReceiverModule } from "./core/01-entry/receiver/module/receiver.module";
import { StreamReceiverModule } from "./core/01-entry/stream-receiver/module/stream-receiver.module";
import { StorageModule } from "./core/04-storage/storage/module/storage.module";
import { SmartCacheModule } from "./core/05-caching/smart-cache/module/smart-cache.module";
import { SymbolMapperModule } from "./core/00-prepare/symbol-mapper/module/symbol-mapper.module";
import { DataMapperModule } from "./core/00-prepare/data-mapper/module/data-mapper.module";
import { TransformerModule } from "./core/02-processing/transformer/module/data-transformer.module";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { ProvidersModule } from "./providers/module/providers.module";
import { AutoInitModule } from "./scripts/module/auto-init-on-startup.module";

import { RATE_LIMIT_CONFIG } from "./common/constants/rate-limit.constants";
import { PermissionValidationModule } from "./common/modules/permission/modules/permission-validation.module";
import { PaginationModule } from "./common/modules/pagination/modules/pagination.module";

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || "development"}`,
    }),

    // 速率限制模块
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.TTL,
        limit: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.LIMIT,
      },
    ]),

    // 统一数据库模块 (替换原有MongooseModule.forRoot)
    DatabaseModule,

    // Redis连接
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: RATE_LIMIT_CONFIG.REDIS.MAX_RETRIES,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: RATE_LIMIT_CONFIG.REDIS.CONNECTION_TIMEOUT,
        commandTimeout: RATE_LIMIT_CONFIG.REDIS.COMMAND_TIMEOUT,
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

    // 通用模块
    PaginationModule,

    // 核心模块
    ReceiverModule,
    StreamReceiverModule,  // WebSocket 流接收器
    SymbolMapperModule,
    DataMapperModule,
    TransformerModule,
    StorageModule,
    SmartCacheModule,      // 智能缓存编排器模块（可选导入，不影响DI可见性）
    QueryModule,

    // 数据源模块
    ProvidersModule,

    // 自动初始化模块
    AutoInitModule,

    // 认证模块
    AuthModule,

    // 统一监控模块 (包含原 PresenterModule 和 AnalyzerModule)
    MonitoringModule,

    // 告警模块
    AlertModule,

 

    // 权限验证模块
    PermissionValidationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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
      useClass: RateLimitGuard, // API Key频率限制
    },
    {
      provide: APP_GUARD,
      useClass: UnifiedPermissionsGuard, // 权限检查最后执行
    },
  ],
})
export class AppModule {}