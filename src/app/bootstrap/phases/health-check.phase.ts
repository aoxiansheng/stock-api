import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import { HealthCheckService } from '../../infrastructure/health/health-check.service';

/**
 * HealthCheckPhase - 健康检查阶段
 * 
 * 职责：
 * - 执行系统健康检查
 * - 验证关键服务状态
 * - 报告健康检查结果
 */
@Injectable()
export class HealthCheckPhase {
  private readonly logger = createLogger(HealthCheckPhase.name);
  
  constructor(private readonly healthCheckService: HealthCheckService) {}

  /**
   * 执行健康检查
   */
  async execute(): Promise<void> {
    this.logger.log('开始健康检查...');
    
    const healthResult = await this.healthCheckService.checkHealth();
    
    if (healthResult.status !== 'healthy') {
      const unhealthyServices = healthResult.checks
        .filter(check => check.status !== 'healthy')
        .map(check => check.name);
      
      throw new Error(`健康检查失败，不健康的服务: ${unhealthyServices.join(', ')}`);
    }
    
    this.logger.log('健康检查通过');
  }
}