import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./app.config";
import { startupConfig } from "./startup.config";
import { FeatureFlags } from "./feature-flags.config";
import { getAutoInitConfig } from "./auto-init.config";
import { alertConfig } from "../../alert/config/alert.config";
import { securityConfig } from "../../auth/config/security.config";
import { notificationConfig } from "./notification.config";

/**
 * 统一配置模块
 * 集中管理所有应用级配置
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        appConfig, // 应用基础配置
        startupConfig, // 启动配置
        () => ({
          featureFlags: new FeatureFlags(), // 功能开关配置
        }),
        () => ({
          autoInit: getAutoInitConfig(), // 自动初始化配置
        }),
        alertConfig, // 告警配置
        () => ({ security: securityConfig }), // 安全配置
        () => ({ notification: notificationConfig }), // 通知配置
      ],
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [FeatureFlags],
  exports: [ConfigModule, FeatureFlags],
})
export class AppConfigModule {}
