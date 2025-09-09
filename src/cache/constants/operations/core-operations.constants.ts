/**
 * 缓存核心操作常量
 * 🎯 符合开发规范指南 - 分离高频使用的核心操作
 * 包含日常缓存操作中最常用的基本功能
 */

export const CACHE_CORE_OPERATIONS = Object.freeze({
  SET: "set",           // 设置缓存值
  GET: "get",           // 获取缓存值
  GET_OR_SET: "getOrSet", // 获取或设置（缓存未命中时执行回调）
  DELETE: "del",        // 删除缓存
  
  // 批量操作
  MGET: "mget",         // 批量获取
  MSET: "mset",         // 批量设置
} as const);