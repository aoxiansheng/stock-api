import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";

// 导入所有配置
import { appConfig } from "../config/app.config";
import { FeatureFlags } from "../config/feature-flags.config";

// 精简：移除旧Auth配置依赖
import commonConstantsConfig from "../../common/config/common-constants.config";
// notification-enhanced.config.ts已被删除，改用统一配置系统

/**
 * ConfigurationModule - 配置管理核心模块
 *
 * 职责：
 * - 集中管理所有应用配置
 * - 提供配置验证机制
 * - 管理功能开关
 * - 环境变量处理
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        appConfig, // 应用基础配置
        () => ({
          featureFlags: new FeatureFlags(), // 功能开关配置
        }),

        // 移除旧 Auth 配置层
        // 已移除 Cache 模块内部配置，改为组件内默认值与调用端显式 TTL
        commonConstantsConfig, // Common模块统一配置
      ],
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: Joi.object({
        // 基础
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .required(),
        PORT: Joi.number().integer().min(1).max(65535).optional(),

        // 数据库/缓存
        MONGODB_URI: Joi.string()
          .pattern(/^mongodb:\/\//)
          .required(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().integer().min(1).optional(),

        // 安全
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string()
          .pattern(/^(\d+[smhd]|\d+)$/)
          .optional(),

        // LongPort（可选）
        LONGPORT_APP_KEY: Joi.string().optional(),
        LONGPORT_APP_SECRET: Joi.string().optional(),
        LONGPORT_ACCESS_TOKEN: Joi.string().optional(),

        // 功能开关（字符串布尔）
        AUTO_INIT_ENABLED: Joi.boolean()
          .truthy("true")
          .falsy("false")
          .optional(),
        MONITORING_ENABLED: Joi.boolean()
          .truthy("true")
          .falsy("false")
          .optional(),

        // Cache 组件不再依赖环境变量；TTL 由调用方传入或使用组件内默认值

        // Common模块配置环境变量
        DEFAULT_BATCH_SIZE: Joi.number().integer().min(1).max(10000).optional(),
        MAX_BATCH_SIZE: Joi.number().integer().min(100).max(50000).optional(),
        DEFAULT_PAGE_SIZE: Joi.number().integer().min(1).max(1000).optional(),
        MAX_PAGE_SIZE: Joi.number().integer().min(10).max(5000).optional(),
        MAX_CONCURRENT: Joi.number().integer().min(1).max(100).optional(),
        QUICK_TIMEOUT_MS: Joi.number()
          .integer()
          .min(1000)
          .max(30000)
          .optional(),
        DEFAULT_TIMEOUT_MS: Joi.number()
          .integer()
          .min(5000)
          .max(300000)
          .optional(),
        LONG_TIMEOUT_MS: Joi.number()
          .integer()
          .min(30000)
          .max(600000)
          .optional(),
        CONNECTION_TIMEOUT_MS: Joi.number()
          .integer()
          .min(1000)
          .max(60000)
          .optional(),
        MAX_RETRY_ATTEMPTS: Joi.number().integer().min(1).max(20).optional(),
        BACKOFF_BASE: Joi.number().integer().min(1).max(10).optional(),
        MAX_RETRY_DELAY_MS: Joi.number()
          .integer()
          .min(1000)
          .max(300000)
          .optional(),
        CRITICAL_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).optional(),
        FAST_OPERATION_THRESHOLD_MS: Joi.number()
          .integer()
          .min(10)
          .max(1000)
          .optional(),
        NORMAL_OPERATION_THRESHOLD_MS: Joi.number()
          .integer()
          .min(100)
          .max(5000)
          .optional(),
        SLOW_OPERATION_THRESHOLD_MS: Joi.number()
          .integer()
          .min(500)
          .max(30000)
          .optional(),
        VERY_SLOW_OPERATION_THRESHOLD_MS: Joi.number()
          .integer()
          .min(1000)
          .max(60000)
          .optional(),
        CRITICAL_OPERATION_THRESHOLD_MS: Joi.number()
          .integer()
          .min(5000)
          .max(300000)
          .optional(),
        LOW_MEMORY_THRESHOLD_MB: Joi.number()
          .integer()
          .min(10)
          .max(1000)
          .optional(),
        NORMAL_MEMORY_THRESHOLD_MB: Joi.number()
          .integer()
          .min(50)
          .max(2000)
          .optional(),
        HIGH_MEMORY_THRESHOLD_MB: Joi.number()
          .integer()
          .min(100)
          .max(8000)
          .optional(),
        CRITICAL_MEMORY_THRESHOLD_MB: Joi.number()
          .integer()
          .min(200)
          .max(16000)
          .optional(),
        MAX_OBJECT_SIZE_MB: Joi.number().integer().min(1).max(100).optional(),
        MAX_REQUEST_SIZE_MB: Joi.number().integer().min(1).max(500).optional(),
        MIN_CONNECTION_POOL_SIZE: Joi.number()
          .integer()
          .min(1)
          .max(50)
          .optional(),
        MAX_CONNECTION_POOL_SIZE: Joi.number()
          .integer()
          .min(5)
          .max(500)
          .optional(),
        SMALL_SIZE_LIMIT: Joi.number().integer().min(10).max(200).optional(),
        MEDIUM_SIZE_LIMIT: Joi.number().integer().min(50).max(1000).optional(),
        LARGE_SIZE_LIMIT: Joi.number().integer().min(100).max(5000).optional(),
        HUGE_SIZE_LIMIT: Joi.number().integer().min(500).max(50000).optional(),
        MASSIVE_SIZE_LIMIT: Joi.number()
          .integer()
          .min(1000)
          .max(500000)
          .optional(),
      }).unknown(true),
    }),
  ],
  providers: [
    ConfigService,
    FeatureFlags, // 添加FeatureFlags provider
  ],
  exports: [
    ConfigModule,
    ConfigService,
    FeatureFlags, // 导出FeatureFlags
  ],
})
export class ConfigurationModule {}
