import { Module } from '@nestjs/common';
import { EnvironmentValidator } from './validators/environment.validator';
import { DependenciesValidator } from './validators/dependencies.validator';

/**
 * ValidationModule - 配置验证模块
 * 
 * 职责：
 * - 验证环境变量
 * - 验证依赖服务
 * - 配置完整性检查
 */
@Module({
  providers: [
    EnvironmentValidator,
    DependenciesValidator,
  ],
  exports: [
    EnvironmentValidator,
    DependenciesValidator,
  ],
})
export class ValidationModule {}