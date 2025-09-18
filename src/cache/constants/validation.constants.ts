/**
 * Cache 模块验证常量
 * 🎯 Cache 特定的验证限制常量
 * 
 * @description 从 common/constants/validation.constants.ts 迁移的 Cache 专用常量
 */

/**
 * 缓存相关验证限制
 * 🎯 从 common/constants/validation.constants.ts 迁移
 * 专门针对缓存模块的验证常量
 */
export const CACHE_VALIDATION_LIMITS = Object.freeze({
  // Redis 键格式限制（Cache 特有）
  CACHE_KEY_MAX_LENGTH: 250, // Redis键最大长度限制
  
  // TTL 限制
  TTL_MIN_SECONDS: 1, // 最小1秒TTL
  TTL_MAX_SECONDS: 7 * 24 * 3600, // 最大7天TTL (604800秒)
  
  // 批量操作限制
  BATCH_MAX_SIZE: 1000, // 最大批量操作大小
});