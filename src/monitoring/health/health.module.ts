/**
 * 扩展健康检查模块
 * 🎯 提供应用级健康检查和配置验证功能
 */

import { Module } from "@nestjs/common";

import { HealthCheckService } from "./health-check.service";
import { ExtendedHealthService } from "./extended-health.service";

/**
 * 扩展健康检查模块
 *
 * @remarks
 * 此模块扩展现有监控系统的健康检查功能：
 * - ExtendedHealthService: 提供完整的系统健康状态检查
 * - 集成配置验证、依赖检查、启动状态等功能
 *
 * 依赖模块：
 * - ConfigValidationModule: 配置验证功能
 *
 *
 * 与现有监控系统的关系：
 * - 复用现有的 MonitoringModule 架构
 * - 扩展 PresenterController 的健康检查端点
 * - 提供更详细的应用级健康信息
 */
@Module({
  imports: [
  ],
  providers: [
    ExtendedHealthService,
    HealthCheckService,
  ],
  exports: [
    ExtendedHealthService,
    HealthCheckService,
  ],
})
export class HealthModule {}
