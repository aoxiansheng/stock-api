import { RedisModule } from "@liaoliaots/nestjs-redis";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AlertModule } from "./alert/module/alert.module";
import { AuthModule } from "./auth/module/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { ApiKeyAuthGuard } from "./auth/guards/apikey-auth.guard";
import { UnifiedPermissionsGuard } from "./auth/guards/unified-permissions.guard";
import { RateLimitGuard } from "./auth/guards/rate-limit.guard";
import { DataMapperModule } from "./core/public/data-mapper/module/data-mapper.module";
import { QueryModule } from "./core/restapi/query/module/query.module";
import { ReceiverModule } from "./core/restapi/receiver/module/receiver.module";
import { StreamReceiverModule } from "./core/stream/stream-receiver/module/stream-receiver.module";
import { StorageModule } from "./core/public/storage/module/storage.module";
import { SymbolSmartCacheModule } from "./core/public/symbol-smart-cache/module/symbol-smart-cache.module";
import { SymbolMapperModule } from "./core/public/symbol-mapper/module/symbol-mapper.module";
import { TransformerModule } from "./core/public/transformer/module/transformer.module";
import { MetricsModule } from "./metrics/module/metrics.module";
import { MonitoringModule } from "./monitoring/module/monitoring.module";
import { ProvidersModule } from "./providers/module/providers.module";
import { AutoInitModule } from "./scripts/module/auto-init-on-startup.module";
import { SecurityModule } from "./security/module/security.module";
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

    // 数据库连接
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data",
      {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 100, // 使用正确的连接池大小配置
      },
    ),

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
    SymbolSmartCacheModule,      // 智能缓存编排器模块（可选导入，不影响DI可见性）
    QueryModule,

    // 数据源模块
    ProvidersModule,

    // 自动初始化模块
    AutoInitModule,

    // 认证模块
    AuthModule,

    // 监控模块
    MonitoringModule,

    // 告警模块
    AlertModule,

    // 安全模块
    SecurityModule,

    // 指标模块
    MetricsModule,

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
