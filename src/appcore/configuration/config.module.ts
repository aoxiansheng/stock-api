import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationModule } from '../validation';

// 导入所有配置
import { appConfig } from '../config/app.config';
import { FeatureFlags } from '../config/feature-flags.config';
import { alertConfig } from '../../alert/config/alert.config';
import { securityConfig } from '../../auth/config/security.config';
import { notificationConfig } from '../../notification/config/notification.config';

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
        () => ({ notification: notificationConfig }), // 通知配置
      ],
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ValidationModule,          // 配置验证
  ],
  providers: [
    ConfigService,
    FeatureFlags, // 添加FeatureFlags provider
  ],
  exports: [
    ConfigModule,
    ConfigService,
    ValidationModule,
    FeatureFlags, // 导出FeatureFlags
  ],
})
export class ConfigurationModule {}