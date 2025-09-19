import { Market } from "../../../shared/constants/market.constants";
import { MarketStatusResult } from "../../../shared/services/market-status.service";

/**
 * 智能缓存策略枚举
 * 定义5种不同的缓存策略类型
 */
export enum CacheStrategy {
  /**
   * 强时效性缓存 - 适用于Receiver
   * 短TTL，快速失效，确保数据新鲜度
   */
  STRONG_TIMELINESS = "strong_timeliness",

  /**
   * 弱时效性缓存 - 适用于Query
   * 长TTL，减少后台更新频率
   */
  WEAK_TIMELINESS = "weak_timeliness",

  /**
   * 市场感知缓存 - 根据市场状态动态调整
   * 开市时短TTL，闭市时长TTL
   */
  MARKET_AWARE = "market_aware",

  /**
   * 无缓存策略 - 直接获取数据
   * 用于需要实时数据的场景
   */
  NO_CACHE = "no_cache",

  /**
   * 自适应缓存 - 基于数据变化频率调整
   * 动态调整TTL和更新策略
   */
  ADAPTIVE = "adaptive",
}

/**
 * 智能缓存编排器请求接口
 * 标准化的缓存请求参数
 */
export interface CacheOrchestratorRequest<T> {
  /** 缓存键 */
  cacheKey: string;

  /** 缓存策略 */
  strategy: CacheStrategy;

  /** 符号列表 */
  symbols: string[];

  /** 数据获取函数 */
  fetchFn: () => Promise<T>;

  /** 额外元数据 */
  metadata?: {
    /** 市场信息 */
    market?: Market;
    /** 请求ID */
    requestId?: string;
    /** 数据类型 */
    dataType?: string;
    /** 其他参数 */
    [key: string]: any;
  };
}

/**
 * 智能缓存编排器结果接口
 * 统一的缓存操作结果格式
 */
export interface CacheOrchestratorResult<T> {
  /** 返回的数据 */
  data: T;

  /** 缓存命中信息 */
  hit: boolean;

  /** TTL剩余时间（秒） */
  ttlRemaining?: number;

  /** 动态TTL（秒） */
  dynamicTtl?: number;

  /** 使用的策略 */
  strategy: CacheStrategy;

  /** 缓存键 */
  storageKey: string;

  /** 数据时间戳 */
  timestamp?: string;

  /** 错误信息（如有） */
  error?: string;
}


/**
 * 后台更新任务接口
 * 管理后台数据更新的任务结构
 */
export interface BackgroundUpdateTask {
  /** 任务ID */
  taskId: string;

  /** 缓存键 */
  cacheKey: string;

  /** 符号列表 */
  symbols: string[];

  /** 数据获取函数 */
  fetchFn: () => Promise<any>;

  /** 任务优先级 */
  priority: number;

  /** 创建时间戳 */
  createdAt: number;

  /** 预计执行时间 */
  scheduledAt: number;

  /** 重试次数 */
  retryCount: number;

  /** 最大重试次数 */
  maxRetries: number;

  /** 任务状态 */
  status: "pending" | "running" | "completed" | "failed";

  /** 市场信息 */
  market?: Market;

  /** 错误信息（如有） */
  error?: string;
}

/**
 * 市场状态查询结果扩展
 * 基于MarketStatusService的返回格式
 */
export interface MarketStatusQueryResult {
  /** 市场状态映射 */
  marketStatus: Record<Market, MarketStatusResult>;

  /** 查询时间戳 */
  timestamp: string;

  /** 是否查询成功 */
  success: boolean;
}

/**
 * 智能缓存配置元数据接口
 * 用于传递配置相关信息
 */
export interface CacheConfigMetadata {
  /** 最小更新间隔（毫秒） */
  minUpdateInterval: number;

  /** 最大并发更新数 */
  maxConcurrentUpdates: number;

  /** 优雅关闭超时时间（毫秒） */
  gracefulShutdownTimeout: number;

  /** 是否启用后台更新 */
  enableBackgroundUpdate: boolean;

  /** 是否启用数据变化检测 */
  enableDataChangeDetection: boolean;
}

/**
 * 策略配置映射接口
 * 每种策略对应的具体配置参数
 */
export interface StrategyConfigMapping {
  /** 强时效性策略配置 */
  [CacheStrategy.STRONG_TIMELINESS]: {
    ttl: number;
    enableBackgroundUpdate: boolean;
    updateThresholdRatio: number;
  };

  /** 弱时效性策略配置 */
  [CacheStrategy.WEAK_TIMELINESS]: {
    ttl: number;
    enableBackgroundUpdate: boolean;
    updateThresholdRatio: number;
  };

  /** 市场感知策略配置 */
  [CacheStrategy.MARKET_AWARE]: {
    openMarketTtl: number;
    closedMarketTtl: number;
    enableBackgroundUpdate: boolean;
    marketStatusCheckInterval: number;
  };

  /** 无缓存策略配置 */
  [CacheStrategy.NO_CACHE]: {
    bypassCache: boolean;
  };

  /** 自适应策略配置 */
  [CacheStrategy.ADAPTIVE]: {
    baseTtl: number;
    minTtl: number;
    maxTtl: number;
    adaptationFactor: number;
    enableBackgroundUpdate: boolean;
  };
}
