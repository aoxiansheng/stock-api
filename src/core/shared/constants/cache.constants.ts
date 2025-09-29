/**
 * Core Shared 组件内部缓存常量定义
 *
 * 🏗️ 架构原则：core/shared 使用内部配置，保持模块独立性
 *
 * 📌 注意：core/shared 组件不依赖外部配置模块，使用内部常量
 * 确保在任何环境下都能独立运行，提供基础功能支撑
 *
 * ⚡ 合并说明：原 symbol-mapper-cache 常量已合并到此文件
 * 提供统一的缓存相关常量定义，避免重复和分散
 */

/**
 * 符号映射方向枚举
 * 按项目惯例创建枚举定义，提供类型安全的方向控制
 */
export enum MappingDirection {
  /** 从原始符号转换为标准符号 */
  TO_STANDARD = "to_standard",
  /** 从标准符号转换为原始符号 */
  FROM_STANDARD = "from_standard",
}

/**
 * 映射方向类型 - 按项目惯例创建
 * 使用 keyof typeof 模式保持与其他模块一致性
 */
export type MappingDirectionType = keyof typeof MappingDirection;

export const SHARED_CACHE_CONSTANTS = Object.freeze({
  /**
   * 内存缓存最大大小限制（防止内存溢出）
   *
   * 🎯 用途：DataChangeDetectorService 的内存快照缓存大小控制
   * 🔧 配置理由：内部组件需要固定的内存安全边界
   * 📊 监控：当缓存超过此限制时自动清理最旧数据 (LRU策略)
   */
  MAX_CACHE_SIZE: 10000,

} as const);

/**
 * 缓存清理配置
 * 用于LRU增量清理算法的核心参数
 */
export const CACHE_CLEANUP = Object.freeze({
  RETENTION_RATIO: 0.25, // 内存压力时保留25%的缓存条目
  // ✅ LRU_SORT_BATCH_SIZE 已迁移至统一配置: CacheUnifiedConfig.lruSortBatchSize
  // 使用: this.configService.get<CacheUnifiedConfigValidation>('cacheUnified')?.lruSortBatchSize || 1000
  CLEANUP_STRATEGY: "incremental", // 标识使用增量清理而非全清空
} as const);

/**
 * 内存监控配置
 */
export const MEMORY_MONITORING = Object.freeze({
  CHECK_INTERVAL: 60000, // 内存检查间隔 (60秒/1分钟) - 与FeatureFlags保持一致
  CLEANUP_THRESHOLD: 0.85, // 内存清理阈值 (85%)
  MAX_RECONNECT_DELAY: 30000, // 最大重连延迟 (30秒)
  MIN_RECONNECT_DELAY: 1000, // 最小重连延迟 (1秒)
} as const);

