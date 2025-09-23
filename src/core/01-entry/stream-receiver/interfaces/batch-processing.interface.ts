/**
 * StreamReceiver 批处理相关接口定义
 * 定义专职服务之间的契约和数据结构
 */

import { QuoteData } from './data-processing.interface';

// 重新导出QuoteData以供其他模块使用
export { QuoteData } from './data-processing.interface';


/**
 * 批处理统计接口
 */
export interface BatchProcessingStats {
  totalBatches: number;
  totalQuotes: number;
  batchProcessingTime: number;
  totalFallbacks?: number;
  partialRecoverySuccess?: number;
}

/**
 * 动态批处理状态接口
 */
export interface DynamicBatchingState {
  enabled: boolean;
  currentInterval: number;
  lastAdjustment: number;
  adjustmentCount: number;
  loadSamples: number[];
}

/**
 * 动态批处理性能指标接口
 */
export interface DynamicBatchingMetrics {
  averageLoadPer5s: number;
  loadTrend: "increasing" | "decreasing" | "stable";
  throughputPerSecond: number;
  batchCountInWindow: number;
}

/**
 * 管道数据处理回调接口
 */
export interface BatchProcessingCallbacks {
  /** 标准化符号回调 */
  ensureSymbolConsistency: (symbols: string[], provider: string) => Promise<string[]>;
  /** 缓存数据回调 */
  pipelineCacheData: (dataArray: any[], symbols: string[]) => Promise<void>;
  /** 广播数据回调 */
  pipelineBroadcastData: (dataArray: any[], symbols: string[]) => Promise<void>;
  /** 记录管道指标回调 */
  recordStreamPipelineMetrics: (metrics: any) => void;
  /** 记录管道错误回调 */
  recordPipelineError: (provider: string, capability: string, error: string, duration: number) => void;
  /** 发送监控事件回调 */
  emitMonitoringEvent: (event: string, value: any, metadata?: any) => void;
}

/**
 * 批处理器接口
 */
export interface IBatchProcessor {
  /** 设置回调函数 */
  setCallbacks(callbacks: BatchProcessingCallbacks): void;

  /** 添加报价数据到处理队列 */
  addQuoteData(quoteData: QuoteData): void;

  /** 获取批处理统计信息 */
  getBatchProcessingStats(): BatchProcessingStats;

  /** 获取动态批处理状态 */
  getDynamicBatchingState(): {
    state: DynamicBatchingState;
    metrics: DynamicBatchingMetrics;
  };
}


/**
 * 降级处理分析结果接口
 */
export interface FallbackAnalysisResult {
  symbolsCount: number;
  providersCount: number;
  marketsCount: number;
  capabilityTypes: string[];
  avgTimestamp: number;
}

/**
 * 部分恢复结果接口
 */
export interface PartialRecoveryResult {
  attempted: boolean;
  successCount: number;
  failureCount: number;
}