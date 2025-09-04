/**
 * Smart Cache 核心常量定义
 * 采用描述性命名，明确单位和语义
 */
export const SMART_CACHE_CONSTANTS = Object.freeze({
  // TTL相关常量 - 解决TTL值重复问题，所有TTL单位为秒(s)
  TTL_SECONDS: {
    STRONG_TIMELINESS_DEFAULT_S: 5,         // 强时效性默认TTL(秒) - 替换：smart-cache-orchestrator.service.ts:106, 193
    WEAK_TIMELINESS_DEFAULT_S: 300,         // 弱时效性默认TTL(秒) - 替换：smart-cache-config.interface.ts:202, smart-cache-orchestrator.service.ts:113, 200
    MARKET_OPEN_DEFAULT_S: 30,              // 市场开盘时默认TTL(秒)
    MARKET_CLOSED_DEFAULT_S: 1800,          // 市场闭盘时默认TTL(秒)
    ADAPTIVE_BASE_DEFAULT_S: 180,           // 自适应策略基础TTL(秒)
    ADAPTIVE_MIN_S: 30,                     // 自适应策略最小TTL(秒)
    ADAPTIVE_MAX_S: 3600,                   // 自适应策略最大TTL(秒)
  },
  
  // 时间间隔常量 - 解决30000重复使用问题，所有间隔单位为毫秒(ms)
  INTERVALS_MS: {
    DEFAULT_MIN_UPDATE_INTERVAL_MS: 30000,  // 默认最小更新间隔(毫秒) - 替换：8个位置的硬编码30000
    GRACEFUL_SHUTDOWN_TIMEOUT_MS: 30000,    // 优雅关闭超时时间(毫秒)
    MEMORY_CHECK_INTERVAL_MS: 30000,        // 内存检查间隔(毫秒)
    CPU_CHECK_INTERVAL_MS: 60000,           // CPU检查间隔(毫秒)
    METRICS_COLLECTION_INTERVAL_MS: 15000,  // 指标收集间隔(毫秒)
    HEALTH_CHECK_INTERVAL_MS: 10000,        // 健康检查间隔(毫秒)
  },
  
  // 并发控制常量 - 明确表示数量类型
  CONCURRENCY_LIMITS: {
    MIN_CONCURRENT_UPDATES_COUNT: 2,        // 最小并发更新数量 - 替换：smart-cache-config.factory.ts:52中的硬编码2
    MAX_CONCURRENT_UPDATES_COUNT: 16,       // 最大并发更新数量 - 替换：smart-cache-config.factory.ts:52中的硬编码16
    DEFAULT_BATCH_SIZE_COUNT: 10,           // 默认批次大小(个)
    MAX_BATCH_SIZE_COUNT: 50,               // 最大批次大小(个)
    MIN_BATCH_SIZE_COUNT: 5,                // 最小批次大小(个)
  },
  
  // 阈值常量 - 解决阈值数值重复问题，明确表示比例类型
  THRESHOLD_RATIOS: {
    STRONG_UPDATE_RATIO: 0.3,               // 强时效性更新阈值比例 - 替换：smart-cache-config.interface.ts:196, smart-cache-orchestrator.service.ts:108
    WEAK_UPDATE_RATIO: 0.2,                 // 弱时效性更新阈值比例
    MARKET_OPEN_UPDATE_RATIO: 0.3,          // 市场开盘时更新阈值比例
    MARKET_CLOSED_UPDATE_RATIO: 0.1,        // 市场闭盘时更新阈值比例
    MEMORY_PRESSURE_THRESHOLD: 0.85,        // 内存压力阈值 - 替换：smart-cache-performance-optimizer.service.ts:170
    CPU_PRESSURE_THRESHOLD: 0.80,           // CPU压力阈值
    CACHE_HIT_RATE_TARGET: 0.90,            // 缓存命中率目标
    ERROR_RATE_THRESHOLD: 0.01,             // 错误率阈值
  },
  
  // 边界值常量 - 新增，明确业务规则边界
  BOUNDARIES: {
    MIN_CPU_CORES_COUNT: 2,                 // 最小CPU核心数
    MAX_CPU_CORES_COUNT: 16,                // 最大CPU核心数
    MIN_MEMORY_MB: 512,                     // 最小内存要求(MB)
    MAX_CACHE_SIZE_MB: 1024,                // 最大缓存大小(MB)
  },
  
  // 组件标识常量 - 解决字符串重复问题
  COMPONENT_IDENTIFIERS: {
    NAME: 'smart_cache_orchestrator',        // 组件名称 - 替换：6个位置的硬编码字符串
    VERSION: '2.0.0',                       // 组件版本
    NAMESPACE: 'smart-cache',                // 命名空间
  },
} as const); // 使用 as const 提供更严格的类型推导

// 从常量对象推导类型，提高类型安全性
export type SmartCacheConstantsType = typeof SMART_CACHE_CONSTANTS;
export type TTLSecondsType = typeof SMART_CACHE_CONSTANTS.TTL_SECONDS;
export type IntervalsType = typeof SMART_CACHE_CONSTANTS.INTERVALS_MS;
export type ConcurrencyLimitsType = typeof SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS;
export type ThresholdRatiosType = typeof SMART_CACHE_CONSTANTS.THRESHOLD_RATIOS;