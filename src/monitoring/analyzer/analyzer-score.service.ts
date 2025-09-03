import { Injectable } from "@nestjs/common";
import { createLogger } from "../../app/config/logger.config";
import { RawMetricsDto } from "../contracts/interfaces/collector.interface";

/**
 * 健康分计算器
 * 职责：集中所有健康分计算逻辑
 */
@Injectable()
export class AnalyzerHealthScoreCalculator {
  private readonly logger = createLogger(AnalyzerHealthScoreCalculator.name);

  /**
   * 计算整体健康分
   */
  calculateOverallHealthScore(rawMetrics: RawMetricsDto): number {
    try {
      const apiScore = this.calculateApiHealthScore(rawMetrics);
      const databaseScore = this.calculateDatabaseHealthScore(rawMetrics);
      const cacheScore = this.calculateCacheHealthScore(rawMetrics);
      const systemScore = this.calculateSystemHealthScore(rawMetrics);

      // 加权平均计算
      const weights = {
        api: 0.4,
        database: 0.2,
        cache: 0.2,
        system: 0.2,
      };

      const overallScore =
        apiScore * weights.api +
        databaseScore * weights.database +
        cacheScore * weights.cache +
        systemScore * weights.system;

      const finalScore = Math.round(Math.max(0, Math.min(100, overallScore)));

      this.logger.debug("健康分计算完成", {
        overall: finalScore,
        components: {
          api: apiScore,
          database: databaseScore,
          cache: cacheScore,
          system: systemScore,
        },
      });

      return finalScore;
    } catch (error) {
      this.logger.error("健康分计算失败", error.stack);
      return 50; // 默认中等健康分
    }
  }

  /**
   * 计算API健康分
   */
  calculateApiHealthScore(rawMetrics: RawMetricsDto): number {
    const requests = rawMetrics.requests || [];

    if (requests.length === 0) {
      return 100; // 没有请求认为是健康的
    }

    const totalRequests = requests.length;
    const errorRequests = requests.filter((r) => r.statusCode >= 400).length;
    const errorRate = errorRequests / totalRequests;

    // 计算平均响应时间
    const avgResponseTime =
      requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
      totalRequests;

    // 错误率评分 (0-40分)
    let errorScore = 40;
    if (errorRate > 0.1)
      errorScore = 0; // 错误率>10%
    else if (errorRate > 0.05)
      errorScore = 20; // 错误率>5%
    else if (errorRate > 0.01) errorScore = 35; // 错误率>1%

    // 响应时间评分 (0-60分)
    let responseScore = 60;
    if (avgResponseTime > 2000)
      responseScore = 0; // >2秒
    else if (avgResponseTime > 1000)
      responseScore = 20; // >1秒
    else if (avgResponseTime > 500) responseScore = 40; // >500ms

    return Math.round(errorScore + responseScore);
  }

  /**
   * 计算数据库健康分
   */
  calculateDatabaseHealthScore(rawMetrics: RawMetricsDto): number {
    const dbOps = rawMetrics.database || [];

    if (dbOps.length === 0) {
      return 100; // 没有数据库操作认为是健康的
    }

    const totalOps = dbOps.length;
    const failedOps = dbOps.filter((op) => !op.success).length;
    const failureRate = failedOps / totalOps;

    // 计算平均查询时间
    const avgQueryTime =
      dbOps.reduce((sum, op) => sum + op.duration, 0) / totalOps;

    // 失败率评分 (0-50分)
    let failureScore = 50;
    if (failureRate > 0.1)
      failureScore = 0; // 失败率>10%
    else if (failureRate > 0.05) failureScore = 25; // 失败率>5%

    // 查询时间评分 (0-50分)
    let queryScore = 50;
    if (avgQueryTime > 1000)
      queryScore = 0; // >1秒
    else if (avgQueryTime > 500) queryScore = 25; // >500ms

    return Math.round(failureScore + queryScore);
  }

