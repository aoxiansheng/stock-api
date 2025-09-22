/**
 * Core Shared 组件内部缓存常量定义
 *
 * 🏗️ 架构原则：core/shared 使用内部配置，保持模块独立性
 *
 * 📌 注意：core/shared 组件不依赖外部配置模块，使用内部常量
 * 确保在任何环境下都能独立运行，提供基础功能支撑
 */
export const SHARED_CACHE_CONSTANTS = {
  /**
   * 内存缓存最大大小限制（防止内存溢出）
   *
   * 🎯 用途：DataChangeDetectorService 的内存快照缓存大小控制
   * 🔧 配置理由：内部组件需要固定的内存安全边界
   * 📊 监控：当缓存超过此限制时自动清理最旧数据 (LRU策略)
   */
  MAX_CACHE_SIZE: 10000,

} as const;

