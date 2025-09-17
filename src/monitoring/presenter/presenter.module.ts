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
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { AnalyzerModule } from "../analyzer/analyzer.module";
import { HealthModule } from "../health/health.module";
import { PresenterController } from "./presenter.controller";
import { PresenterService } from "./presenter.service";

@Module({
  imports: [
    PaginationModule, // 🆕 导入通用分页模块
    AnalyzerModule,
    HealthModule, // 添加 HealthModule 以获取 ExtendedHealthService
  ],
  controllers: [PresenterController],
  providers: [PresenterService],
  exports: [PresenterService],
})
export class PresenterModule {}
