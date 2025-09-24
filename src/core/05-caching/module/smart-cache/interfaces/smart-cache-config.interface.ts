/**
 * Smart Cache Strategy Types
 *
 * This file contains strategy types and enums that are still referenced by
 * SmartCacheStandardizedService. Legacy configuration interfaces have been
 * removed in favor of the unified CacheUnifiedConfigInterface.
 *
 * @deprecated This file will be further cleaned up as SmartCacheStandardizedService
 * migrates to use CacheStrategyType from foundation types.
 */

/**
 * 智能缓存策略枚举
 * 定义5种不同的缓存策略类型
 *
 * @deprecated Use CacheStrategyType from foundation types instead
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
