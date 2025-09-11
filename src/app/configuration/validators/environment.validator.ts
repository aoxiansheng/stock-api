import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@app/config/logger.config';

/**
 * EnvironmentValidator - 环境配置验证器
 * 
 * 职责：
 * - 验证环境变量完整性
 * - 验证配置格式正确性
 * - 提供环境配置建议
 */
@Injectable()
export class EnvironmentValidator {
  private readonly logger = createLogger(EnvironmentValidator.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 验证环境配置
   */
  validate(): boolean {
    this.logger.log('验证环境配置...');
    
    const errors: string[] = [];
    
    // 验证NODE_ENV
    const nodeEnv = this.config.get('NODE_ENV');
    if (!['development', 'test', 'production'].includes(nodeEnv)) {
      errors.push(`无效的NODE_ENV值: ${nodeEnv}`);
    }
    
    // 验证端口配置
    const port = this.config.get('PORT');
    if (port && (isNaN(port) || port < 1 || port > 65535)) {
      errors.push(`无效的端口号: ${port}`);
    }
    
    if (errors.length > 0) {
      this.logger.error('环境配置验证失败:', errors);
      return false;
    }
    
    this.logger.log('环境配置验证通过');
    return true;
  }
}