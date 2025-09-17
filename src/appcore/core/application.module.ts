import { Module } from "@nestjs/common";
import { ConfigurationModule } from "../configuration/config.module";
import { ApplicationService } from "./services/application.service";
import { LifecycleService } from "./services/lifecycle.service";

/**
 * ApplicationModule - 应用核心模块
 *
 * 负责协调应用的核心功能：
 * - 应用生命周期管理
 * - 配置管理整合
 * - 基础设施服务协调
 * - 启动流程编排
 */
@Module({
  imports: [
    ConfigurationModule, // 配置管理
  ],
  providers: [ApplicationService, LifecycleService],
  exports: [
    ApplicationService,
    LifecycleService,
    // 重新导出关键模块，便于其他模块使用
    ConfigurationModule,
  ],
})
export class ApplicationModule {}
