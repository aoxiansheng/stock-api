/**
 * LongPort 数据源类型定义
 */

export interface LongportQuoteData {
  symbol: string;
  last_done: number | string;
  prev_close: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  volume: number;
  turnover: number | string;
  timestamp: number;
  trade_status: number;
  pre_market_quote?: LongportExtendedQuote;
  post_market_quote?: LongportExtendedQuote;
  overnight_quote?: LongportExtendedQuote;
}

export interface LongportExtendedQuote {
  last_done: number | string;
  prev_close: number | string;
  high: number | string;
  low: number | string;
  volume: number;
  turnover: number | string;
  timestamp: number;
}

export interface LongportQuoteResponse {
  secu_quote: LongportQuoteData[];
}

export interface LongportBasicInfo {
  symbol: string;
  name_cn: string;
  name_en: string;
  name_hk: string;
  listingDate: string;
  shares_outstanding: number;
  market_cap: number;
  sector: string;
  industry: string;
}

export interface LongportConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  endpoint?: string;
}
