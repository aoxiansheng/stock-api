import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

// 导入所有配置
import { appConfig } from '../config/app.config';
import { FeatureFlags } from '../config/feature-flags.config';
import alertConfig from '../../alert/config/alert.config';
import { securityConfig } from '../../auth/config/security.config';
import unifiedTtlConfig from '../../cache/config/unified-ttl.config';
// notificationConfig已从旧文件迁移至notification-enhanced.config.ts
// 由NotificationModule直接处理配置注册

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
        unifiedTtlConfig, // 统一TTL配置
        // 通知配置由NotificationModule自行处理
      ],
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        // 基础
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
        PORT: Joi.number().integer().min(1).max(65535).optional(),

        // 数据库/缓存
        MONGODB_URI: Joi.string().pattern(/^mongodb:\/\//).required(),
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
        AUTO_INIT_ENABLED: Joi.boolean().truthy('true').falsy('false').optional(),
        MONITORING_ENABLED: Joi.boolean().truthy('true').falsy('false').optional(),
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