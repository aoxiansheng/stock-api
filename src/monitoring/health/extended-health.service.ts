import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import Redis from "ioredis";
import { MONITORING_HEALTH_STATUS, ExtendedHealthStatus } from "../constants";
import { MONITORING_SYSTEM_LIMITS } from "../constants/config/monitoring-system.constants";

import { HealthCheckService, HealthCheckResult } from "./health-check.service";
import { InjectRedis } from "@nestjs-modules/ioredis";

type SimpleValidationResult = {
  overall: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validatedAt: Date;
  };
};

export interface ExtendedHealthReport {
  status: ExtendedHealthStatus;
  timestamp: string;
  uptime: number;
  version: string;

  // 基础系统信息
  system: {
    nodeVersion: string;
    platform: string;
    architecture: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };

  // 配置验证结果
  configuration?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validatedAt: string;
  };

  // 依赖服务状态
  dependencies?: {
    mongodb: {
      status: "connected" | "disconnected" | "error";
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: "connected" | "disconnected" | "error";
      responseTime?: number;
      error?: string;
    };
    externalServices: {
      longport: {
        status: "available" | "unavailable" | "not_configured";
        error?: string;
      };
    };
  };

  // 启动检查结果
  startup?: {
    lastCheck: string;
    success: boolean;
    phases: Array<{
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  };

  // 整体健康评分
  healthScore: number;

  // 建议操作
  recommendations: string[];
}

@Injectable()
export class ExtendedHealthService {
  private readonly logger = createLogger(ExtendedHealthService.name);
  private lastHealthCheck: HealthCheckResult | null = null;
  private lastValidation: SimpleValidationResult | null = null;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  /**
   * 获取完整的健康状态
   */
  async getFullHealthStatus(): Promise<ExtendedHealthReport> {
    const startTime = Date.now();

    try {
      // 并行获取各项健康状态
      const [configResult, systemInfo] = await Promise.allSettled([
        this.getConfigurationHealth(),
        this.getSystemInfo(),
      ]);

      const dependenciesInfo = await this.getDependenciesHealth();
      const healthScore = this.calculateHealthScore(
        configResult,
        dependenciesInfo,
      );
      const recommendations = this.generateRecommendations(
        configResult,
        dependenciesInfo,
      );

      const status: ExtendedHealthReport = {
        status: this.determineOverallStatus(healthScore),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION || "1.0.0",

        system:
          systemInfo.status === "fulfilled"
            ? systemInfo.value
            : {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                memory: { used: 0, total: 0, percentage: 0 },
                cpu: { usage: 0 },
              },

        configuration:
          configResult.status === "fulfilled"
            ? {
                isValid: configResult.value.overall.isValid,
                errors: configResult.value.overall.errors,
                warnings: configResult.value.overall.warnings,
                validatedAt:
                  configResult.value.overall.validatedAt.toISOString(),
              }
            : undefined,

        dependencies: dependenciesInfo,
        startup: this.lastHealthCheck
          ? {
              lastCheck: this.lastHealthCheck.timestamp.toISOString(),
              success: this.lastHealthCheck.status === "healthy",
              phases: this.lastHealthCheck.checks.map((check) => ({
                name: check.name,
                success: check.status === "healthy",
                duration: check.duration || 0,
                error: check.status === "unhealthy" ? check.message : undefined,
              })),
            }
          : undefined,

        healthScore,
        recommendations,
      };

      this.logger.debug("ExtendedHealthService: 扩展健康检查完成", {
        component: "ExtendedHealthService",
        operation: "getFullHealthStatus",
        status: status.status,
        healthScore,
        duration: Date.now() - startTime,
        success: true,
      });

      return status;
    } catch (error) {
      this.logger.error("Extended health check failed", {
        error: error.message,
      });
      return this.getFailureHealthStatus(error);
    }
  }

