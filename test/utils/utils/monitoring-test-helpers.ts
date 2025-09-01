/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 监控测试专用的异步辅助工具
 * 提供监控系统测试中常用的等待和验证功能
 */

import { INestApplication } from "@nestjs/common";
import { CollectorService } from "@monitoring/collector/collector.service";
import { AlertingService } from "../../../src/alert/services/alerting.service";
import { AlertHistoryService } from "../../../src/alert/services/alert-history.service";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { AlertSeverity } from "../../../src/alert/types/alert.types";
import { NotificationChannelType } from "../../../src/alert/types/alert.types";
import {
  waitForCondition,
  smartDelay,
  TestEnvironment,
} from "./async-test-helpers";
import request from "supertest";

/**
 * 监控测试助手类
 */
export class MonitoringTestHelper {
  constructor(
    private readonly app: INestApplication,
    private readonly performanceMonitor: CollectorService,
    private readonly alertingService: AlertingService,
    private readonly alertHistoryService: AlertHistoryService,
  ) {}

  /**
   * 等待性能指标被记录
   */
  async waitForMetricsRecording(
    endpointPath: string,
    method: string = "GET",
    options: { timeout?: number; expectedCount?: number } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(2000), expectedCount = 1 } =
      options;

    await waitForCondition(
      async () => {
        const metrics = await this.performanceMonitor.getRawMetrics();
        const requests = metrics.requests || [];
        const endpointMetric = requests.find(
          (m) => m.endpoint === endpointPath && m.method === method,
        );
        return (
          endpointMetric &&
          requests.filter(
            (r) => r.endpoint === endpointPath && r.method === method,
          ).length >= expectedCount
        );
      },
      {
        timeout,
        interval: 50,
        timeoutMessage: `端点 ${method} ${endpointPath} 的指标未在指定时间内记录`,
      },
    );

