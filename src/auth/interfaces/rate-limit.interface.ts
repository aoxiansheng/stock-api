/**
 * 频率限制结果接口
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

import type { RateLimitStrategy } from "../../common/constants/rate-limit.constants";

/**
 * 频率限制配置接口
 */
export interface AuthRateLimitConfig {
  strategy?: RateLimitStrategy;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

/**
 * API Key 使用统计接口
 */
export interface ApiKeyUsageStats {
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * 详细使用统计接口
 */
export interface DetailedUsageStats {
  totalRequests: number;
  currentPeriodRequests: number;
  lastRequestTime?: Date;
  averageRequestsPerHour: number;
}
