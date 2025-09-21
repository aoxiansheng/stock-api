/**
 * 缓存事件数据接口定义
 */
export interface CacheHitEvent {
  layer: 'l1' | 'l2' | 'l3';
  provider: string;
  symbol?: string;
  timestamp: number;
}

export interface CacheMissEvent {
  layer: 'l1' | 'l2' | 'l3';
  provider: string;
  symbol?: string;
  timestamp: number;
}

export interface CacheOperationStartEvent {
  provider: string;
  symbolCount: number;
  direction: string;
  timestamp: number;
  isBatch: boolean;
}

export interface CacheOperationCompleteEvent {
  provider: string;
  symbolCount: number;
  cacheHits: number;
  processingTime: number;
  direction: string;
  success: boolean;
}

export interface CacheOperationErrorEvent {
  provider: string;
  error: string;
  processingTime: number;
  operation: string;
  symbolCount?: number;
}

export interface CacheDisabledEvent {
  reason: string;
  provider: string;
  timestamp: number;
}

/**
 * 缓存事件类型常量
 */
export const CACHE_EVENTS = {
  HIT: 'cache:hit',
  MISS: 'cache:miss',
  OPERATION_START: 'cache:operation:start',
  OPERATION_COMPLETE: 'cache:operation:complete',
  OPERATION_ERROR: 'cache:operation:error',
  DISABLED: 'cache:disabled',
} as const;

export type CacheEventType = typeof CACHE_EVENTS[keyof typeof CACHE_EVENTS];