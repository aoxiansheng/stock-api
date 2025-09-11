import { Injectable } from '@nestjs/common';
import { ValidationOrchestratorService } from '@appcore/validation/services/validation-orchestrator.service';
import { createLogger } from '@appcore/config/logger.config';

/**
 * DependenciesCheckPhase - 依赖检查阶段
 * 
 * 职责：
 * - 使用新的验证服务执行依赖检查
 * - 确保外部服务可用性
 */
@Injectable()
export class DependenciesCheckPhase {
  private readonly logger = createLogger(DependenciesCheckPhase.name);
  
  constructor(
    private readonly validationOrchestrator: ValidationOrchestratorService
  ) {}

  /**
   * 执行依赖检查
   */
  async execute(): Promise<void> {
    this.logger.log('开始依赖检查...');
    
    // 使用新的验证服务执行启动验证
    const result = await this.validationOrchestrator.startupValidation();
    
    if (!result.isValid) {
      throw new Error(`依赖检查失败: ${result.errors.join(', ')}`);
    }
    
    this.logger.log('依赖检查完成');
  }
}