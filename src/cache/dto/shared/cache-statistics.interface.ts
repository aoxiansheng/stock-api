export interface CacheStatistics {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  hitRate: number;
  averageResponseTime: number;
}