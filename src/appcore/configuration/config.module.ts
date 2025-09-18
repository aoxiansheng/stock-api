import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";

// 导入所有配置
import { appConfig } from "../config/app.config";
import { FeatureFlags } from "../config/feature-flags.config";
import alertConfig from "../../alert/config/alert.config";
import { securityConfig } from "../../auth/config/security.config";
import authUnifiedConfig from "../../auth/config/auth-unified.config";
import cacheUnifiedConfig from "../../cache/config/cache-unified.config";
import commonConstantsConfig from "../../common/config/common-constants.config";
// 通知配置由NotificationModule直接处理配置注册
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
        alertConfig, // 告警配置
        () => ({ security: securityConfig }), // 安全配置
        authUnifiedConfig, // Auth统一配置
        cacheUnifiedConfig, // Cache统一配置（替换unifiedTtlConfig）
        commonConstantsConfig, // Common模块统一配置
        // 通知配置由NotificationModule自行处理
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

        // Cache统一配置环境变量
        CACHE_DEFAULT_TTL: Joi.number().integer().min(1).max(86400).optional(),
        CACHE_STRONG_TTL: Joi.number().integer().min(1).max(60).optional(),
        CACHE_REALTIME_TTL: Joi.number().integer().min(1).max(300).optional(),
        CACHE_MONITORING_TTL: Joi.number()
          .integer()
          .min(60)
          .max(3600)
          .optional(),
        CACHE_AUTH_TTL: Joi.number().integer().min(60).max(3600).optional(),
        CACHE_TRANSFORMER_TTL: Joi.number()
          .integer()
          .min(60)
          .max(1800)
          .optional(),
        CACHE_SUGGESTION_TTL: Joi.number()
          .integer()
          .min(60)
          .max(1800)
          .optional(),
        CACHE_LONG_TERM_TTL: Joi.number()
          .integer()
          .min(300)
          .max(86400)
          .optional(),
        CACHE_COMPRESSION_THRESHOLD: Joi.number().integer().min(0).optional(),
        CACHE_COMPRESSION_ENABLED: Joi.boolean().optional(),
        CACHE_MAX_ITEMS: Joi.number().integer().min(1).optional(),
        CACHE_MAX_KEY_LENGTH: Joi.number().integer().min(1).optional(),
        CACHE_MAX_VALUE_SIZE_MB: Joi.number().integer().min(1).optional(),
        CACHE_SLOW_OPERATION_MS: Joi.number().integer().min(1).optional(),
        CACHE_RETRY_DELAY_MS: Joi.number().integer().min(1).optional(),
        CACHE_LOCK_TTL: Joi.number().integer().min(1).optional(),
        CACHE_MAX_BATCH_SIZE: Joi.number()
          .integer()
          .min(1)
          .max(1000)
          .optional(),
        CACHE_MAX_SIZE: Joi.number().integer().min(1000).max(100000).optional(),
        CACHE_LRU_SORT_BATCH_SIZE: Joi.number()
          .integer()
          .min(100)
          .max(10000)
          .optional(),
        SMART_CACHE_MAX_BATCH: Joi.number()
          .integer()
          .min(10)
          .max(1000)
          .optional(),
        CACHE_MAX_SIZE_MB: Joi.number().integer().min(64).max(8192).optional(),

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
