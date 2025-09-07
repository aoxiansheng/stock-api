/**
 * 公共趋势数据接口
 * 用于统一监控系统中的趋势数据结构，避免重复定义
 */
export interface TrendDataInterface {
  /** 响应时间趋势 (毫秒) */
  responseTimeTrend: number[];
  
  /** 错误率趋势 (0-1) */
  errorRateTrend: number[];
  
  /** 吞吐量趋势 (请求/分钟) */
  throughputTrend: number[];
}