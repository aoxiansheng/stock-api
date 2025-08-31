/**
 * 数据源类型枚举
 *
 * 用于标识查询数据的来源，以消除代码中的魔法字符串。
 */
export enum DataSourceType {
  /**
   * 数据来源于缓存（内存或Redis）
   */
  DATASOURCETYPECACHE = "datasourcetype_cache",

  /**
   * 数据来源于持久化存储（如数据库）
   */
  PERSISTENT = "persistent",

  /**
   * 数据来源于实时外部API调用
   */
  REALTIME = "realtime",

  /**
   * 混合数据源（缓存+实时）
   */
  HYBRID = "hybrid",
}
