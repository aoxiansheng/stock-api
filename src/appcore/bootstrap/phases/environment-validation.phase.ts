import { Injectable } from '@nestjs/common';
import { ValidationOrchestratorService } from '@appcore/validation/services/validation-orchestrator.service';
import { createLogger } from '@appcore/config/logger.config';

/**
 * EnvironmentValidationPhase - 环境验证阶段
 * 
 * 职责：
 * - 使用新的验证服务执行环境验证
 * - 确保配置符合要求
 */
@Injectable()
export class EnvironmentValidationPhase {
  private readonly logger = createLogger(EnvironmentValidationPhase.name);
  
  constructor(
    private readonly validationOrchestrator: ValidationOrchestratorService
  ) {}

  /**
   * 执行环境验证
   */
  async execute(): Promise<void> {
    this.logger.log('开始环境验证...');
    
    // 使用新的验证服务执行快速验证
    const result = await this.validationOrchestrator.quickValidation();
    
    if (!result.isValid) {
      throw new Error(`环境验证失败: ${result.errors.join(', ')}`);
    }
    
    this.logger.log('环境验证完成');
  }
}