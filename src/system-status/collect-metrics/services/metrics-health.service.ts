import { RedisService } from "@liaoliaots/nestjs-redis";
import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import Redis from "ioredis";

import { createLogger } from "@common/config/logger.config";

/**
 * 指标系统健康检查服务
 * 监控性能指标系统自身的健康状态
 */
@Injectable()
export class MetricsHealthService {
  private readonly logger = createLogger(MetricsHealthService.name);
  private redisHealthy = true;
  private lastHealthCheck = Date.now();
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  private get redis(): Redis {
    return this.redisService.getOrThrow();
  }

  constructor(private readonly redisService: RedisService) {}

  /**
   * 定期检查指标系统健康状态
   */
  @Interval(30000) // 每30秒检查一次
  async checkMetricsHealth(): Promise<void> {
    const operation = "checkMetricsHealth";

    try {
      // 检查Redis连接状态
      await this.redis.ping();

      // Redis健康恢复
      if (!this.redisHealthy) {
        this.logger.log("指标系统Redis连接已恢复", {
          operation,
          previousFailures: this.consecutiveFailures,
          component: "MetricsHealthService",
        });
        this.redisHealthy = true;
        this.consecutiveFailures = 0;
      }
    } catch (error) {
      this.consecutiveFailures++;

      // 首次失败或连续失败超过阈值时记录错误
      if (
        this.redisHealthy ||
        this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES
      ) {
        this.logger.error("指标系统Redis连接异常", {
          operation,
          error: error.message,
          consecutiveFailures: this.consecutiveFailures,
          impact: "MetricsSystemDegraded",
          component: "MetricsHealthService",
        });
        this.redisHealthy = false;
      } else {
        // 非首次失败且未超过阈值，使用warn级别
        this.logger.warn("指标系统Redis连接检查失败", {
          operation,
          error: error.message,
          consecutiveFailures: this.consecutiveFailures,
          component: "MetricsHealthService",
        });
      }
    }

    this.lastHealthCheck = Date.now();
  }

  /**
   * 获取指标系统健康状态
   */
  getHealthStatus() {
    return {
      redisHealthy: this.redisHealthy,
      lastHealthCheck: this.lastHealthCheck,
      lastHealthCheckTime: new Date(this.lastHealthCheck).toISOString(),
      consecutiveFailures: this.consecutiveFailures,
      status: this.redisHealthy ? "healthy" : "degraded",
      description: this.redisHealthy
        ? "指标系统运行正常"
        : `指标系统降级运行 (连续失败${this.consecutiveFailures}次)`,
    };
  }

  /**
   * 手动触发健康检查
   */
  async manualHealthCheck(): Promise<void> {
    await this.checkMetricsHealth();
  }

  /**
   * 检查Redis连接状态（同步方法）
   */
  isRedisHealthy(): boolean {
    return this.redisHealthy;
  }

  /**
   * 获取详细的健康报告
   */
  getDetailedHealthReport() {
    const baseStatus = this.getHealthStatus();

    return {
      ...baseStatus,
      metrics: {
        healthCheckInterval: 30000, // ms
        maxConsecutiveFailures: this.MAX_CONSECUTIVE_FAILURES,
        timeSinceLastCheck: Date.now() - this.lastHealthCheck,
      },
      recommendations: this.redisHealthy
        ? []
        : [
            "检查Redis服务器状态",
            "验证网络连接",
            "检查Redis配置",
            "查看系统资源使用情况",
          ],
    };
  }
}
