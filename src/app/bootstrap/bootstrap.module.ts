import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/config.module';
import { StartupOrchestratorService } from './startup-orchestrator.service';
import { EnvironmentValidationPhase } from './phases/environment-validation.phase';
import { DependenciesCheckPhase } from './phases/dependencies-check.phase';
import { HealthCheckPhase } from './phases/health-check.phase';

/**
 * BootstrapModule - 启动引导模块
 * 
 * 职责：
 * - 管理应用启动流程
 * - 执行启动阶段任务
 * - 环境验证
 * - 依赖检查
 * - 健康检查
 */
@Module({
  imports: [ConfigurationModule],
  providers: [
    StartupOrchestratorService,
    EnvironmentValidationPhase,
    DependenciesCheckPhase,
    HealthCheckPhase,
  ],
  exports: [
    StartupOrchestratorService,
  ],
})
export class BootstrapModule {}