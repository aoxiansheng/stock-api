import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Interval } from "@nestjs/schedule";
import * as os from "os";
import * as v8 from "v8";

// 🎯 复用 common 模块的日志配置
import { createLogger, sanitizeLogData } from "@common/config/logger.config";

// 🎯 复用 common 模块的性能监控常量

import {
  PERFORMANCE_INTERVALS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_THRESHOLDS,
  METRIC_NAMES,
  METRIC_UNITS,
  HEALTH_SCORE_CONFIG,
  PERFORMANCE_DEFAULTS,
  PERFORMANCE_EVENTS,
  API_KEY_CONSTANTS,
  REDIS_INFO,
} from "../constants/metrics-performance.constants";
import {
  PerformanceSummaryDto,
  EndpointMetricsDto,
  DatabaseMetricsDto,
  RedisMetricsDto,
  SystemMetricsDto,
} from "../dto";
import { AuthType, AuthStatus, OperationStatus } from "../enums/auth-type.enum";
import { PerformanceMetric } from "../interfaces/performance-metrics.interface";
import { PerformanceMetricsRepository } from "../repositories/performance-metrics.repository";
import { FormatUtils } from "../utils/format.util";

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = createLogger(PerformanceMonitorService.name);
  private lastCpuUsageData: { user: number; system: number; timestamp: number } | null =
    null;
  private readonly metricBuffer: PerformanceMetric[] = [];
  private isFlushingMetrics = false;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly performanceMetricsRepository: PerformanceMetricsRepository,
  ) {}

  // 记录API请求指标
  async recordRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
  ): Promise<void> {
    this.logger.debug(
      { endpoint, method, responseTime, success },
      "记录API请求",
    );
    // 🎯 调用仓储层记录指标
    await this.performanceMetricsRepository.recordRequest(
      endpoint,
      method,
      responseTime,
      success,
    );

    this.addMetric(
      METRIC_NAMES.API_REQUEST_DURATION,
      responseTime,
      METRIC_UNITS.MILLISECONDS,
      {
        endpoint,
        method,
        status: success ? OperationStatus.SUCCESS : OperationStatus.ERROR,
      },
    );
  }

  // 记录数据库查询指标
  async recordDatabaseQuery(
    queryType: string,
    duration: number,
    success: boolean,
  ): Promise<void> {
    // 🎯 调用仓储层记录指标
    await this.performanceMetricsRepository.recordDatabaseQuery(duration);

    this.addMetric(
      METRIC_NAMES.DB_QUERY_DURATION,
      duration,
      METRIC_UNITS.MILLISECONDS,
      {
        query_type: queryType,
        status: success ? OperationStatus.SUCCESS : OperationStatus.ERROR,
      },
    );
  }

  // 记录缓存操作指标
  recordCacheOperation(
    operation: string,
    hit: boolean,
    duration?: number,
  ): void {
    this.addMetric(METRIC_NAMES.CACHE_OPERATION_TOTAL, 1, METRIC_UNITS.COUNT, {
      operation,
      result: hit ? OperationStatus.HIT : OperationStatus.MISS,
    });

    if (duration !== undefined) {
      this.addMetric(
        METRIC_NAMES.CACHE_OPERATION_DURATION,
        duration,
        METRIC_UNITS.MILLISECONDS,
        {
          operation,
        },
      );
    }
  }

  // 记录认证指标
  recordAuthentication(
    type: AuthType,
    success: boolean,
    duration: number,
  ): void {
    this.addMetric(
      METRIC_NAMES.AUTH_DURATION,
      duration,
      METRIC_UNITS.MILLISECONDS,
      {
        auth_type: type,
        status: success ? AuthStatus.SUCCESS : AuthStatus.FAILURE,
      },
    );

    this.addMetric(METRIC_NAMES.AUTH_TOTAL, 1, METRIC_UNITS.COUNT, {
      auth_type: type,
      status: success ? AuthStatus.SUCCESS : AuthStatus.FAILURE,
    });
  }

  // 记录频率限制指标
  recordRateLimit(apiKey: string, allowed: boolean, remaining: number): void {
    // 🎯 使用 common 模块的常量
    const apiKeyPrefix = apiKey.substring(0, API_KEY_CONSTANTS.PREFIX_LENGTH);
    this.addMetric(METRIC_NAMES.RATE_LIMIT_CHECK, 1, METRIC_UNITS.COUNT, {
      api_key: apiKeyPrefix,
      result: allowed ? OperationStatus.ALLOWED : OperationStatus.BLOCKED,
    });

    this.addMetric(
      METRIC_NAMES.RATE_LIMIT_REMAINING,
      remaining,
      METRIC_UNITS.COUNT,
      {
        api_key: apiKeyPrefix,
      },
    );
  }

  // 通用的性能监控包装方法
  wrapWithTiming<T>(
    operation: () => T | Promise<T>,
    onComplete: (duration: number, success: boolean, result?: T) => void,
  ): T | Promise<T> {
    const startTime = Date.now();

    try {
      const result = operation();

      if (result && typeof (result as any).then === "function") {
        return (result as Promise<T>).then(
          (value: T) => {
            const duration = Date.now() - startTime;
            onComplete(duration, true, value);
            this.checkSlowOperation(duration);
            return value;
          },
          (error: any) => {
            const duration = Date.now() - startTime;
            onComplete(duration, false);
            this.checkSlowOperation(duration);
            throw error;
          },
        ) as Promise<T>;
      } else {
        const duration = Date.now() - startTime;
        onComplete(duration, true, result as T);
        this.checkSlowOperation(duration);
        return result as T;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      onComplete(duration, false);
      this.checkSlowOperation(duration);
      throw error;
    }
  }

  private checkSlowOperation(duration: number) {
    if (duration > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
      this.logger.warn(
        "慢操作检测",
        sanitizeLogData({ duration, unit: METRIC_UNITS.MILLISECONDS }),
      );
    }
  }

  // 获取端点指标
  async getEndpointMetrics(): Promise<EndpointMetricsDto[]> {
    const rawStats = await this.performanceMetricsRepository.getEndpointStats();
    if (!rawStats || rawStats.length === 0) return [];

    const metrics: EndpointMetricsDto[] = [];

    for (const {
      key,
      stats,
      responseTimes: responseTimesStrings,
    } of rawStats) {
      const responseTimes = responseTimesStrings.map((t) => parseInt(t, 10));
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      const totalRequests = parseInt(stats.totalRequests || "0", 10);
      const failedRequests = parseInt(stats.failedRequests || "0", 10);

      metrics.push({
        endpoint: key.split(":")[2],
        method: key.split(":")[1],
        totalRequests,
        successfulRequests: parseInt(stats.successfulRequests || "0", 10),
        failedRequests,
        averageResponseTime:
          responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0,
        p95ResponseTime: sortedTimes[p95Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0,
        lastMinuteRequests: responseTimes.length,
        errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      });
    }
    return metrics.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  // 获取数据库指标
  async getDatabaseMetrics(
    startDate?: string,
    endDate?: string,
  ): Promise<DatabaseMetricsDto> {
    const queryTimesStrings =
      await this.performanceMetricsRepository.getDatabaseQueryTimes(
        startDate,
        endDate,
      );
    if (!queryTimesStrings) return this.getDefaultDatabaseMetrics();

    const queryTimes = queryTimesStrings.map((t) => parseInt(t, 10));
    const avgQueryTime =
      queryTimes.length > 0
        ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
        : 0;

    const slowQueries = queryTimes.filter(
      (time) => time > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS,
    ).length;

    const metrics: DatabaseMetricsDto = {
      connectionPoolSize: this.configService.get<number>(
        "DB_POOL_SIZE",
        PERFORMANCE_DEFAULTS.DB_POOL_SIZE,
      ),
      activeConnections: 0,
      waitingConnections: 0,
      averageQueryTime: FormatUtils.roundNumber(avgQueryTime),
      slowQueries,
      totalQueries: queryTimes.length,
    };

    this.logger.debug({ metrics }, "数据库指标:");
    return metrics;
  }

  // 获取Redis指标
  async getRedisMetrics(): Promise<RedisMetricsDto> {
    const redisInfo =
      await this.performanceMetricsRepository.getRedisInfoPayload();
    if (!redisInfo) {
      return this.getDefaultRedisMetrics();
    }

    const { info, stats, clients } = redisInfo;

    const memoryUsage = this.parseRedisInfo(info, REDIS_INFO.KEYS.USED_MEMORY);
    const connectedClients = this.parseRedisInfo(
      clients,
      REDIS_INFO.KEYS.CONNECTED_CLIENTS,
    );
    const totalCommandsProcessed = this.parseRedisInfo(
      stats,
      REDIS_INFO.KEYS.TOTAL_COMMANDS_PROCESSED,
    );
    const keyspaceHits = this.parseRedisInfo(
      stats,
      REDIS_INFO.KEYS.KEYSPACE_HITS,
    );
    const keyspaceMisses = this.parseRedisInfo(
      stats,
      REDIS_INFO.KEYS.KEYSPACE_MISSES,
    );
    const evictedKeys = this.parseRedisInfo(
      stats,
      REDIS_INFO.KEYS.EVICTED_KEYS,
    );
    const expiredKeys = this.parseRedisInfo(
      stats,
      REDIS_INFO.KEYS.EXPIRED_KEYS,
    );

    const hitsNum = parseInt(keyspaceHits) || 0;
    const missesNum = parseInt(keyspaceMisses) || 0;
    const hitRate =
      hitsNum + missesNum > 0
        ? FormatUtils.roundNumber(hitsNum / (hitsNum + missesNum))
        : 0;

    const metrics: RedisMetricsDto = {
      memoryUsage: parseInt(memoryUsage) || 0,
      connectedClients: parseInt(connectedClients) || 0,
      opsPerSecond: parseInt(totalCommandsProcessed) || 0, // 简化计算
      hitRate,
      evictedKeys: parseInt(evictedKeys) || 0,
      expiredKeys: parseInt(expiredKeys) || 0,
    };

    this.logger.debug({ metrics }, "Redis指标:");
    return metrics;
  }

  // 获取系统指标
  getSystemMetrics(): SystemMetricsDto {
    try {
      // 使用 Node 内置 v8 模块获取更精确的堆统计数据，
      // 其中 `total_heap_size` 一定 >= `used_heap_size`，可避免出现
      // heapUsed > heapTotal 的不符合逻辑的情况（见 E2E 监控测试）。
      const memUsage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();

      // v8.getHeapStatistics() 返回的单位同样为字节，与 process.memoryUsage() 一致
      const heapUsed = heapStats.used_heap_size;
      // 使用 V8 报告的堆大小上限（heap_size_limit）作为 total，
      // 通常 ~1.5GB，在任何时刻都 ≥ used_heap_size，符合“总堆大小”语义。
      const heapTotal = heapStats.heap_size_limit;

      const numCpus = os.cpus().length || 1; // 至少为1，避免除以0

      const currentTimestamp = Date.now();
      const currentCpuUsage = process.cpuUsage();
      let cpuUsageFraction = 0;

      if (this.lastCpuUsageData) {
        const elapsedMs = currentTimestamp - this.lastCpuUsageData.timestamp;
        const elapsedUsageUs =
          currentCpuUsage.user -
          this.lastCpuUsageData.user +
          (currentCpuUsage.system - this.lastCpuUsageData.system);

        if (elapsedMs > 0) {
          // elapsedUsageUs: 进程在所有核心上使用的CPU时间 (微秒)
          // elapsedMs * 1000: 经过的真实时间 (微秒)
          // (elapsedMs * 1000 * numCpus): 所有核心总共可用的CPU时间
          // 此计算得出的是进程使用的CPU占总可用CPU的比例
          const totalAvailableTimeUs = elapsedMs * 1000 * numCpus;
          cpuUsageFraction = elapsedUsageUs / totalAvailableTimeUs;
        }
      }

      // 保存当前读数，用于下一次计算
      this.lastCpuUsageData = {
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        timestamp: currentTimestamp,
      };

      const metrics: SystemMetricsDto = {
        // 确保值在 0 和 1 之间
        cpuUsage: Math.max(0, Math.min(1, cpuUsageFraction)),
        memoryUsage: memUsage.rss,
        heapUsed,
        heapTotal,
        uptime: process.uptime(),
        eventLoopLag: 0, // TODO: 实现事件循环延迟的精确测量
      };

      this.logger.debug({ metrics }, "系统指标获取成功");
      return metrics;
    } catch (error) {
      this.logger.error(
        { operation: "getSystemMetrics", error: error.stack },
        "获取系统指标失败",
      );
      return this.getDefaultSystemMetrics();
    }
  }

  // 获取性能摘要
  async getPerformanceSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceSummaryDto> {
    try {
      const [endpointMetrics, dbMetrics, redisMetrics, systemMetrics] =
        await Promise.all([
          this.getEndpointMetrics(),
          this.getDatabaseMetrics(startDate, endDate),
          this.getRedisMetrics(),
          Promise.resolve(this.getSystemMetrics()),
        ]);

      const safeEndpointMetrics = endpointMetrics || [];
      const safeDbMetrics = dbMetrics || this.getDefaultDatabaseMetrics();
      const safeRedisMetrics = redisMetrics || this.getDefaultRedisMetrics();
      const safeSystemMetrics = systemMetrics || this.getDefaultSystemMetrics();
      const healthScore = this.calculateHealthScore(
        safeEndpointMetrics,
        safeDbMetrics,
        safeSystemMetrics,
      );

      const summary = {
        timestamp: new Date().toISOString(),
        healthScore: FormatUtils.roundNumber(healthScore),
        processingTime: 0, // 可以在这里计算实际的处理时间
        summary: {
          totalRequests: safeEndpointMetrics.reduce(
            (sum, ep) => sum + (ep.totalRequests || 0),
            0,
          ),
          averageResponseTime:
            this.calculateOverallAverageResponseTime(safeEndpointMetrics),
          errorRate: this.calculateOverallErrorRate(safeEndpointMetrics),
          systemLoad: safeSystemMetrics.cpuUsage || 0,
          memoryUsage: FormatUtils.bytesToGB(
            safeSystemMetrics.memoryUsage || 0,
          ),
          cacheHitRate: safeRedisMetrics.hitRate || 0,
        },
        endpoints: safeEndpointMetrics.slice(0, 10),
        database: safeDbMetrics,
        redis: safeRedisMetrics,
        system: safeSystemMetrics,
      };

      this.logger.debug(
        {
          healthScore: summary.healthScore,
          endpointsCount: summary.endpoints.length,
          totalRequests: summary.summary.totalRequests,
        },
        "性能摘要:",
      );
      return summary;
    } catch (error) {
      this.logger.error(
        { operation: "getPerformanceSummary", error: error.stack },
        "获取性能摘要失败",
      );
      return this.getDefaultPerformanceSummary();
    }
  }

  // 私有方法
  private getDefaultPerformanceSummary(): PerformanceSummaryDto {
    return {
      timestamp: new Date().toISOString(),
      healthScore: 0,
      processingTime: 0,
      summary: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        systemLoad: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
      },
      endpoints: [],
      database: this.getDefaultDatabaseMetrics(),
      redis: this.getDefaultRedisMetrics(),
      system: this.getDefaultSystemMetrics(),
    };
  }

  private getDefaultDatabaseMetrics(): DatabaseMetricsDto {
    return {
      connectionPoolSize: PERFORMANCE_DEFAULTS.DB_POOL_SIZE,
      activeConnections: 0,
      waitingConnections: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0,
    };
  }

  private getDefaultRedisMetrics(): RedisMetricsDto {
    return {
      memoryUsage: PERFORMANCE_DEFAULTS.REDIS_MEMORY_USAGE,
      connectedClients: 0,
      opsPerSecond: 0,
      hitRate: PERFORMANCE_DEFAULTS.CACHE_HIT_RATE,
      evictedKeys: 0,
      expiredKeys: 0,
    };
  }

  private getDefaultSystemMetrics(): SystemMetricsDto {
    return {
      cpuUsage: PERFORMANCE_DEFAULTS.SYSTEM_CPU_USAGE,
      memoryUsage: PERFORMANCE_DEFAULTS.SYSTEM_MEMORY_USAGE,
      heapUsed: 0,
      heapTotal: 0,
      uptime: 0,
      eventLoopLag: 0,
    };
  }

  private addMetric(
    name: string,
    value: number,
    unit: string,
    tags: Record<string, string>,
  ): void {
    this.metricBuffer.push({ name, value, unit, timestamp: new Date(), tags });
    if (this.metricBuffer.length > PERFORMANCE_LIMITS.MAX_METRIC_BUFFER_SIZE) {
      this.metricBuffer.shift();
    }
    this.eventEmitter.emit(PERFORMANCE_EVENTS.METRIC_RECORDED, {
      metric: name,
      value,
    });
  }

  @Interval(PERFORMANCE_INTERVALS.FLUSH_INTERVAL)
  private async flushMetrics(): Promise<void> {
    if (this.isFlushingMetrics || this.metricBuffer.length === 0) {
      return;
    }
    this.isFlushingMetrics = true;
    const metricsToFlush = [...this.metricBuffer];
    this.metricBuffer.length = 0;

    try {
      await this.performanceMetricsRepository.flushMetrics(metricsToFlush);
    } catch (error) {
      this.logger.error(
        { operation: "flushMetrics", error: error.stack },
        "刷新指标失败",
      );
      // 如果失败，考虑是否需要将指标重新放回缓冲区
    } finally {
      this.isFlushingMetrics = false;
    }
  }

  @Interval(PERFORMANCE_INTERVALS.SYSTEM_METRICS_INTERVAL)
  private startSystemMetricsCollection(): void {
    const metrics = this.getSystemMetrics();
    this.addMetric(
      METRIC_NAMES.SYSTEM_CPU_USAGE,
      metrics.cpuUsage,
      METRIC_UNITS.PERCENT,
      {},
    );
    this.addMetric(
      METRIC_NAMES.SYSTEM_MEMORY_USAGE,
      metrics.memoryUsage,
      METRIC_UNITS.BYTES,
      {},
    );
    this.addMetric(
      METRIC_NAMES.SYSTEM_HEAP_USED,
      metrics.heapUsed,
      METRIC_UNITS.BYTES,
      {},
    );
    this.addMetric(
      METRIC_NAMES.SYSTEM_UPTIME,
      metrics.uptime,
      METRIC_UNITS.SECONDS,
      {},
    );
    this.getEventLoopLag();
  }

  private parseRedisInfo(info: string, key: string): string {
    const lines = info.split("\r\n");
    for (const line of lines) {
      if (line.startsWith(`${key}:`)) {
        return line.split(":")[1];
      }
    }
    return "0";
  }

  private getEventLoopLag(): void {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // ms
      this.addMetric(
        METRIC_NAMES.SYSTEM_EVENT_LOOP_LAG,
        lag,
        METRIC_UNITS.MILLISECONDS,
        {},
      );
    });
  }

  private calculateHealthScore(
    endpointMetrics: EndpointMetricsDto[],
    dbMetrics: DatabaseMetricsDto,
    systemMetrics: SystemMetricsDto,
  ): number {
    let score = PERFORMANCE_DEFAULTS.HEALTH_SCORE;
    const config = HEALTH_SCORE_CONFIG;

    const overallErrorRate = this.calculateOverallErrorRate(endpointMetrics);
    score -= Math.min(
      overallErrorRate * (config.errorRate.weight * 10),
      config.errorRate.weight,
    );

    const avgResponseTime =
      this.calculateOverallAverageResponseTime(endpointMetrics);
    for (const tier of config.responseTime.tiers) {
      if (avgResponseTime > tier.threshold) {
        score -= config.responseTime.weight * tier.penalty;
        break;
      }
    }

    for (const tier of config.cpuUsage.tiers) {
      if (systemMetrics.cpuUsage > tier.threshold) {
        score -= config.cpuUsage.weight * tier.penalty;
        break;
      }
    }

    const memoryUsagePercent =
      systemMetrics.heapTotal > 0
        ? systemMetrics.heapUsed / systemMetrics.heapTotal
        : 0;
    for (const tier of config.memoryUsage.tiers) {
      if (memoryUsagePercent > tier.threshold) {
        score -= config.memoryUsage.weight * tier.penalty;
        break;
      }
    }

    for (const tier of config.dbPerformance.tiers) {
      if (dbMetrics.averageQueryTime > tier.threshold) {
        score -= config.dbPerformance.weight * tier.penalty;
        break;
      }
    }
    return Math.max(0, score);
  }

  private calculateOverallAverageResponseTime(
    metrics: EndpointMetricsDto[],
  ): number {
    if (metrics.length === 0) return 0;
    let totalTime = 0;
    let totalRequests = 0;
    for (const metric of metrics) {
      totalTime += metric.averageResponseTime * metric.totalRequests;
      totalRequests += metric.totalRequests;
    }
    return totalRequests > 0 ? totalTime / totalRequests : 0;
  }

  private calculateOverallErrorRate(metrics: EndpointMetricsDto[]): number {
    if (metrics.length === 0) return 0;
    let totalErrors = 0;
    let totalRequests = 0;
    for (const metric of metrics) {
      totalErrors += metric.failedRequests;
      totalRequests += metric.totalRequests;
    }
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }
}