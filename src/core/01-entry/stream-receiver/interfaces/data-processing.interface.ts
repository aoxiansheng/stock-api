/**
 * StreamDataProcessor 接口定义
 *
 * 从 StreamReceiverService 中分离出来的数据流处理逻辑接口，负责：
 * 1. 数据管道化处理和转换
 * 2. 符号标准化和一致性保证
 * 3. 数据缓存和广播
 * 4. 性能监控和错误处理
 */

/**
 * 批量处理的报价数据
 */
export interface QuoteData {
  rawData: any;
  providerName: string;
  wsCapabilityType: string;
  timestamp: number;
  symbols: string[];
}

/**
 * 数据处理管道指标接口
 */
export interface DataPipelineMetrics {
  provider: string;
  capability: string;
  quotesCount: number;
  symbolsCount: number;
  durations: {
    total: number;
    transform: number;
    cache: number;
    broadcast: number;
  };
}

/**
 * 数据处理统计信息
 */
export interface DataProcessingStats {
  totalProcessed: number;
  totalSymbolsProcessed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  totalErrors: number;
  errorRate: number;
  lastProcessedAt: number;
}

/**
 * 符号一致性检查结果
 */
export interface SymbolConsistencyResult {
  originalSymbols: string[];
  standardizedSymbols: string[];
  inconsistencyCount: number;
  mappingUsed: boolean;
  processingTime: number;
}

/**
 * 数据处理回调接口
 */
export interface DataProcessingCallbacks {
  /** 标准化符号回调 */
  ensureSymbolConsistency: (symbols: string[], provider: string) => Promise<string[]>;
  /** 缓存数据回调 */
  pipelineCacheData: (dataArray: any[], symbols: string[]) => Promise<void>;
  /** 广播数据回调 */
  pipelineBroadcastData: (dataArray: any[], symbols: string[]) => Promise<void>;
  /** 记录管道指标回调 */
  recordStreamPipelineMetrics: (metrics: DataPipelineMetrics) => void;
  /** 记录管道错误回调 */
  recordPipelineError: (provider: string, capability: string, error: string, duration: number) => void;
  /** 发送监控事件回调 */
  emitMonitoringEvent: (event: string, value: any, metadata?: any) => void;
}

/**
 * 数据处理配置
 */
export interface DataProcessingConfig {
  /** 数据转换超时 */
  transformTimeoutMs: number;
  /** 缓存超时 */
  cacheTimeoutMs: number;
  /** 广播超时 */
  broadcastTimeoutMs: number;
  /** 是否启用性能监控 */
  enablePerformanceMetrics: boolean;
  /** 是否启用错误重试 */
  enableRetry: boolean;
  /** 最大重试次数 */
  maxRetryAttempts: number;
  /** 重试延迟基数 */
  retryDelayBase: number;
}

/**
 * 数据处理器接口
 */
export interface IDataProcessor {
  /** 设置回调函数 */
  setCallbacks(callbacks: DataProcessingCallbacks): void;

  /** 处理批量数据通过管道 */
  processDataThroughPipeline(
    quotes: QuoteData[],
    provider: string,
    capability: string
  ): Promise<void>;

  /** 将能力映射到转换规则类型 */
  mapCapabilityToTransformRuleType(capability: string): string;

  /** 获取数据处理统计信息 */
  getDataProcessingStats(): DataProcessingStats;

  /** 重置数据处理统计 */
  resetDataProcessingStats(): void;
}

/**
 * 能力映射配置
 */
export interface CapabilityMappingConfig {
  /** WebSocket 流能力映射 */
  websocketCapabilities: Record<string, string>;
  /** REST API 能力映射 */
  restApiCapabilities: Record<string, string>;
  /** 实时数据流能力映射 */
  streamingCapabilities: Record<string, string>;
  /** 基础信息能力映射 */
  basicInfoCapabilities: Record<string, string>;
  /** 历史数据能力映射 */
  historicalDataCapabilities: Record<string, string>;
  /** 新闻和公告能力映射 */
  newsAndAnnouncementCapabilities: Record<string, string>;
  /** 默认兜底映射 */
  defaultFallbackMapping: string;
}

/**
 * 智能能力映射结果
 */
export interface IntelligentMappingResult {
  mappedRuleType: string;
  confidence: number;
  method: "direct_mapping" | "intelligent_analysis" | "fallback_inference";
  matchedPattern?: string;
}

/**
 * 数据处理错误信息
 */
export interface DataProcessingError {
  provider: string;
  capability: string;
  quotesCount: number;
  error: string;
  duration: number;
  timestamp: number;
  stage: "transform" | "cache" | "broadcast" | "symbol_consistency";
}