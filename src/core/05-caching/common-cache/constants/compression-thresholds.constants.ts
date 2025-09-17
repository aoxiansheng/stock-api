/**
 * 分级压缩阈值配置常量
 * 根据数据特性和业务场景定义不同的压缩策略
 *
 * 设计原则：
 * - 实时数据：网络延迟优先，较低阈值，更积极压缩
 * - 批量数据：CPU开销平衡，适中阈值，避免过度压缩
 * - 静态数据：存储优化优先，更高阈值，重点节省空间
 */

export const COMPRESSION_THRESHOLDS = {
  /**
   * 流数据压缩阈值
   * 用于实时WebSocket流、高频更新的缓存数据
   * 特点：小包高频，网络延迟敏感，需要积极压缩
   */
  STREAM_DATA: 1024, // 1KB - 实时流数据

  /**
   * 批量数据压缩阈值
   * 用于API批量响应、查询结果集等
   * 特点：数据量适中，CPU/网络平衡考虑
   */
  BATCH_DATA: 10240, // 10KB - 批量数据

  /**
   * 静态数据压缩阈值
   * 用于配置数据、规则数据等变化较少的内容
   * 特点：更新频率低，存储优化优先
   */
  STATIC_DATA: 16384, // 16KB - 静态数据

  /**
   * 大文件压缩阈值
   * 用于报告、大型数据集等
   * 特点：文件较大，压缩收益明显
   */
  LARGE_FILES: 51200, // 50KB - 大文件
} as const;

/**
 * 压缩策略配置
 * 根据数据类型映射到相应的压缩参数
 */
export const COMPRESSION_STRATEGIES = {
  REALTIME: {
    threshold: COMPRESSION_THRESHOLDS.STREAM_DATA,
    algorithm: "gzip",
    level: 4, // 平衡压缩率和速度
    description: "实时数据压缩策略 - 优先延迟",
  },

  BATCH: {
    threshold: COMPRESSION_THRESHOLDS.BATCH_DATA,
    algorithm: "gzip",
    level: 6, // 标准压缩级别
    description: "批量数据压缩策略 - 平衡性能",
  },

  STORAGE: {
    threshold: COMPRESSION_THRESHOLDS.STATIC_DATA,
    algorithm: "gzip",
    level: 9, // 最高压缩率
    description: "存储优化压缩策略 - 优先空间",
  },

  ARCHIVE: {
    threshold: COMPRESSION_THRESHOLDS.LARGE_FILES,
    algorithm: "brotli", // 更好的压缩率
    level: 6,
    description: "归档数据压缩策略 - 最优压缩",
  },
} as const;

/**
 * 获取指定数据类型的压缩阈值
 */
export function getCompressionThreshold(
  dataType: "stream" | "batch" | "static" | "large",
): number {
  const thresholdMap = {
    stream: COMPRESSION_THRESHOLDS.STREAM_DATA,
    batch: COMPRESSION_THRESHOLDS.BATCH_DATA,
    static: COMPRESSION_THRESHOLDS.STATIC_DATA,
    large: COMPRESSION_THRESHOLDS.LARGE_FILES,
  };

  return thresholdMap[dataType];
}

/**
 * 类型定义
 */
export type CompressionDataType = "stream" | "batch" | "static" | "large";
export type CompressionStrategyName = keyof typeof COMPRESSION_STRATEGIES;
