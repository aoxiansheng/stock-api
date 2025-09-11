import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import * as mongoose from 'mongoose';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

/**
 * DependenciesCheckPhase - 依赖检查阶段
 * 
 * 职责：
 * - 检查外部服务连接
 * - 验证依赖服务版本
 * - 确保依赖服务可用
 */
@Injectable()
export class DependenciesCheckPhase {
  private readonly logger = createLogger(DependenciesCheckPhase.name);
  
  constructor(private readonly config: ConfigService) {}

  /**
   * 执行依赖检查
   */
  async execute(): Promise<void> {
    this.logger.log('开始依赖检查...');
    
    // 检查MongoDB连接
    await this.checkMongoDB();
    
    // 检查Redis连接
    await this.checkRedis();
    
    this.logger.log('依赖检查完成');
  }

  /**
   * 检查MongoDB连接
   */
  private async checkMongoDB(): Promise<void> {
    const mongoUri = this.config.get('MONGODB_URI');
    
    try {
      const connection = await mongoose.createConnection(mongoUri).asPromise();
      const version = await connection.db.admin().serverInfo();
      this.logger.log(`MongoDB连接成功，版本: ${version.version}`);
      await connection.close();
    } catch (error) {
      throw new Error(`MongoDB连接失败: ${error.message}`);
    }
  }

  /**
   * 检查Redis连接
   */
  private async checkRedis(): Promise<void> {
    const redisUrl = this.config.get('REDIS_URL');
    
    const redis = new Redis(redisUrl, {
      retryStrategy: () => null,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const info = await redis.info('server');
      const versionMatch = info.match(/redis_version:(\S+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      this.logger.log(`Redis连接成功，版本: ${version}`);
      await redis.quit();
    } catch (error) {
      throw new Error(`Redis连接失败: ${error.message}`);
    }
  }
}