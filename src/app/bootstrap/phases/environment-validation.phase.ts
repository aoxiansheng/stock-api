import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@app/config/logger.config';

/**
 * EnvironmentValidationPhase - 环境验证阶段
 * 
 * 职责：
 * - 验证必需的环境变量
 * - 验证环境配置有效性
 * - 检查运行环境兼容性
 */
@Injectable()
export class EnvironmentValidationPhase {
  private readonly logger = createLogger(EnvironmentValidationPhase.name);
  
  constructor(private readonly config: ConfigService) {}

  /**
   * 执行环境验证
   */
  async execute(): Promise<void> {
    this.logger.log('开始环境验证...');
    
    // 验证必需的环境变量
    this.validateRequiredEnvVars();
    
    // 验证数据库配置
    this.validateDatabaseConfig();
    
    // 验证Redis配置
    this.validateRedisConfig();
    
    this.logger.log('环境验证完成');
  }

  /**
   * 验证必需的环境变量
   */
  private validateRequiredEnvVars(): void {
    const requiredVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'REDIS_URL',
    ];

    const missing: string[] = [];
    for (const varName of requiredVars) {
      if (!this.config.get(varName)) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
    }
  }

  /**
   * 验证数据库配置
   */
  private validateDatabaseConfig(): void {
    const mongoUri = this.config.get('MONGODB_URI');
    if (!mongoUri || !mongoUri.startsWith('mongodb')) {
      throw new Error('无效的MongoDB连接字符串');
    }
  }

  /**
   * 验证Redis配置
   */
  private validateRedisConfig(): void {
    const redisUrl = this.config.get('REDIS_URL');
    if (!redisUrl || !redisUrl.startsWith('redis')) {
      throw new Error('无效的Redis连接字符串');
    }
  }
}