import { RedisModule } from "@liaoliaots/nestjs-redis";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule , ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";


import { AlertModule } from "./alert/alert.module";
import { AuthModule } from "./auth/auth.module";
import { DataMapperModule } from "./core/data-mapper/data-mapper.module";
import { QueryModule } from "./core/query/query.module";
import { ReceiverModule } from "./core/receiver/receiver.module";
import { StorageModule } from "./core/storage/storage.module";
import { SymbolMapperModule } from "./core/symbol-mapper/symbol-mapper.module";
import { TransformerModule } from "./core/transformer/transformer.module";
import { MetricsModule } from './metrics/metrics.module';
import { MonitoringModule } from "./monitoring/monitoring.module";
import { ProvidersModule } from "./providers/providers.module";
import { AutoInitModule } from "./scripts/auto-init-on-startup.module";
import { SecurityModule } from "./security/security.module";
import { RATE_LIMIT_CONFIG } from "./common/constants/rate-limit.constants";

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || "development"}`,
    }),

    // 速率限制模块
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [{
        ttl: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.TTL,
        limit: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.LIMIT,
      }],
    }),

    // 数据库连接
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data",
      {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 100, // 使用正确的连接池大小配置
      }
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

    // 核心模块
    ReceiverModule,
    SymbolMapperModule,
    DataMapperModule,
    TransformerModule,
    StorageModule,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
