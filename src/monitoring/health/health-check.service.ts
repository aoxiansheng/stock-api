import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import * as mongoose from "mongoose";

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Array<{
    name: string;
    status: 'healthy' | 'unhealthy';
    message?: string;
    duration?: number;
  }>;
  timestamp: Date;
}

/**
 * HealthCheckService - 健康检查服务
 * 
 * 职责：
 * - 执行系统健康检查
 * - 监控关键服务状态
 * - 提供健康检查端点
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = createLogger(HealthCheckService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * 执行健康检查
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const checks = [];
    const startTime = Date.now();

    // 检查MongoDB
    const mongoCheck = await this.checkMongoDB();
    checks.push(mongoCheck);

    // 检查Redis
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // 检查内存使用
    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);

    // 确定整体状态
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const status = hasUnhealthy ? 'unhealthy' : 'healthy';

    return {
      status,
      checks,
      timestamp: new Date(),
    };
  }

  /**
   * 检查MongoDB连接
   */
  private async checkMongoDB(): Promise<any> {
    const startTime = Date.now();
    try {
      const mongoUri = this.config.get('MONGODB_URI');
      const connection = await mongoose.createConnection(mongoUri).asPromise();
      await connection.db.admin().ping();
      await connection.close();
      
      return {
        name: 'mongodb',
        status: 'healthy',
        message: 'MongoDB连接正常',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'mongodb',
        status: 'unhealthy',
        message: `MongoDB连接失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查Redis连接
   */
  private async checkRedis(): Promise<any> {
    const startTime = Date.now();
    try {
      const redisUrl = this.config.get('REDIS_URL');
      const redis = new Redis(redisUrl, {
        retryStrategy: () => null,
        lazyConnect: true,
      });

      await redis.connect();
      await redis.ping();
      await redis.quit();

      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis连接正常',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        message: `Redis连接失败: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查内存使用
   */
  private checkMemory(): any {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    const status = usagePercent > 90 ? 'unhealthy' : 'healthy';

    return {
      name: 'memory',
      status,
      message: `内存使用: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  }
} 