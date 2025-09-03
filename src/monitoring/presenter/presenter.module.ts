/**
 * 🎯 展示层模块
 *
 * 负责对外提供监控API：
 * - RESTful API端点
 * - 数据格式化
 * - 权限控制
 * - 错误处理
 */

import { Module } from "@nestjs/common";
import { AnalyzerModule } from "../analyzer/analyzer.module";
import { HealthModule } from "../health/health.module";
import { PresenterController } from "./presenter.controller";
import { PresenterService } from "./presenter.service";
import { PresenterErrorHandlerService } from "./presenter-error.service";

@Module({
  imports: [
    AnalyzerModule,
    HealthModule, // 添加 HealthModule 以获取 ExtendedHealthService
  ],
  controllers: [PresenterController],
  providers: [PresenterService, PresenterErrorHandlerService],
  exports: [PresenterService, PresenterErrorHandlerService],
})
export class PresenterModule {}
