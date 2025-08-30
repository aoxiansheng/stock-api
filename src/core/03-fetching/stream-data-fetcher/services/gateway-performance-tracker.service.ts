import { Injectable } from '@nestjs/common';
import { createLogger } from '../../../../app/config/logger.config';

/**
 * Gateway性能追踪服务
 * 用于收集延迟、吞吐量等性能指标
 */
@Injectable()
export class GatewayPerformanceTracker {
  private readonly logger = createLogger('GatewayPerformanceTracker');
  
  // 延迟数据收集 (毫秒)
  private readonly latencyData: number[] = [];
  private readonly maxLatencyHistory = 1000; // 保留最近1000次记录
  
  // 连接统计
  private readonly connectionStats = {
    attempts: 0,
    successes: 0,
    failures: 0,
    totalConnections: 0,
    currentConnections: 0,
    lastConnection: null as Date | null,
    lastDisconnection: null as Date | null,
  };
  
  // 吞吐量统计 (每分钟请求数)
  private readonly throughputData: Array<{
    timestamp: Date;
    requests: number;
  }> = [];
  private readonly maxThroughputHistory = 60; // 保留最近60分钟数据
  
  // 性能基准数据
  private baseline: {
    p95Latency: number;
    p99Latency: number;
    averageLatency: number;
    throughput: number;
    connectionSuccessRate: number;
    timestamp: Date;
  } | null = null;

  /**
   * 记录请求延迟
   * @param latencyMs 延迟时间(毫秒)
   */
  recordLatency(latencyMs: number): void {
    this.latencyData.push(latencyMs);
    
    // 保持数组大小限制
    if (this.latencyData.length > this.maxLatencyHistory) {
      this.latencyData.shift();
    }
    
    this.logger.debug('记录延迟数据', { latencyMs, totalSamples: this.latencyData.length });
  }

  /**
   * 记录连接尝试
   * @param success 是否成功
   */
  recordConnectionAttempt(success: boolean): void {
    this.connectionStats.attempts++;
    
    if (success) {
      this.connectionStats.successes++;
      this.connectionStats.totalConnections++;
      this.connectionStats.currentConnections++;
      this.connectionStats.lastConnection = new Date();
    } else {
      this.connectionStats.failures++;
    }
    
    this.logger.debug('记录连接尝试', { 
      success, 
      attempts: this.connectionStats.attempts,
      successRate: this.getConnectionSuccessRate() 
    });
  }

  /**
   * 记录连接断开
   */
  recordDisconnection(): void {
    this.connectionStats.currentConnections = Math.max(0, this.connectionStats.currentConnections - 1);
    this.connectionStats.lastDisconnection = new Date();
    
    this.logger.debug('记录连接断开', { currentConnections: this.connectionStats.currentConnections });
  }

  /**
   * 记录吞吐量数据 (每分钟调用一次)
   * @param requestCount 当前分钟的请求数
   */
  recordThroughput(requestCount: number): void {
    this.throughputData.push({
      timestamp: new Date(),
      requests: requestCount
    });
    
    // 保持数组大小限制
    if (this.throughputData.length > this.maxThroughputHistory) {
      this.throughputData.shift();
    }
    
    this.logger.debug('记录吞吐量数据', { requestCount, historySize: this.throughputData.length });
  }

