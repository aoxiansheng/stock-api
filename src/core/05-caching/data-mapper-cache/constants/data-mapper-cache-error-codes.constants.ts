/**
 * Data Mapper Cache Error Codes
 * 数据映射缓存组件错误代码
 *
 * 清理说明：删除了未使用的错误代码，只保留实际在代码中使用的3个常量
 */
export const DATA_MAPPER_CACHE_ERROR_CODES = {
  // Validation errors - 仅保留实际使用的验证错误代码
  INVALID_RULE_ID: 'DATA_MAPPER_CACHE_VALIDATION_001',      // 使用位置: data-mapper-cache.service.ts:1148
  INVALID_KEY_FORMAT: 'DATA_MAPPER_CACHE_VALIDATION_002',   // 使用位置: data-mapper-cache.service.ts:1179
  KEY_LENGTH_EXCEEDED: 'DATA_MAPPER_CACHE_VALIDATION_003',  // 使用位置: data-mapper-cache.service.ts:1163
} as const; 