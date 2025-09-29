/**
 * 缓存模块验证相关类型定义
 * 
 * 为各缓存模块的配置验证提供共享的类型定义，
 * 避免重复定义并确保一致性。
 */

/**
 * 子验证结果接口
 * 
 * 用于表示单个验证步骤的结果，包含错误和警告信息。
 * 被各种配置验证器使用，如：
 * - DataMapperCacheConfigValidator
 * - StreamCacheConfigValidator
 * - SmartCacheConfigValidator
 * - SymbolMapperCacheConfigValidator
 */
export interface ValidationSubResult {
  /** 验证错误列表 - 这些错误会导致配置验证失败 */
  errors: string[];
  /** 验证警告列表 - 这些警告不会导致验证失败，但建议关注 */
  warnings: string[];
}

/**
 * 完整验证结果接口
 * 
 * 表示完整的配置验证结果，继承基础的子验证结果
 * 并添加总体状态和摘要信息。
 */
export interface ValidationResult extends ValidationSubResult {
  /** 验证是否通过（无错误） */
  isValid: boolean;
  /** 验证结果摘要信息 */
  summary: string;
}
