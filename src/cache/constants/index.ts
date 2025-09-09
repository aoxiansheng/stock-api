/**
 * Cache 模块常量统一导出入口
 * 🎯 从 common/constants 剥离的 Cache 模块专用常量
 * 
 * 包含:
 * - CACHE_TTL_SEMANTICS 缓存TTL语义配置
 * - CacheTTLUtil 缓存TTL工具类
 */

// ================================
// 从 common 常量剥离的专属导出
// ================================
export * from './ttl';
export { 
  CACHE_TTL_SEMANTICS,
  CACHE_STRATEGY_SEMANTICS,
  CACHE_SIZE_SEMANTICS,
  CACHE_PERFORMANCE_SEMANTICS,
  CACHE_OPERATIONS_SEMANTICS,
  CACHE_KEY_PATTERNS,
  CacheTTLUtil 
} from './ttl';