  /**
   * 计算延迟百分位数
   * @param percentile 百分位数 (如95表示P95)
   * @returns 延迟值(毫秒)
   */
  getLatencyPercentile(percentile: number): number {
    if (this.latencyData.length === 0) return 0;
    
    const sorted = [...this.latencyData].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 获取平均延迟
   * @returns 平均延迟(毫秒)
   */
  getAverageLatency(): number {
    if (this.latencyData.length === 0) return 0;
    
    const sum = this.latencyData.reduce((acc, val) => acc + val, 0);
    return sum / this.latencyData.length;
  }

  /**
   * 获取连接成功率
   * @returns 成功率百分比
   */
  getConnectionSuccessRate(): number {
    if (this.connectionStats.attempts === 0) return 100;
    
    return (this.connectionStats.successes * 100) / this.connectionStats.attempts;
  }

  /**
   * 获取当前吞吐量 (每分钟请求数)
   * @returns 吞吐量
   */
  getCurrentThroughput(): number {
    if (this.throughputData.length === 0) return 0;
    
    // 计算最近5分钟的平均吞吐量
    const recent = this.throughputData.slice(-5);
    const totalRequests = recent.reduce((sum, item) => sum + item.requests, 0);
    return totalRequests / recent.length;
  }

  /**
   * 获取完整性能指标
   * @returns 性能指标对象
   */
  getPerformanceMetrics(): {
    latency: {
      p50: number;
      p95: number;
      p99: number;
      average: number;
      samples: number;
    };
    connections: {
      successRate: number;
      current: number;
      total: number;
      attempts: number;
    };
    throughput: {
      current: number;
      peak: number;
      samples: number;
    };
    baseline?: typeof this.baseline;
  } {
    const p50 = this.getLatencyPercentile(50);
    const p95 = this.getLatencyPercentile(95);
    const p99 = this.getLatencyPercentile(99);
    const average = this.getAverageLatency();
    const throughput = this.getCurrentThroughput();
    const peak = this.throughputData.length > 0 
      ? Math.max(...this.throughputData.map(item => item.requests)) 
      : 0;

    return {
      latency: {
        p50: Math.round(p50 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        average: Math.round(average * 100) / 100,
        samples: this.latencyData.length
      },
      connections: {
        successRate: Math.round(this.getConnectionSuccessRate() * 100) / 100,
        current: this.connectionStats.currentConnections,
        total: this.connectionStats.totalConnections,
        attempts: this.connectionStats.attempts
      },
      throughput: {
        current: Math.round(throughput * 100) / 100,
        peak,
        samples: this.throughputData.length
      },
      baseline: this.baseline
    };
  }

  /**
   * 设置性能基准
   * 用于性能对比
   */
  setBaseline(): void {
    const metrics = this.getPerformanceMetrics();
    
    this.baseline = {
      p95Latency: metrics.latency.p95,
      p99Latency: metrics.latency.p99,
      averageLatency: metrics.latency.average,
      throughput: metrics.throughput.current,
      connectionSuccessRate: metrics.connections.successRate,
      timestamp: new Date()
    };
    
    this.logger.log('性能基准已设置', this.baseline);
  }

  /**
   * 与基准进行对比
   * @returns 性能变化报告
   */
  compareWithBaseline(): {
    hasBaseline: boolean;
    changes?: {
      p95LatencyChange: number;
      p99LatencyChange: number;
      averageLatencyChange: number;
      throughputChange: number;
      connectionSuccessRateChange: number;
    };
    recommendations?: string[];
  } {
    if (!this.baseline) {
      return { hasBaseline: false };
    }
    
    const current = this.getPerformanceMetrics();
    const recommendations: string[] = [];
    
    const changes = {
      p95LatencyChange: current.latency.p95 - this.baseline.p95Latency,
      p99LatencyChange: current.latency.p99 - this.baseline.p99Latency,
      averageLatencyChange: current.latency.average - this.baseline.averageLatency,
      throughputChange: current.throughput.current - this.baseline.throughput,
      connectionSuccessRateChange: current.connections.successRate - this.baseline.connectionSuccessRate,
    };
    
    // 生成建议
    if (changes.p95LatencyChange > 10) {
      recommendations.push('P95延迟增加超过10ms，检查Gateway性能');
    }
    if (changes.connectionSuccessRateChange < -1) {
      recommendations.push('连接成功率下降，检查网络和服务器状态');
    }
    if (changes.throughputChange < -10) {
      recommendations.push('吞吐量下降明显，检查系统负载');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('性能指标稳定，无需优化');
    }
    
    return {
      hasBaseline: true,
      changes,
      recommendations
    };
  }

  /**
   * 重置所有统计数据
   */
  reset(): void {
    this.latencyData.length = 0;
    this.throughputData.length = 0;
    
    this.connectionStats.attempts = 0;
    this.connectionStats.successes = 0;
    this.connectionStats.failures = 0;
    this.connectionStats.totalConnections = 0;
    this.connectionStats.currentConnections = 0;
    this.connectionStats.lastConnection = null;
    this.connectionStats.lastDisconnection = null;
    
    this.baseline = null;
    
    this.logger.log('性能统计数据已重置');
  }
}