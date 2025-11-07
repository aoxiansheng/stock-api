/**
 * Storage 错误与警告消息（精简版）
 * 仅保留统一消息常量，移除细粒度错误码/分类与监控相关定义。
 */

export const STORAGE_ERROR_MESSAGES = Object.freeze({
  STORAGE_FAILED: "存储失败",
  RETRIEVAL_FAILED: "数据检索失败",
  DATA_NOT_FOUND: "数据未找到",
  REDIS_NOT_AVAILABLE: "Redis连接不可用",
  COMPRESSION_FAILED: "数据压缩失败",
  DECOMPRESSION_FAILED: "数据解压失败",
  SERIALIZATION_FAILED: "数据序列化失败",
  DESERIALIZATION_FAILED: "数据反序列化失败",
  CACHE_UPDATE_FAILED: "缓存更新失败",
  PERSISTENT_STORAGE_FAILED: "持久化存储失败",
  DELETE_FAILED: "删除失败",
  STATS_GENERATION_FAILED: "统计信息生成失败",
  INVALID_STORAGE_TYPE: "无效的存储类型",
  INVALID_DATA_TYPE_FILTER: "无效的数据类型过滤器",
  KEY_GENERATION_FAILED: "键生成失败",
} as const);

export const STORAGE_WARNING_MESSAGES = Object.freeze({
  REDIS_CONNECTION_UNAVAILABLE: "Redis连接不可用",
  COMPRESSION_SKIPPED: "跳过数据压缩",
  CACHE_MISS: "缓存未命中",
  PERSISTENT_FALLBACK: "回退到持久化存储",
  LARGE_DATA_SIZE: "数据大小较大",
  HIGH_MEMORY_USAGE: "内存使用率较高",
  SLOW_OPERATION: "操作响应较慢",
  TTL_CALCULATION_FAILED: "TTL计算失败",
  METADATA_PARSING_FAILED: "元数据解析失败",
  CACHE_UPDATE_FAILED: "缓存更新失败",
} as const);

