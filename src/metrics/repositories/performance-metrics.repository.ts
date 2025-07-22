import { RedisService } from "@liaoliaots/nestjs-redis";
import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import Redis from "ioredis";

import { createLogger } from "@common/config/logger.config";

import {
  PERFORMANCE_REDIS_KEYS,
  PERFORMANCE_LIMITS,
  PERFORMANCE_TTL,
  PERFORMANCE_INTERVALS,
} from "../constants/performance.constants";
import { PerformanceMetric } from "../interfaces/performance-metrics.interface";

@Injectable()
export class PerformanceMetricsRepository {
  private readonly logger = createLogger(PerformanceMetricsRepository.name);

  private get redis(): Redis | null {
    try {
      return this.redisService.getOrThrow();
    } catch (error) {
      this.logger.warn("获取Redis实例失败，跳过指标操作", {
        error: error.message,
        component: "PerformanceMetricsRepository",
      });
      return null;
    }
  }

  constructor(private readonly redisService: RedisService) {}

  async recordRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
  ): Promise<void> {
    const operation = "recordRequest";
    const baseKey = `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:${method}:${endpoint}`;
    const responseTimeKey = `${baseKey}:responseTimes`;

    // 检查Redis连接状态
    if (!this.redis || this.redis.status !== "ready") {
      this.logger.warn("Redis连接不可用，跳过指标记录", {
        status: this.redis?.status || "undefined",
        operation,
        endpoint,
        method,
        component: "PerformanceMetricsRepository",
      });
      return; // 静默跳过
    }

    try {
      const pipeline = this.redis.pipeline();
      pipeline.hincrby(baseKey, "totalRequests", 1);
      pipeline.hincrby(
        baseKey,
        success ? "successfulRequests" : "failedRequests",
        1,
      );
      pipeline.lpush(responseTimeKey, responseTime.toString());
      pipeline.ltrim(
        responseTimeKey,
        0,
        PERFORMANCE_LIMITS.MAX_RESPONSE_TIMES_PER_ENDPOINT - 1,
      );
      pipeline.expire(baseKey, PERFORMANCE_TTL.ENDPOINT_STATS);
      pipeline.expire(responseTimeKey, PERFORMANCE_TTL.ENDPOINT_STATS);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        {
          operation,
          error: error.stack,
          endpoint,
          method,
          impact: "MetricsDataLoss",
          component: "PerformanceMetricsRepository",
        },
        "记录请求指标到Redis失败",
      );
      // 性能监控是非关键功能，静默失败不抛异常
    }
  }

  async recordDatabaseQuery(duration: number): Promise<void> {
    const operation = "recordDatabaseQuery";

    // 检查Redis连接状态
    if (!this.redis || this.redis.status !== "ready") {
      this.logger.warn("Redis连接不可用，跳过数据库查询指标记录", {
        status: this.redis?.status || "undefined",
        operation,
        duration,
        component: "PerformanceMetricsRepository",
      });
      return; // 静默跳过
    }

    try {
      const timestamp = Date.now();
      const member = `${timestamp}:${duration}`; // 保证成员唯一性
      const key = PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY;

      const pipeline = this.redis.pipeline();
      // 使用 ZSET (有序集合)，score 为时间戳，member 为时长
      pipeline.zadd(key, timestamp, member);
      // 保留最新的 N 条记录
      pipeline.zremrangebyrank(
        key,
        0,
        -PERFORMANCE_LIMITS.MAX_DB_QUERY_TIMES - 1,
      );
      pipeline.expire(key, PERFORMANCE_TTL.DB_QUERY_TIMES);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        {
          operation,
          error: error.stack,
          duration,
          impact: "MetricsDataLoss",
          component: "PerformanceMetricsRepository",
        },
        "记录数据库查询时间到Redis失败",
      );
      // 性能监控是非关键功能，静默失败不抛异常
    }
  }

  async getEndpointStats(): Promise<
    { key: string; stats: Record<string, string>; responseTimes: string[] }[]
  > {
    const operation = "getEndpointStats";
    try {
      // 检查Redis连接状态
      if (!this.redis || this.redis.status !== "ready") {
        this.logger.warn("Redis连接不可用，跳过端点统计获取", {
          status: this.redis?.status || "undefined",
          operation,
        });
        return [];
      }

      // 使用SCAN代替KEYS，避免阻塞Redis
      const keys = [];
      let cursor = "0";
      const scanPattern = `${PERFORMANCE_REDIS_KEYS.ENDPOINT_STATS_PREFIX}:*`;

      do {
        const scanResult = await this.redis.scan(
          cursor,
          "MATCH",
          scanPattern,
          "COUNT",
          100,
        );
        cursor = scanResult[0];
        keys.push(...scanResult[1]);
      } while (cursor !== "0" && keys.length < 500); // 限制最大扫描数量

      // 确保严格遵守数量限制
      if (keys.length > 500) {
        keys.length = 500;
      }

      // 过滤掉响应时间键
      const endpointKeys = keys.filter((k) => !k.endsWith(":responseTimes"));

      if (endpointKeys.length === 0) {
        this.logger.debug("没有找到端点统计键");
        return [];
      }

      const results = [];

      // 分批处理，避免一次性处理过多键
      const batchSize = 10;
      for (let i = 0; i < endpointKeys.length; i += batchSize) {
        const batch = endpointKeys.slice(i, i + batchSize);

        // 为每个批次创建pipeline
        const batchPromises = batch.map(async (key) => {
          try {
            // 添加超时保护
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Redis操作超时")), 1000);
            });

            const dataPromise = Promise.all([
              this.redis.hgetall(key),
              this.redis.lrange(`${key}:responseTimes`, 0, -1),
            ]);

            const [statsData, responseTimesStrings] = await Promise.race([
              dataPromise,
              timeoutPromise,
            ]);

            if (statsData && Object.keys(statsData).length > 0) {
              return {
                key,
                stats: statsData,
                responseTimes: responseTimesStrings,
              };
            }
            return null;
          } catch (error) {
            this.logger.warn(`获取键 ${key} 数据失败: ${error.message}`);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // 收集成功的结果
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            results.push(result.value);
          }
        });
      }

      this.logger.debug(`获取到 ${results.length} 个端点统计数据`);
      return results;
    } catch (error) {
      this.logger.error(
        { operation, error: error.stack },
        "从Redis获取端点统计信息失败",
      );
      return [];
    }
  }

  async getDatabaseQueryTimes(
    startDate?: string,
    endDate?: string,
  ): Promise<string[]> {
    const operation = "getDatabaseQueryTimes";
    try {
      const min = startDate ? new Date(startDate).getTime() : "-inf";
      const max = endDate ? new Date(endDate).getTime() : "+inf";

      const results = await this.redis.zrangebyscore(
        PERFORMANCE_REDIS_KEYS.DB_QUERY_TIMES_KEY,
        min,
        max,
      );
      // 从 member 中解析出 duration
      return results.map((member) => member.split(":")[1]);
    } catch (error) {
      this.logger.error(
        { operation, error: error.stack },
        "从Redis获取数据库查询时间失败",
      );
      return [];
    }
  }

  async getRedisInfoPayload(): Promise<{
    info: string;
    stats: string;
    clients: string;
  }> {
    try {
      // 检查Redis连接状态
      if (!this.redis || this.redis.status !== "ready") {
        this.logger.warn("Redis连接不可用，无法获取指标", {
          status: this.redis?.status || "undefined",
          operation: "getRedisInfoPayload",
        });
        return null;
      }

      // 添加连接健康检查
      try {
        await this.redis.ping();
      } catch (pingError) {
        if (
          pingError.message.includes("ECONNRESET") ||
          pingError.message.includes("Connection is closed")
        ) {
          this.logger.warn("Redis连接被重置，跳过INFO获取", {
            operation: "getRedisInfoPayload",
            error: pingError.message,
          });
        } else {
          this.logger.warn("Redis ping失败，跳过INFO获取", {
            error: pingError.message,
            operation: "getRedisInfoPayload",
          });
        }
        return null;
      }

      // 减少超时时间，在测试环境中快速失败
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Redis INFO 请求超时")), 1000);
      });

      // 使用更保守的方式获取INFO，避免同时发起多个INFO请求
      const infoPromise = (async () => {
        const info = await this.redis.info("memory");
        const stats = await this.redis.info("stats");
        const clients = await this.redis.info("clients");
        return [info, stats, clients];
      })();

      const [info, stats, clients] = await Promise.race([
        infoPromise,
        timeoutPromise,
      ]);

      // 验证返回的数据
      if (!info || !stats || !clients) {
        this.logger.warn("Redis INFO 数据不完整", {
          hasInfo: !!info,
          hasStats: !!stats,
          hasClients: !!clients,
        });
        return null;
      }

      this.logger.debug("Redis INFO 数据获取成功", {
        infoLength: info.length,
        statsLength: stats.length,
        clientsLength: clients.length,
      });

      return { info, stats, clients };
    } catch (error) {
      // 区分不同类型的错误
      if (
        error.message.includes("ECONNRESET") ||
        error.message.includes("Connection is closed")
      ) {
        this.logger.warn("Redis连接被重置，跳过INFO获取", {
          operation: "getRedisInfoPayload",
          error: error.message,
        });
      } else {
        this.logger.error(
          { operation: "getRedisInfoPayload", error: error.stack },
          "从Redis获取Info失败",
        );
      }
      return null;
    }
  }

  async flushMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (metrics.length === 0) {
      return;
    }
    const operation = "flushMetrics";
    try {
      const pipeline = this.redis.pipeline();
      const groupedMetrics = this.groupMetricsByName(metrics);

      for (const [key, metricGroup] of groupedMetrics) {
        for (const metric of metricGroup) {
          const timeKey = `${key}:${Math.floor(metric.timestamp.getTime() / 60000) * 60000}`;
          pipeline.zadd(
            timeKey,
            metric.timestamp.getTime(),
            JSON.stringify({
              value: metric.value,
              tags: metric.tags,
            }),
          );
          pipeline.expire(timeKey, PERFORMANCE_TTL.SYSTEM_METRICS);
        }
      }

      await pipeline.exec();
      this.logger.debug(`刷新了 ${groupedMetrics.size} 个指标组到Redis`);
    } catch (error) {
      this.logger.error(
        { operation, error: error.stack },
        "刷新指标到Redis失败",
      );
    }
  }

  private groupMetricsByName(
    metrics: PerformanceMetric[],
  ): Map<string, PerformanceMetric[]> {
    const groupedMetrics = new Map<string, PerformanceMetric[]>();
    for (const metric of metrics) {
      const key = `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:${metric.name}`;
      if (!groupedMetrics.has(key)) {
        groupedMetrics.set(key, []);
      }
      groupedMetrics.get(key).push(metric);
    }
    return groupedMetrics;
  }

  @Interval(PERFORMANCE_INTERVALS.CLEANUP_INTERVAL)
  async cleanupOldMetrics(): Promise<void> {
    const operation = "cleanupOldMetrics";
    try {
      const oneHourAgo = Date.now() - PERFORMANCE_TTL.SYSTEM_METRICS * 1000;
      const keys = await this.redis.keys(
        `${PERFORMANCE_REDIS_KEYS.METRICS_PREFIX}:*`,
      );

      if (keys.length === 0) return;

      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.zremrangebyscore(key, 0, oneHourAgo);
      }
      await pipeline.exec();

      this.logger.debug(`清理了 ${keys.length} 个过期指标键`);
    } catch (error) {
      this.logger.error({ operation, error: error.stack }, "清理过期指标失败");
    }
  }
}
