/* eslint-disable @typescript-eslint/no-unused-vars */
import * as request from "supertest";

/**
 * 并发请求测试结果接口
 */
export interface ConcurrentTestResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  startTime: number;
  endTime: number;
  batches: number;
  averageResponseTime?: number;
  successRate: number;
}

/**
 * 内存分析结果接口
 */
export interface MemoryAnalysis {
  initialMemory: number;
  finalMemory: number;
  memoryIncrease: number;
  increasePercent: number;
  isWithinLimit: boolean;
}

/**
 * 并发请求配置接口
 */
export interface ConcurrentRequestConfig {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  totalRequests: number;
  batchSize?: number;
  batchDelay?: number;
  requestTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  queryParams?: any;
  _body?: any;
  _headers?: any;
}

/**
 * 并发请求测试辅助工具
 * 提供并发请求执行、错误处理、内存监控等功能
 */
export class ConcurrentRequestHelper {
  private httpServer: any;
  private defaultOptions = {
    method: "GET" as const,
    batchSize: 3,
    batchDelay: 200,
    requestTimeout: 5000,
    maxRetries: 1,
    retryDelay: 100,
  };

  constructor(httpServer: any) {
    this.httpServer = httpServer;
  }

  /**
   * 执行并发请求测试
   */
  async executeConcurrentRequests(config: ConcurrentRequestConfig) {
    const finalConfig = { ...this.defaultOptions, ...config };
    const responses: any[] = [];
    const responseTimes: number[] = [];
    const results: ConcurrentTestResult = {
      total: finalConfig.totalRequests,
      successful: 0,
      failed: 0,
      errors: [],
      startTime: Date.now(),
      endTime: 0,
      batches: 0,
      successRate: 0,
    };

    console.log(`🔍 开始并发${finalConfig.method}请求测试:`);
    console.log(`  - 总请求数: ${finalConfig.totalRequests}`);
    console.log(`  - 批大小: ${finalConfig.batchSize}`);
    console.log(`  - 批延迟: ${finalConfig.batchDelay}ms`);
    console.log(`  - 请求超时: ${finalConfig.requestTimeout}ms`);

    for (let i = 0; i < finalConfig.totalRequests; i += finalConfig.batchSize) {
      const currentBatch = Math.floor(i / finalConfig.batchSize) + 1;
      const totalBatches = Math.ceil(
        finalConfig.totalRequests / finalConfig.batchSize,
      );
      results.batches = totalBatches;

      console.log(`🔍 执行批次 ${currentBatch}/${totalBatches}...`);

      const batch = Array(
        Math.min(finalConfig.batchSize, finalConfig.totalRequests - i),
      )
        .fill(0)
        .map((_, j) =>
          this.createSingleRequest(finalConfig, {
            ...finalConfig.queryParams,
            batch: currentBatch,
            request: j + 1,
            timestamp: Date.now(),
          }),
        );

      try {
        const batchStart = Date.now();
        const batchResponses = await Promise.allSettled(batch);
        const batchEnd = Date.now();

        responses.push(...batchResponses);

        // 记录响应时间
        batchResponses.forEach((response) => {
          if (
            response.status === "fulfilled" &&
            !(response.value as any).error
          ) {
            responseTimes.push(batchEnd - batchStart);
          }
        });

        // 分析批次结果
        const batchSuccessful = batchResponses.filter(
          (r) => r.status === "fulfilled" && !(r.value as any).error,
        ).length;
        const batchFailed = batchResponses.length - batchSuccessful;

        console.log(
          `✅ 批次 ${currentBatch} 完成: ${batchSuccessful}成功, ${batchFailed}失败`,
        );

        // 批次间延迟
        if (i + finalConfig.batchSize < finalConfig.totalRequests) {
          await new Promise((resolve) =>
            setTimeout(resolve, finalConfig.batchDelay),
          );
        }
      } catch (batchError: any) {
        console.log(`❌ 批次 ${currentBatch} 执行出错:`, batchError._message);
        const failedBatch = Array(
          Math.min(finalConfig.batchSize, finalConfig.totalRequests - i),
        )
          .fill(0)
          .map(() => ({ status: "rejected", reason: batchError }));
        responses.push(...failedBatch);
      }
    }

    // 统计结果
    results.endTime = Date.now();

    responses.forEach((response) => {
      if (response.status === "fulfilled" && !response.value.error) {
        results.successful++;
      } else {
        results.failed++;
        const error =
          response.status === "rejected"
            ? response.reason?.message ||
              response.reason?.code ||
              "Unknown error"
            : response.value?.error;
        results.errors.push(error);
      }
    });

    results.successRate = results.successful / results.total;
    results.averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    console.log(`🔍 并发请求测试完成:`);
    console.log(`  - 成功率: ${(results.successRate * 100).toFixed(1)}%`);
    console.log(`  - 总耗时: ${results.endTime - results.startTime}ms`);
    if (results.averageResponseTime > 0) {
      console.log(
        `  - 平均响应时间: ${results.averageResponseTime.toFixed(1)}ms`,
      );
    }

    return {
      responses,
      results,
      successfulRequests: responses.filter(
        (r) => r.status === "fulfilled" && !r.value.error,
      ),
      failedRequests: responses.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && r.value.error),
      ),
    };
  }

  /**
   * 创建单个请求（带重试机制）
   */
  private async createSingleRequest(
    config: ConcurrentRequestConfig,
    queryParams: any,
  ) {
    const maxRetries = config.maxRetries || this.defaultOptions.maxRetries;
    const retryDelay = config.retryDelay || this.defaultOptions.retryDelay;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let requestBuilder: any;

        // 选择HTTP方法
        switch (config.method || "GET") {
          case "GET":
            requestBuilder = request(this.httpServer).get(config.endpoint);
            break;
          case "POST":
            requestBuilder = request(this.httpServer).post(config.endpoint);
            break;
          case "PUT":
            requestBuilder = request(this.httpServer).put(config.endpoint);
            break;
          case "DELETE":
            requestBuilder = request(this.httpServer).delete(config.endpoint);
            break;
        }

        // 添加查询参数
        if (queryParams) {
          requestBuilder = requestBuilder.query(queryParams);
        }

        // 添加请求体
        if (config._body) {
          requestBuilder = requestBuilder.send(config._body);
        }

        // 添加请求头
        if (config._headers) {
          Object.entries(config._headers).forEach(([key, value]) => {
            requestBuilder = requestBuilder.set(key, value as string);
          });
        }

        // 设置超时
        const response = await requestBuilder.timeout(
          config.requestTimeout || this.defaultOptions.requestTimeout,
        );
        return response;
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          // 等待一段时间后重试
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          console.log(
            `🔄 重试请求 ${queryParams.batch}-${queryParams.request} (尝试 ${attempt + 2}/${maxRetries + 1})`,
          );
        }
      }
    }

    // 所有重试都失败，返回错误
    return {
      error:
        lastError?.message || lastError?.code || "Request failed after retries",
    };
  }

  /**
   * 验证内存使用情况
   */
  async checkMemoryUsage(
    initialMemory: number,
    maxIncreasePercent: number = 50,
  ): Promise<MemoryAnalysis> {
    // 强制垃圾回收
    if (global._gc) {
      console.log("🧹 执行垃圾回收...");
      global.gc();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const increasePercent = (memoryIncrease / initialMemory) * 100;

    console.log(`🔍 内存使用分析:`);
    console.log(`  - 初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - 最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(
      `  - 内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercent.toFixed(1)}%)`,
    );
    console.log(
      `  - 是否在限制内: ${increasePercent <= maxIncreasePercent ? "✅" : "❌"}`,
    );

    return {
      initialMemory,
      finalMemory,
      memoryIncrease,
      increasePercent,
      isWithinLimit: increasePercent <= maxIncreasePercent,
    };
  }

  /**
   * 分析错误模式
   */
  analyzeErrorPatterns(errors: string[]): Record<string, number> {
    return errors.reduce(
      (acc, error) => {
        // 简化错误消息以便分组
        const simplifiedError = this.simplifyErrorMessage(error);
        acc[simplifiedError] = (acc[simplifiedError] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * 简化错误消息
   */
  private simplifyErrorMessage(error: string): string {
    if (!error) return "Unknown error";

    // 标准化常见错误
    if (error.includes("ECONNRESET")) return "Connection reset";
    if (error.includes("ECONNREFUSED")) return "Connection refused";
    if (error.includes("ETIMEDOUT")) return "Request timeout";
    if (error.includes("timeout")) return "Timeout";
    if (error.includes("socket hang up")) return "Socket hang up";

    return error;
  }

  /**
   * 生成测试报告
   */
  generateReport(
    results: ConcurrentTestResult,
    memoryAnalysis: MemoryAnalysis,
    errorPatterns?: Record<string, number>,
  ) {
    console.log("\n📊 并发测试报告:");
    console.log("=".repeat(50));
    console.log(`请求统计:`);
    console.log(`  - 总请求数: ${results.total}`);
    console.log(
      `  - 成功请求: ${results.successful} (${(results.successRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `  - 失败请求: ${results.failed} (${((1 - results.successRate) * 100).toFixed(1)}%)`,
    );
    console.log(`  - 总耗时: ${results.endTime - results.startTime}ms`);

    if (results.averageResponseTime) {
      console.log(
        `  - 平均响应时间: ${results.averageResponseTime.toFixed(1)}ms`,
      );
    }

    console.log(`\n内存使用:`);
    console.log(
      `  - 内存增长: ${(memoryAnalysis.memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
    );
    console.log(
      `  - 增长百分比: ${memoryAnalysis.increasePercent.toFixed(1)}%`,
    );
    console.log(
      `  - 是否在限制内: ${memoryAnalysis.isWithinLimit ? "✅" : "❌"}`,
    );

    if (errorPatterns && Object.keys(errorPatterns).length > 0) {
      console.log(`\n错误分析:`);
      Object.entries(errorPatterns)
        .sort(([, a], [, b]) => b - a)
        .forEach(([error, count]) => {
          console.log(`  - ${error}: ${count}次`);
        });
    }

    console.log("=".repeat(50));
  }
}

/**
 * 测试性能基准工具
 */
export class PerformanceBenchmark {
  private baselines: Record<string, number> = {};

  /**
   * 设置性能基准
   */
  setBaseline(name: string, value: number): void {
    this.baselines[name] = value;
  }

  /**
   * 检查性能是否在基准范围内
   */
  checkPerformance(
    name: string,
    actualValue: number,
    tolerancePercent: number = 20,
  ): boolean {
    const baseline = this.baselines[name];
    if (!baseline) {
      console.log(`⚠️ 没有找到 ${name} 的性能基准`);
      return true; // 如果没有基准，认为通过
    }

    const tolerance = baseline * (tolerancePercent / 100);
    const isWithinTolerance = actualValue <= baseline + tolerance;

    console.log(`📈 性能检查 ${name}:`);
    console.log(`  - 基准值: ${baseline}`);
    console.log(`  - 实际值: ${actualValue}`);
    console.log(`  - 容忍度: ±${tolerancePercent}%`);
    console.log(`  - 结果: ${isWithinTolerance ? "✅ 通过" : "❌ 超出基准"}`);

    return isWithinTolerance;
  }
}
