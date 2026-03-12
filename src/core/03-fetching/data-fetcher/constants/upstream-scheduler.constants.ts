export const UPSTREAM_SCHEDULER_DEFAULT_ALLOWLIST = Object.freeze([
  "infoway:get-market-status",
  "infoway:get-stock-quote",
  "infoway:get-stock-basic-info",
]);

export const UPSTREAM_SCHEDULER_CAPABILITIES = Object.freeze({
  GET_MARKET_STATUS: "get-market-status",
  GET_STOCK_QUOTE: "get-stock-quote",
  GET_STOCK_BASIC_INFO: "get-stock-basic-info",
} as const);

export const UPSTREAM_SCHEDULER_DEFAULTS = Object.freeze({
  ENABLED: true,
  DEFAULT_RPS: 2,
  MAX_QUEUE_SIZE: 1000,
  COOLDOWN_MS_ON_429: 5000,
  QUOTE_MERGE_WINDOW_MS: 50,
  BASIC_INFO_MERGE_WINDOW_MS: 80,
} as const);
