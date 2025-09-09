/**
 * 缓存内部操作常量
 * 🎯 符合开发规范指南 - 分离内部实现细节
 * 包含序列化、压缩、指标更新等内部操作
 */

export const CACHE_INTERNAL_OPERATIONS = Object.freeze({
  SERIALIZE: "serialize",             // 数据序列化
} as const);