  /**
   * 计算缓存健康分
   */
  calculateCacheHealthScore(rawMetrics: RawMetricsDto): number {
    const cacheOps = rawMetrics.cache || [];

    if (cacheOps.length === 0) {
      return 100; // 没有缓存操作认为是健康的
    }

    const totalOps = cacheOps.length;
    const hits = cacheOps.filter((op) => op.hit).length;
    const hitRate = hits / totalOps;

    // 计算平均缓存响应时间
    const avgCacheTime =
      cacheOps.reduce((sum, op) => sum + op.duration, 0) / totalOps;

    // 命中率评分 (0-70分)
    let hitScore = 0;
    if (hitRate >= 0.9)
      hitScore = 70; // 命中率>=90%
    else if (hitRate >= 0.7)
      hitScore = 50; // 命中率>=70%
    else if (hitRate >= 0.5) hitScore = 30; // 命中率>=50%

    // 响应时间评分 (0-30分)
    let responseScore = 30;
    if (avgCacheTime > 100)
      responseScore = 0; // >100ms
    else if (avgCacheTime > 50) responseScore = 15; // >50ms

    return Math.round(hitScore + responseScore);
  }

  /**
   * 计算系统健康分
   */
  calculateSystemHealthScore(rawMetrics: RawMetricsDto): number {
    const system = rawMetrics.system;

    if (!system) {
      return 100; // 没有系统指标认为是健康的
    }

    // CPU使用率评分 (0-40分)
    let cpuScore = 40;
    if (system.cpu.usage > 0.9)
      cpuScore = 0; // CPU>90%
    else if (system.cpu.usage > 0.7) cpuScore = 20; // CPU>70%

    // 内存使用率评分 (0-40分)
    let memoryScore = 40;
    const memoryUsage = system.memory.percentage;
    if (memoryUsage > 0.9)
      memoryScore = 0; // 内存>90%
    else if (memoryUsage > 0.7) memoryScore = 20; // 内存>70%

    // 运行时间评分 (0-20分) - 运行时间越长越稳定
    let uptimeScore = 20;
    if (system.uptime < 3600)
      uptimeScore = 10; // <1小时
    else if (system.uptime < 86400) uptimeScore = 15; // <1天

    return Math.round(cpuScore + memoryScore + uptimeScore);
  }

  /**
   * 获取健康分等级
   */
  getHealthGrade(
    score: number,
  ): "excellent" | "good" | "fair" | "poor" | "critical" {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "fair";
    if (score >= 30) return "poor";
    return "critical";
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(score: number): "healthy" | "warning" | "critical" {
    if (score >= 70) return "healthy";
    if (score >= 40) return "warning";
    return "critical";
  }

  /**
   * 生成健康建议
   */
  generateHealthRecommendations(rawMetrics: RawMetricsDto): string[] {
    const recommendations: string[] = [];

    try {
      // API相关建议
      const requests = rawMetrics.requests || [];
      if (requests.length > 0) {
        const errorRate =
          requests.filter((r) => r.statusCode >= 400).length / requests.length;
        const avgResponseTime =
          requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
          requests.length;

        if (errorRate > 0.05) {
          recommendations.push("API错误率过高，建议检查错误日志并优化错误处理");
        }
        if (avgResponseTime > 1000) {
          recommendations.push("API响应时间过慢，建议优化查询逻辑或增加缓存");
        }
      }

      // 数据库相关建议
      const dbOps = rawMetrics.database || [];
      if (dbOps.length > 0) {
        const avgQueryTime =
          dbOps.reduce((sum, op) => sum + op.duration, 0) / dbOps.length;
        const failureRate =
          dbOps.filter((op) => !op.success).length / dbOps.length;

        if (avgQueryTime > 500) {
          recommendations.push("数据库查询时间过长，建议优化索引或查询语句");
        }
        if (failureRate > 0.05) {
          recommendations.push(
            "数据库操作失败率过高，建议检查连接池配置和网络状况",
          );
        }
      }

      // 缓存相关建议
      const cacheOps = rawMetrics.cache || [];
      if (cacheOps.length > 0) {
        const hitRate =
          cacheOps.filter((op) => op.hit).length / cacheOps.length;

        if (hitRate < 0.7) {
          recommendations.push(
            "缓存命中率偏低，建议优化缓存策略或增加缓存时间",
          );
        }
      }

      // 系统相关建议
      const system = rawMetrics.system;
      if (system) {
        if (system.cpu.usage > 0.8) {
          recommendations.push(
            "CPU使用率过高，建议优化计算密集型操作或增加服务器资源",
          );
        }
        if (system.memory.percentage > 0.8) {
          recommendations.push(
            "内存使用率过高，建议检查内存泄漏或增加内存容量",
          );
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.error("生成健康建议失败", error.stack);
      return ["系统运行正常，建议定期监控各项指标"];
    }
  }
}
