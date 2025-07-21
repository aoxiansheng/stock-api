/**
 * 认证类型枚举
 * 用于性能监控中区分不同的认证方式
 */
export enum AuthType {
  JWT = 'jwt',
  API_KEY = 'api_key',
}

/**
 * 认证状态枚举
 * 用于记录认证的结果状态
 */
export enum AuthStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * 认证操作状态枚举
 * 用于记录各种操作的状态
 */
export enum OperationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  ALLOWED = 'allowed',
  BLOCKED = 'blocked',
  HIT = 'hit',
  MISS = 'miss',
}