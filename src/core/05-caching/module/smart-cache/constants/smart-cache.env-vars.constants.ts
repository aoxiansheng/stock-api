/**
 * Smart Cache 环境变量（最小集合）
 * 仅保留影响核心行为的 5 个键，遵循 KISS/YAGNI。
 */
export const SMART_CACHE_ENV_VARS = Object.freeze({
  TTL_STRONG_S: "SMART_CACHE_TTL_STRONG_S",
  TTL_WEAK_S: "SMART_CACHE_TTL_WEAK_S",
  TTL_OPEN_S: "SMART_CACHE_TTL_OPEN_S",
  TTL_CLOSED_S: "SMART_CACHE_TTL_CLOSED_S",
  MAX_CONCURRENCY: "SMART_CACHE_MAX_CONCURRENCY",
} as const);

export type SmartCacheEnvVarKey =
  (typeof SMART_CACHE_ENV_VARS)[keyof typeof SMART_CACHE_ENV_VARS];

export type SmartCacheEnvConfig = {
  readonly [K in keyof typeof SMART_CACHE_ENV_VARS]: string;
};

export const getEnvVar = <K extends keyof typeof SMART_CACHE_ENV_VARS>(
  key: K,
): SmartCacheEnvVarKey => SMART_CACHE_ENV_VARS[key];
