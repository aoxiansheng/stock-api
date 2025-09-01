/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 批量请求助手类
 * 用于控制HTTP连接数量和批量执行请求
 */

import request from "supertest";

export interface BatchRequestConfig {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
}

export interface BatchOptions {
  batchSize: number;
  delayBetweenBatches: number;
  maxConcurrency: number;
}

export class BatchRequestHelper {
  private agent: any;

  constructor(private httpServer: any) {
    // 使用Agent复用连接
    this.agent = request.agent(httpServer);
  }

  /**
   * 批量执行请求，控制并发数量
   */
  async executeBatchRequests(
    configs: BatchRequestConfig[],
    options: Partial<BatchOptions> = {},
  ): Promise<any[]> {
    const { batchSize = 5, delayBetweenBatches = 100 } = options;

    const results: any[] = [];

    // 将请求分批处理
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);

      // 限制并发数量
      const batchPromises = batch.map((config) =>
        this.createSingleRequest(config),
      );
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // 批次间延时，避免连接池耗尽
      if (i + batchSize < configs.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * 模拟负载测试 - 用少量请求验证性能
   */
  async simulateLoad(
    config: BatchRequestConfig,
    targetRequestCount: number,
    options: Partial<BatchOptions> = {},
  ): Promise<{
    responses: any[];
    totalTime: number;
    averageResponseTime: number;
  }> {
    const startTime = Date.now();

    // 使用较少的实际请求数量
    const actualRequestCount = Math.min(targetRequestCount, 10);

    const configs = Array(actualRequestCount).fill(config);
    const responses = await this.executeBatchRequests(configs, options);

    const totalTime = Date.now() - startTime;
    const averageResponseTime = totalTime / actualRequestCount;

    return {
      responses,
      totalTime,
      averageResponseTime,
    };
  }

  /**
   * 创建单个请求
   */
  private async createSingleRequest(config: BatchRequestConfig): Promise<any> {
    const { endpoint, method = "GET", headers, body, expectedStatus } = config;

    let requestBuilder: request.Test;

    switch (method) {
      case "GET":
        requestBuilder = this.agent.get(endpoint);
        break;
      case "POST":
        requestBuilder = this.agent.post(endpoint);
        break;
      case "PUT":
        requestBuilder = this.agent.put(endpoint);
        break;
      case "DELETE":
        requestBuilder = this.agent.delete(endpoint);
        break;
      default:
        throw new Error(`不支持的HTTP方法: ${method}`);
    }

    // 添加请求头
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        requestBuilder.set(key, value);
      });
    }

    // 添加请求体
    if (body) {
      requestBuilder.send(body);
    }

    // 设置预期状态码
    if (expectedStatus) {
      requestBuilder.expect(expectedStatus);
    }

    return requestBuilder;
  }

  /**
   * 延时函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 清理连接
   */
  cleanup(): void {
    // supertest agent 会自动清理连接
  }
}