    return this.performanceMonitor.getRawMetrics();
  }

  /**
   * 等待告警被触发
   */
  async waitForAlertTriggered(
    ruleId: string,
    options: { timeout?: number } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(3000) } = options;

    let triggeredAlert: any;

    await waitForCondition(
      async () => {
        const activeAlerts = await this.alertHistoryService.getActiveAlerts();
        triggeredAlert = activeAlerts.find((alert) => alert.ruleId === ruleId);
        return !!triggeredAlert;
      },
      {
        timeout,
        interval: 50,
        timeoutMessage: `告警规则 ${ruleId} 未在指定时间内触发`,
      },
    );

    return triggeredAlert;
  }

  /**
   * 等待Redis缓存操作完成
   */
  async waitForRedisOperation(
    operation: () => Promise<any>,
    validator?: (result: any) => boolean,
    options: { timeout?: number; retries?: number } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(1000) } = options;

    let result: any;
    let lastError: Error | null = null;

    await waitForCondition(
      async () => {
        try {
          result = await operation();
          return validator
            ? validator(result)
            : result !== null && result !== undefined;
        } catch (error) {
          lastError = error;
          return false;
        }
      },
      {
        timeout,
        interval: 100,
        timeoutMessage: `Redis操作未在指定时间内完成。最后错误: ${lastError?.message}`,
      },
    );

    return result;
  }

  /**
   * 模拟API请求并等待指标记录
   */
  async simulateApiRequestsAndWaitForMetrics(
    requestConfig: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      path: string;
      headers?: Record<string, string>;
      body?: any;
      expectedStatus?: number;
    },
    requestCount: number = 1,
    options: {
      timeout?: number;
      delayBetweenRequests?: number;
    } = {},
  ): Promise<{
    responses: any[];
    metrics: any[];
  }> {
    const {
      timeout = TestEnvironment.getTimeout(5000),
      delayBetweenRequests = TestEnvironment.getDelay(10),
    } = options;

    const httpServer = this.app.getHttpServer();
    const responses: any[] = [];

    // 发送请求
    for (let i = 0; i < requestCount; i++) {
      const req = request(httpServer)[requestConfig.method.toLowerCase()](
        requestConfig.path,
      );

      if (requestConfig.headers) {
        Object.entries(requestConfig.headers).forEach(([key, value]) => {
          req.set(key, value);
        });
      }

      if (requestConfig.body) {
        req.send(requestConfig.body);
      }

      const response = await req;
      responses.push(response);

      if (
        requestConfig.expectedStatus &&
        response.status !== requestConfig.expectedStatus
      ) {
        console.warn(
          `请求 ${i + 1} 返回意外状态码: ${response.status}, 期望: ${requestConfig.expectedStatus}`,
        );
      }

      if (i < requestCount - 1) {
        await smartDelay(delayBetweenRequests);
      }
    }

    // 等待指标被记录
    const metrics = await this.waitForMetricsRecording(
      requestConfig.path,
      requestConfig.method,
      { timeout, expectedCount: requestCount },
    );

    return { responses, metrics };
  }

  /**
   * 创建临时告警规则并等待触发
   */
  async createTemporaryAlertRuleAndWaitForTrigger(
    ruleConfig: {
      id: string;
      name: string;
      metric: string;
      threshold: number;
      operator?: "gt" | "lt" | "eq" | "gte" | "lte";
      severity?: AlertSeverity;
    },
    triggerAction: () => Promise<void>,
    options: { timeout?: number; cleanup?: boolean } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(3000), cleanup = true } =
      options;

    // 创建告警规则
    const alertRule = {
      name: ruleConfig.name,
      metric: ruleConfig.metric,
      operator: ruleConfig.operator || "gt",
      threshold: ruleConfig.threshold,
      duration: 0, // 立即触发
      severity: ruleConfig.severity || AlertSeverity.WARNING,
      enabled: true,
      channels: [
        {
          name: "Test Log Channel",
          type: NotificationChannelType.LOG,
          config: { level: "info" },
          enabled: true,
        },
      ],
      cooldown: 0,
    };

    const createdRule = await this.alertingService.createRule(alertRule);

    try {
      // 执行触发动作
      await triggerAction();

      // 等待告警触发
      const triggeredAlert = await this.waitForAlertTriggered(createdRule.id, {
        timeout,
      });

      return triggeredAlert;
    } finally {
      if (cleanup) {
        // 清理告警规则和活跃告警
        await this.alertingService.deleteRule(createdRule.id);
        const activeAlerts = await this.alertHistoryService.getActiveAlerts();
        const alertsToResolve = activeAlerts.filter(
          (alert) => alert.ruleId === createdRule.id,
        );

        for (const alert of alertsToResolve) {
          await this.alertingService.resolveAlert(
            alert.id,
            "system",
            alert.ruleId,
          );
        }
      }
    }
  }

  /**
   * 等待数据库指标更新
   */
  async waitForDatabaseMetricsUpdate(
    expectedChanges: {
      totalQueries?: number;
      slowQueries?: number;
      averageQueryTime?: number;
    },
    options: { timeout?: number } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(2000) } = options;

    let finalMetrics: any;

    await waitForCondition(
      async () => {
        finalMetrics = await this.performanceMonitor.getRawMetrics();

        let allConditionsMet = true;

        if (expectedChanges.totalQueries !== undefined) {
          allConditionsMet =
            allConditionsMet &&
            finalMetrics.totalQueries >= expectedChanges.totalQueries;
        }

        if (expectedChanges.slowQueries !== undefined) {
          allConditionsMet =
            allConditionsMet &&
            finalMetrics.slowQueries >= expectedChanges.slowQueries;
        }

        if (expectedChanges.averageQueryTime !== undefined) {
          allConditionsMet =
            allConditionsMet &&
            finalMetrics.averageQueryTime >= expectedChanges.averageQueryTime;
        }

        return allConditionsMet;
      },
      {
        timeout,
        interval: 100,
        timeoutMessage: `数据库指标未在指定时间内达到预期值`,
      },
    );

    return finalMetrics;
  }

  /**
   * 等待系统指标更新
   */
  async waitForSystemMetricsUpdate(
    validator: (metrics: any) => boolean,
    options: { timeout?: number } = {},
  ): Promise<any> {
    const { timeout = TestEnvironment.getTimeout(1000) } = options;

    let finalMetrics: any;

    await waitForCondition(
      () => {
        finalMetrics = this.performanceMonitor.getSystemMetrics();
        return validator(finalMetrics);
      },
      {
        timeout,
        interval: 50,
        timeoutMessage: `系统指标未在指定时间内满足验证条件`,
      },
    );

    return finalMetrics;
  }

  /**
   * 清理测试产生的监控数据
   */
  async cleanupMonitoringData(): Promise<void> {
    try {
      // 清理告警
      const activeAlerts = await this.alertHistoryService.getActiveAlerts();
      for (const alert of activeAlerts) {
        await this.alertingService.resolveAlert(
          alert.id,
          "system",
          alert.ruleId,
        );
      }

      // 清理Redis缓存（如果有Redis服务）
      try {
        const redisService = this.app.get(
          "default_IORedisModuleConnectionToken",
        );
        const redisClient = redisService.getOrThrow();

        const testKeys = await redisClient.keys("test:*");
        if (testKeys.length > 0) {
          await redisClient.del(...testKeys);
        }

        const metricKeys = await redisClient.keys("metrics:*");
        if (metricKeys.length > 0) {
          await redisClient.del(...metricKeys);
        }
      } catch (error) {
        console.debug("Redis清理失败（可能不可用）:", error.message);
      }

      // 清理性能监控内部状态
      if ((this.performanceMonitor as any).metricBuffer) {
        (this.performanceMonitor as any).metricBuffer.length = 0;
      }

      if ((this.performanceMonitor as any).endpointStats) {
        (this.performanceMonitor as any).endpointStats.clear();
      }

      console.log("✅ 监控测试数据清理完成");
    } catch (error) {
      console.warn("⚠️ 监控测试数据清理时出现错误:", error.message);
    }
  }

  /**
   * 获取监控数据统计
   */
  async getMonitoringStats(): Promise<{
    endpointMetrics: number;
    activeAlerts: number;
    alertRules: number;
    databaseMetrics: any;
    systemMetrics: any;
  }> {
    const [endpointMetrics, databaseMetrics, systemMetrics, alertRules] =
      await Promise.all([
        this.performanceMonitor.getRawMetrics(),
        this.performanceMonitor.getRawMetrics(),
        Promise.resolve(this.performanceMonitor.getSystemMetrics()),
        this.alertingService.getRules(),
      ]);

    const activeAlerts = await this.alertHistoryService.getActiveAlerts();

    return {
      endpointMetrics: (endpointMetrics.requests || []).length,
      activeAlerts: activeAlerts.length,
      alertRules: alertRules.length,
      databaseMetrics,
      systemMetrics,
    };
  }
}