  /**
   * 获取配置健康状态
   */
  async getConfigHealthStatus(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validatedAt: string;
  }> {
    try {
      if (!this.lastValidation || this.isValidationStale()) {
        this.lastValidation = {
          overall: {
            isValid: true,
            errors: [],
            warnings: [],
            validatedAt: new Date(),
          },
        };
      }

      return {
        isValid: this.lastValidation.overall.isValid,
        errors: this.lastValidation.overall.errors,
        warnings: this.lastValidation.overall.warnings,
        validatedAt: this.lastValidation.overall.validatedAt.toISOString(),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Configuration validation failed: ${error.message}`],
        warnings: [],
        validatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取依赖服务健康状态
   */
  async getDependenciesHealthStatus(): Promise<
    ExtendedHealthReport["dependencies"]
  > {
    return this.getDependenciesHealth();
  }

  /**
   * 执行启动检查并更新缓存
   */
  async performStartupCheck(): Promise<HealthCheckResult> {
    try {
      this.lastHealthCheck = await this.healthCheckService.checkHealth();
      return this.lastHealthCheck;
    } catch (error) {
      this.logger.error("Startup check failed", { error: error.message });
      throw error;
    }
  }

  /**
   * 获取配置健康状态（内部方法）
   */
  private async getConfigurationHealth(): Promise<SimpleValidationResult> {
    if (!this.lastValidation || this.isValidationStale()) {
      this.lastValidation = {
        overall: {
          isValid: true,
          errors: [],
          warnings: [],
          validatedAt: new Date(),
        },
      };
    }
    return this.lastValidation;
  }

  /**
   * 获取系统信息
   */
  private async getSystemInfo(): Promise<ExtendedHealthReport["system"]> {
    const memUsage = process.memoryUsage();

    // 获取系统总内存（简化版本）
    const totalMemory =
      memUsage.heapTotal + memUsage.external + (memUsage.arrayBuffers || 0);
    const usedMemory = memUsage.heapUsed;

    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // 转换为秒
      },
    };
  }

  /**
   * 获取依赖服务健康状态
   */
  private async getDependenciesHealth(): Promise<
    ExtendedHealthReport["dependencies"]
  > {
    const results = await Promise.allSettled([
      this.checkMongoDBHealth(),
      this.checkRedisHealth(),
      this.checkLongPortHealth(),
    ]);

    return {
      mongodb:
        results[0].status === "fulfilled"
          ? results[0].value
          : { status: "error", error: "Check failed" },
      redis:
        results[1].status === "fulfilled"
          ? results[1].value
          : { status: "error", error: "Check failed" },
      externalServices: {
        longport:
          results[2].status === "fulfilled"
            ? results[2].value
            : { status: "unavailable", error: "Check failed" },
      },
    };
  }

  /**
   * 检查MongoDB健康状态
   */
  private async checkMongoDBHealth(): Promise<{
    status: "connected" | "disconnected" | "error";
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const { MongoClient } = await import("mongodb");
      const uri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/smart-stock-data";

      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });

      await client.connect();
      await client.db().admin().ping();
      await client.close();

      return {
        status: "connected",
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查Redis健康状态
   */
  private async checkRedisHealth(): Promise<{
    status: "connected" | "disconnected" | "error";
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const host = process.env.REDIS_HOST || "localhost";
      const port = parseInt(process.env.REDIS_PORT || "6379", 10);

      const client = new Redis({
        host,
        port,
        connectTimeout: 3000,
        lazyConnect: true,
      });

      await client.connect();
      await client.ping();
      await client.quit();

      return {
        status: "connected",
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查LongPort健康状态
   */
  private async checkLongPortHealth(): Promise<{
    status: "available" | "unavailable" | "not_configured";
    error?: string;
  }> {
    const appKey = process.env.LONGPORT_APP_KEY;
    const appSecret = process.env.LONGPORT_APP_SECRET;
    const accessToken = process.env.LONGPORT_ACCESS_TOKEN;

    if (!appKey || !appSecret || !accessToken) {
      return { status: "not_configured" };
    }

    try {
      // 简单检查配置完整性（实际项目中可以进行API调用测试）
      return { status: "available" };
    } catch (error) {
      return {
        status: "unavailable",
        error: error.message,
      };
    }
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(
    configResult: PromiseSettledResult<SimpleValidationResult>,
    dependencies: ExtendedHealthReport["dependencies"],
  ): number {
    let score = 100;

    // 配置验证影响分数
    if (configResult.status === "fulfilled") {
      const config = configResult.value;
      score -= config.overall.errors.length * 15; // 每个错误扣15分
      score -= config.overall.warnings.length * 5; // 每个警告扣5分
    } else {
      score -= 30; // 配置验证失败扣30分
    }

    // 依赖服务影响分数
    if (dependencies) {
      if (dependencies.mongodb?.status !== "connected") score -= 25;
      if (dependencies.redis?.status !== "connected") score -= 20;
      // LongPort是可选的，不影响核心分数
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 确定整体状态
   */
  private determineOverallStatus(healthScore: number): ExtendedHealthStatus {
    if (healthScore >= 80) return MONITORING_HEALTH_STATUS.HEALTHY;
    if (healthScore >= 50) return MONITORING_HEALTH_STATUS.DEGRADED;
    return MONITORING_HEALTH_STATUS.UNHEALTHY;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    configResult: PromiseSettledResult<SimpleValidationResult>,
    dependencies: ExtendedHealthReport["dependencies"],
  ): string[] {
    const recommendations: string[] = [];

    // 配置相关建议
    if (configResult.status === "fulfilled") {
      const config = configResult.value;
      if (config.overall.errors.length > 0) {
        recommendations.push(
          "Fix configuration errors before production deployment",
        );
      }
      if (config.overall.warnings.length > 0) {
        recommendations.push("Review configuration warnings for optimal setup");
      }
    } else {
      recommendations.push("Fix configuration validation system");
    }

    // 依赖服务相关建议
    if (dependencies?.mongodb?.status !== "connected") {
      recommendations.push("Ensure MongoDB is running and accessible");
    }
    if (dependencies?.redis?.status !== "connected") {
      recommendations.push("Ensure Redis is running and accessible");
    }
    if (dependencies?.externalServices?.longport?.status === "not_configured") {
      recommendations.push(
        "Consider configuring LongPort API for full functionality",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("System is operating normally");
    }

    return recommendations;
  }

  /**
   * 获取失败时的健康状态
   */
  private getFailureHealthStatus(error: Error): ExtendedHealthReport {
    return {
      status: MONITORING_HEALTH_STATUS.UNHEALTHY,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || "1.0.0",
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
      },
      healthScore: 0,
      recommendations: [`Health check system error: ${error.message}`],
    };
  }

  /**
   * 检查验证结果是否过期
   */
  private isValidationStale(): boolean {
    if (!this.lastValidation) return true;

    const staleTime = MONITORING_SYSTEM_LIMITS.MONITORING_CACHE_STALE_TIME_MS; // 5分钟过期
    const now = Date.now();
    const validatedTime = this.lastValidation.overall.validatedAt.getTime();

    return now - validatedTime > staleTime;
  }
}
