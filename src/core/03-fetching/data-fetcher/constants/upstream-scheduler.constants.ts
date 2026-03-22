export const UPSTREAM_SCHEDULER_DEFAULT_ALLOWLIST = Object.freeze([
  "infoway:get-market-status",
  "infoway:get-stock-quote",
  "infoway:get-stock-basic-info",
  "infoway:get-stock-history",
  "infoway:get-crypto-quote",
  "infoway:get-crypto-basic-info",
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

export const UPSTREAM_SCHEDULER_DEFAULTS = Object.freeze({
  ENABLED: true,
  DEFAULT_RPS: 2,
  MAX_QUEUE_SIZE: 1000,
  COOLDOWN_MS_ON_429: 5000,
  QUOTE_MERGE_WINDOW_MS: 50,
  BASIC_INFO_MERGE_WINDOW_MS: 80,
} as const);