/**
 * 创建监控测试助手的工厂函数
 */
export function createMonitoringTestHelper(
  app: INestApplication,
): MonitoringTestHelper {
  const performanceMonitor = app.get<CollectorService>(CollectorService);
  const alertingService = app.get<AlertingService>(AlertingService);
  const alertHistoryService = app.get<AlertHistoryService>(AlertHistoryService);

  return new MonitoringTestHelper(
    app,
    performanceMonitor,
    alertingService,
    alertHistoryService,
  );
}

/**
 * 监控测试的通用设置和清理
 */
export class MonitoringTestSetup {
  private helper: MonitoringTestHelper;

  constructor(private readonly app: INestApplication) {
    this.helper = createMonitoringTestHelper(app);
  }

  /**
   * 测试前设置
   */
  async beforeEach(): Promise<void> {
    await this.helper.cleanupMonitoringData();
    jest.clearAllMocks();
  }

  /**
   * 测试后清理
   */
  async afterEach(): Promise<void> {
    await this.helper.cleanupMonitoringData();
  }

  /**
   * 获取助手实例
   */
  getHelper(): MonitoringTestHelper {
    return this.helper;
  }

  /**
   * 获取监控统计
   */
  async getStats(): Promise<any> {
    return this.helper.getMonitoringStats();
  }
}

/**
 * 性能测试特定的辅助函数
 */
export const PerformanceTestHelpers = {
  /**
   * 生成负载测试
   */
  async generateLoadTest(
    app: INestApplication,
    config: {
      endpoint: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      requestCount: number;
      concurrency: number;
      headers?: Record<string, string>;
      body?: any;
    },
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    metrics: any[];
  }> {
    const httpServer = app.getHttpServer();
    const helper = createMonitoringTestHelper(app);

    const startTime = Date.now();
    const promises: Promise<any>[] = [];

    // 创建并发请求
    for (let i = 0; i < config.requestCount; i++) {
      const requestPromise = (async () => {
        const req = request(httpServer)[config.method.toLowerCase()](
          config.endpoint,
        );

        if (config.headers) {
          Object.entries(config.headers).forEach(([key, value]) => {
            req.set(key, value);
          });
        }

        if (config.body) {
          req.send(config.body);
        }

        try {
          const response = await req;
          return {
            success: true,
            status: response.status,
            responseTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime,
          };
        }
      })();

      promises.push(requestPromise);

      // 控制并发数
      if (promises.length >= config.concurrency) {
        await Promise.allSettled(promises.splice(0, config.concurrency));
      }
    }

    // 等待剩余请求完成
    const results = await Promise.allSettled(promises);

    // 统计结果
    const responses = results.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false },
    );
    const successfulRequests = responses.filter((r) => r.success).length;
    const failedRequests = responses.length - successfulRequests;
    const responseTimes = responses
      .map((r) => r.responseTime)
      .filter((t) => t !== undefined);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // 等待指标记录
    await smartDelay(TestEnvironment.getDelay(500));
    const metrics = await helper.waitForMetricsRecording(
      config.endpoint,
      config.method,
      {
        expectedCount: Math.min(successfulRequests, 1),
      },
    );

    return {
      totalRequests: config.requestCount,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      metrics,
    };
  },
};
