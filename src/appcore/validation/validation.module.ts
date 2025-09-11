/**
 * 验证模块
 * 🎯 提供完整的配置验证服务
 */

import { Module } from "@nestjs/common";
import { EnvironmentValidator } from "./validators/environment.validator";
import { DependenciesValidator } from "./validators/dependencies.validator";
import { ValidationService } from "./services/validation.service";
import { ValidationOrchestratorService } from "./services/validation-orchestrator.service";

/**
 * 验证模块
 *
 * @remarks
 * 此模块提供完整的配置验证功能：
 * - EnvironmentValidator: 环境变量验证
 * - DependenciesValidator: 外部依赖验证
 * - ValidationService: 统一验证入口
 * - ValidationOrchestratorService: 验证流程编排
 *
 * 使用场景：
 * - 应用启动前验证
 * - 运行时配置检查
 * - 健康检查端点
 * - 部署前配置验证
 */
@Module({
  providers: [
    EnvironmentValidator,
    DependenciesValidator,
    ValidationService,
    ValidationOrchestratorService,
  ],
  exports: [
    ValidationService,
    ValidationOrchestratorService,
    EnvironmentValidator,
    DependenciesValidator,
  ],
})
export class ValidationModule {}