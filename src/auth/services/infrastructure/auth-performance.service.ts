import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/modules/logging";
import { performanceDecoratorBus } from "../../../monitoring/infrastructure/decorators/infrastructure-database.decorator";

/**
 * 认证流程性能监控服务
 * 专门负责监控整个认证流程的性能指标
 */
@Injectable()
export class AuthPerformanceService {
  private readonly logger = createLogger(AuthPerformanceService.name);

  /**
   * 记录整个认证流程的性能
   */
  recordAuthFlowPerformance(data: {
    startTime: number;
    endTime: number;
    guardName: string;
    endpoint: string;
    method: string;
    success: boolean;
    error?: string;
    skipReason?: string;
    cacheHit?: boolean;
  }): void {
    try {
      const duration = data.endTime - data.startTime;

      // 发送性能指标事件
      setImmediate(() => {
        performanceDecoratorBus.emit("performance-metric", {
          timestamp: new Date(),
          source: "auth_flow_performance",
          metricType: "performance",
          metricName: "auth_guard_processed",
          metricValue: duration,
          tags: {
            guard: data.guardName,
            endpoint: data.endpoint,
            method: data.method,
            success: data.success,
            error: data.error,
            skipReason: data.skipReason,
            cacheHit: data.cacheHit,
          },
        });
      });

      // 记录慢认证操作（超过50ms）
      if (duration > 50) {
        this.logger.warn("慢认证操作检测", {
          guard: data.guardName,
          endpoint: data.endpoint,
          method: data.method,
          duration,
          success: data.success,
          error: data.error,
          skipReason: data.skipReason,
          cacheHit: data.cacheHit,
        });
      }

      // 记录认证流程调试日志
      this.logger.debug("认证守卫性能", {
        guard: data.guardName,
        endpoint: data.endpoint,
        method: data.method,
        duration,
        success: data.success,
        skipReason: data.skipReason,
        cacheHit: data.cacheHit,
      });

    } catch (error) {
      this.logger.error("记录认证流程性能失败", {
        guardName: data.guardName,
        error: error.message,
      });
    }
  }

  /**
   * 记录认证缓存性能
   */
  recordAuthCachePerformance(data: {
    operation: string;
    duration: number;
    hit: boolean;
    keyType: string;
  }): void {
    try {
      setImmediate(() => {
        performanceDecoratorBus.emit("performance-metric", {
          timestamp: new Date(),
          source: "auth_cache_performance",
          metricType: "performance",
          metricName: "auth_cache_operation",
          metricValue: data.duration,
          tags: {
            operation: data.operation,
            hit: data.hit,
            keyType: data.keyType,
          },
        });
      });

      this.logger.debug("认证缓存性能", data);
    } catch (error) {
      this.logger.error("记录认证缓存性能失败", {
        operation: data.operation,
        error: error.message,
      });
    }
  }

  /**
   * 记录认证流程聚合统计
   */
  recordAuthFlowStats(data: {
    totalGuards: number;
    executedGuards: number;
    skippedGuards: number;
    totalDuration: number;
    endpoint: string;
    method: string;
    authenticated: boolean;
    authType?: string;
  }): void {
    try {
      setImmediate(() => {
        performanceDecoratorBus.emit("performance-metric", {
          timestamp: new Date(),
          source: "auth_flow_stats",
          metricType: "performance",
          metricName: "auth_flow_complete",
          metricValue: data.totalDuration,
          tags: {
            totalGuards: data.totalGuards,
            executedGuards: data.executedGuards,
            skippedGuards: data.skippedGuards,
            endpoint: data.endpoint,
            method: data.method,
            authenticated: data.authenticated,
            authType: data.authType,
            efficiency: Math.round((data.skippedGuards / data.totalGuards) * 100),
          },
        });
      });

      this.logger.log("认证流程统计", data);
    } catch (error) {
      this.logger.error("记录认证流程统计失败", {
        endpoint: data.endpoint,
        error: error.message,
      });
    }
  }
}