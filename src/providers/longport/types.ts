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
  timestamp: number;
  volume: number;
  turnover: number | string;
  high: number | string;
  low: number | string;
  prev_close: number | string;
}

export interface LongportQuoteResponse {
  secu_quote: LongportQuoteData[];
}

export interface LongportBasicInfo {
  symbol: string;
  name_cn: string;
  name_en: string;
  name_hk: string;
  listing_date: string;
  shares_outstanding: number;
  market_cap: number;
  sector: string;
  industry: string;
}

export interface LongportConfig {
  app_key: string;
  app_secret: string;
  access_token: string;
  endpoint?: string;
}
