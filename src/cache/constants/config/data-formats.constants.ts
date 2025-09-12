/**
 * 缓存数据格式常量
 * 🎯 符合开发规范指南 - 统一常量管理
 * 解决魔法字符串硬编码问题
 */

/**
 * 缓存数据格式常量
 */
export const CACHE_DATA_FORMATS = Object.freeze({
  COMPRESSION_PREFIX: "COMPRESSED::",
  SERIALIZATION: {
    JSON: "json" as const,
    MSGPACK: "msgpack" as const,
  }
} as const);

/**
 * 序列化器类型定义
 * 统一序列化类型，避免重复定义
 */
export type SerializerType = typeof CACHE_DATA_FORMATS.SERIALIZATION[keyof typeof CACHE_DATA_FORMATS.SERIALIZATION];

/**
 * 序列化类型值数组
 * 用于验证装饰器和枚举定义
 */
export const SERIALIZER_TYPE_VALUES = Object.values(CACHE_DATA_FORMATS.SERIALIZATION);