import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import { EnvironmentValidationPhase } from './phases/environment-validation.phase';
import { DependenciesCheckPhase } from './phases/dependencies-check.phase';
import { HealthCheckPhase } from './phases/health-check.phase';

/**
 * StartupOrchestratorService - 启动编排服务
 * 
 * 职责：
 * - 编排启动阶段
 * - 确保启动顺序
 * - 错误处理和回滚
 */
@Injectable()
export class StartupOrchestratorService {
  private readonly logger = createLogger(StartupOrchestratorService.name);
  
  constructor(
    private readonly envValidation: EnvironmentValidationPhase,
    private readonly depsCheck: DependenciesCheckPhase,
    private readonly healthCheck: HealthCheckPhase,
  ) {}

  /**
   * 执行启动阶段
   */
  async executeStartupPhases(): Promise<void> {
    const phases = [
      { name: '环境验证', phase: this.envValidation },
      { name: '依赖检查', phase: this.depsCheck },
      { name: '健康检查', phase: this.healthCheck },
    ];

    for (const { name, phase } of phases) {
      this.logger.log(`执行启动阶段: ${name}`);
      try {
        await phase.execute();
        this.logger.log(`启动阶段完成: ${name}`);
      } catch (error) {
        this.logger.error(`启动阶段失败: ${name}`, error);
        throw new Error(`启动失败在阶段: ${name} - ${error.message}`);
      }
    }
  }
}