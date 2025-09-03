/**
 * 配置验证模块
 * 🎯 提供完整的配置验证服务
 */

import { Module } from "@nestjs/common";

import { ConfigValidatorService } from "./config-validator.service";
import { EnvironmentValidatorService } from "./environment-validator.service";
import { DependenciesValidatorService } from "./dependencies-validator.service";

/**
 * 配置验证模块
 *
 * @remarks
 * 此模块提供完整的配置验证功能：
 * - EnvironmentValidatorService: 环境变量验证
 * - DependenciesValidatorService: 外部依赖验证
 * - ConfigValidatorService: 统一验证入口
 *
 * 使用场景：
 * - 应用启动前验证
 * - 运行时配置检查
 * - 健康检查端点
 * - 部署前配置验证
 */
@Module({
  providers: [
    EnvironmentValidatorService,
    DependenciesValidatorService,
    ConfigValidatorService,
  ],
  exports: [
    ConfigValidatorService,
    EnvironmentValidatorService,
    DependenciesValidatorService,
  ],
})
export class ConfigValidationModule {}
