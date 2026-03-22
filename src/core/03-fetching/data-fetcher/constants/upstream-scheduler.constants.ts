export const UPSTREAM_SCHEDULER_DEFAULT_ALLOWLIST = Object.freeze([
  "infoway:get-market-status",
  "infoway:get-stock-quote",
  "infoway:get-stock-basic-info",
  "infoway:get-stock-history",
  "infoway:get-crypto-quote",
  "infoway:get-crypto-history",
]);

export const UPSTREAM_SCHEDULER_CAPABILITIES = Object.freeze({
  GET_MARKET_STATUS: "get-market-status",
  GET_STOCK_QUOTE: "get-stock-quote",
  GET_STOCK_BASIC_INFO: "get-stock-basic-info",
  GET_STOCK_HISTORY: "get-stock-history",
  GET_CRYPTO_QUOTE: "get-crypto-quote",
  GET_CRYPTO_BASIC_INFO: "get-crypto-basic-info",
  GET_CRYPTO_HISTORY: "get-crypto-history",
} as const);

/**
 * 共享调度域映射：将多个 capability 收敛到同一个发车域，
 * 共享发车间隔与 429 冷却，避免跨 capability 并发打爆上游共享额度池。
 * 未命中映射的 capability 回退为默认的 provider:capability 粒度。
 */
export const UPSTREAM_SCHEDULER_DISPATCH_SCOPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  "infoway:get-crypto-quote": "infoway:crypto-rest",
  "infoway:get-crypto-history": "infoway:crypto-rest",
});

/**
 * 共享调度域最小发车间隔覆盖（毫秒）。
 * 命中映射的调度域使用覆盖值；未命中则回退全局 minIntervalMs。
 */
export const UPSTREAM_SCHEDULER_DISPATCH_SCOPE_MIN_INTERVAL_MS_MAP: Readonly<Record<string, number>> = Object.freeze({
  "infoway:crypto-rest": 1300,
});

export const UPSTREAM_SCHEDULER_DEFAULTS = Object.freeze({
  ENABLED: true,
  DEFAULT_RPS: 2,
  MAX_QUEUE_SIZE: 1000,
  COOLDOWN_MS_ON_429: 5000,
  QUOTE_MERGE_WINDOW_MS: 50,
  BASIC_INFO_MERGE_WINDOW_MS: 80,
} as const);
