#!/usr/bin/env node
/* eslint-disable no-console */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
/**
 * Infoway REST 能力连通性与断言脚本
 *
 * 目标：
 * 1. 调用 receiver/data + preferredProvider=infoway
 * 2. 验证 4 个能力：
 *    - get-stock-quote
 *    - get-stock-basic-info
 *    - get-market-status
 *    - get-trading-days
 * 3. 校验关键字段存在并输出摘要
 *
 * 常用环境变量：
 * - BASE_URL: 服务地址（默认 http://127.0.0.1:3001）
 * - API_PREFIX: API 前缀（默认 /api/v1）
 * - APP_KEY / ACCESS_TOKEN: API Key 认证对（优先）
 * - USERNAME / PASSWORD: 未传 APP_KEY/ACCESS_TOKEN 时自动登录并创建临时 API Key
 * - SYMBOLS: 逗号分隔符号（默认 00700.HK,AAPL.US,600519.SH）
 * - TEST_MARKET: 交易日查询市场（默认 US）
 * - BEGIN_DAY / END_DAY: 交易日起止日（YYYYMMDD，可选）
 * - HTTP_TIMEOUT_MS: 单请求超时（默认 15000）
 * - REQUEST_INTERVAL_MS: 各能力调用间隔（默认 5000）
 * - PRINT_ALL_ROWS: 是否打印每个能力的全部记录（默认 false）
 * - COMPARE_WITH_UPSTREAM: 是否启用上游字段对照（默认 true）
 * - UPSTREAM_API_KEY: 上游 Infoway API Key（默认读取 INFOWAY_API_KEY / .env）
 * - UPSTREAM_RETRY_MAX_ATTEMPTS: 上游对照请求最大重试次数（默认 3）
 * - UPSTREAM_RETRY_BASE_DELAY_MS: 上游对照重试基础退避毫秒（默认 1500）
 */

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, "utf8");
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const index = line.indexOf("=");
    if (index <= 0) {
      continue;
    }
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

const DOTENV = parseDotEnv(resolve(process.cwd(), ".env"));

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const API_PREFIX = process.env.API_PREFIX || "/api/v1";
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);
const REQUEST_INTERVAL_MS = Number(process.env.REQUEST_INTERVAL_MS || 5000);
const PRINT_ALL_ROWS =
  String(process.env.PRINT_ALL_ROWS || "false").toLowerCase() === "true";
const COMPARE_WITH_UPSTREAM =
  String(process.env.COMPARE_WITH_UPSTREAM || "true").toLowerCase() === "true";
const PROVIDER = "infoway";
const UPSTREAM_BASE_URL = String(
  process.env.UPSTREAM_BASE_URL ||
    process.env.INFOWAY_BASE_URL ||
    DOTENV.INFOWAY_BASE_URL ||
    "https://data.infoway.io",
).replace(/\/$/, "");
const UPSTREAM_API_KEY =
  process.env.UPSTREAM_API_KEY ||
  process.env.INFOWAY_API_KEY ||
  DOTENV.INFOWAY_API_KEY ||
  "";
const UPSTREAM_RETRY_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.UPSTREAM_RETRY_MAX_ATTEMPTS || 3),
);
const UPSTREAM_RETRY_BASE_DELAY_MS = Math.max(
  0,
  Number(process.env.UPSTREAM_RETRY_BASE_DELAY_MS || 1500),
);
// 调试脚本默认直连 provider，避免受强时效缓存策略影响造成 data=null 的假失败
const USE_SMART_CACHE = String(process.env.USE_SMART_CACHE || "false").toLowerCase() === "true";
const SYMBOLS = (process.env.SYMBOLS || "00700.HK,AAPL.US,600519.SH")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const TEST_MARKET = String(process.env.TEST_MARKET || "US")
  .trim()
  .toUpperCase();

function buildUrl(path) {
  return `${BASE_URL}${API_PREFIX}${path}`;
}

function toYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function resolveDayRange() {
  const begin = String(process.env.BEGIN_DAY || "").trim();
  const end = String(process.env.END_DAY || "").trim();
  if (/^\d{8}$/.test(begin) && /^\d{8}$/.test(end)) {
    return { beginDay: begin, endDay: end };
  }
  const now = new Date();
  const endDay = toYmd(now);
  const beginDay = toYmd(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  return { beginDay, endDay };
}

function resolveStockType(symbol, marketHint) {
  const upperSymbol = String(symbol || "").trim().toUpperCase();
  const hint = String(marketHint || "").trim().toUpperCase();
  // 优先以 symbol 后缀推断，避免 marketHint 与 symbol 混用时冲突。
  if (upperSymbol.endsWith(".US")) return "STOCK_US";
  if (upperSymbol.endsWith(".HK")) return "STOCK_HK";
  if (upperSymbol.endsWith(".SH") || upperSymbol.endsWith(".SZ")) {
    return "STOCK_CN";
  }
  if (hint === "US") return "STOCK_US";
  if (hint === "HK") return "STOCK_HK";
  if (
    hint === "CN" ||
    hint === "SH" ||
    hint === "SZ"
  ) {
    return "STOCK_CN";
  }
  return "";
}

function detectSingleSymbolMarket(symbols) {
  const markets = new Set();
  for (const symbol of symbols) {
    const upper = String(symbol || "").trim().toUpperCase();
    if (upper.endsWith(".US")) markets.add("US");
    else if (upper.endsWith(".HK")) markets.add("HK");
    else if (upper.endsWith(".SH") || upper.endsWith(".SZ")) markets.add("CN");
  }
  return markets.size === 1 ? Array.from(markets)[0] : undefined;
}

async function requestJson(url, { method = "GET", body, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      payload:
        data && typeof data === "object" && "data" in data ? data.data : data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableUpstreamResponse(resp) {
  if (!resp || typeof resp !== "object") {
    return true;
  }
  if (resp.status === 429) {
    return true;
  }
  if (resp.status >= 500) {
    return true;
  }
  return false;
}

function isRetryableUpstreamError(error) {
  const message = String(error?.message || error).toLowerCase();
  return (
    message.includes("aborted") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("429") ||
    message.includes("too many requests")
  );
}

function formatUpstreamError(path, resp) {
  return `上游请求失败 ${path} (${resp?.status}) ret=${resp?.data?.ret} msg=${resp?.data?.msg || "unknown"}`;
}

async function requestUpstream(path, { method = "GET", body, params } = {}) {
  if (!UPSTREAM_API_KEY) {
    throw new Error(
      "缺少上游 API Key：请设置 UPSTREAM_API_KEY 或 INFOWAY_API_KEY",
    );
  }

  const url = new URL(`${UPSTREAM_BASE_URL}${path}`);
  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let lastError;
  for (let attempt = 1; attempt <= UPSTREAM_RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const resp = await requestJson(url.toString(), {
        method,
        headers: { apiKey: UPSTREAM_API_KEY },
        body,
      });

      const ret = Number(resp?.data?.ret);
      if (resp.ok && ret === 200) {
        return resp.data;
      }

      const error = new Error(formatUpstreamError(path, resp));
      lastError = error;

      const canRetry =
        attempt < UPSTREAM_RETRY_MAX_ATTEMPTS &&
        isRetryableUpstreamResponse(resp);
      if (!canRetry) {
        throw error;
      }

      const delay = UPSTREAM_RETRY_BASE_DELAY_MS * attempt;
      await sleep(delay);
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < UPSTREAM_RETRY_MAX_ATTEMPTS &&
        isRetryableUpstreamError(error);
      if (!canRetry) {
        throw error;
      }
      const delay = UPSTREAM_RETRY_BASE_DELAY_MS * attempt;
      await sleep(delay);
    }
  }

  throw lastError || new Error(`上游请求失败 ${path}`);
}

async function fetchUpstreamQuote(symbols, preferredSymbol) {
  const data = await requestUpstream(`/stock/batch_trade/${symbols.join(",")}`);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const normalized = rows.map((entry) => {
    return {
      symbol: String(entry?.s || "").trim().toUpperCase(),
      p: entry?.p,
      v: entry?.v,
      vw: entry?.vw,
      t: entry?.t,
      td: entry?.td,
    };
  });

  const target = normalized.find((item) => item.symbol === preferredSymbol);
  return { rows: normalized, first: target || normalized[0] || {} };
}

async function fetchUpstreamBasicInfo(symbol, marketHint) {
  const type = resolveStockType(symbol, marketHint);
  if (!type) {
    throw new Error(`无法为符号推断 basic-info type: ${symbol}`);
  }

  const data = await requestUpstream("/common/basic/symbols/info", {
    params: { type, symbols: symbol },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const first =
    rows.find((item) => String(item?.symbol || "").toUpperCase() === symbol) ||
    rows[0] ||
    {};
  return { rows, first };
}

async function fetchUpstreamMarketStatus(preferredMarket) {
  const data = await requestUpstream("/common/basic/markets");
  const rows = Array.isArray(data?.data) ? data.data : [];
  const first =
    rows.find(
      (item) =>
        String(item?.market || "").trim().toUpperCase() ===
        String(preferredMarket || "").trim().toUpperCase(),
    ) ||
    rows[0] ||
    {};
  return { rows, first };
}

async function fetchUpstreamTradingDays(market, beginDay, endDay) {
  const data = await requestUpstream("/common/basic/markets/trading_days", {
    params: { market, beginDay, endDay },
  });
  const first = data?.data && typeof data.data === "object" ? data.data : {};
  return { rows: [first], first };
}

function isUserExistsResp(resp) {
  const msg = resp?.data?.message || resp?.data?.error || "";
  return resp.status === 409 || String(msg).includes("已存在");
}

async function resolveApiKeyPair() {
  const envPair = {
    appKey: process.env.APP_KEY,
    accessToken: process.env.ACCESS_TOKEN,
  };
  if (envPair.appKey && envPair.accessToken) {
    return { ...envPair, source: "env" };
  }

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  const email = process.env.EMAIL || `${username || "infoway"}@example.com`;
  if (!username || !password) {
    throw new Error(
      "缺少认证参数：请提供 APP_KEY+ACCESS_TOKEN，或 USERNAME+PASSWORD",
    );
  }

  const registerResp = await requestJson(buildUrl("/auth/register"), {
    method: "POST",
    body: { username, password, email },
  });
  if (!registerResp.ok && !isUserExistsResp(registerResp)) {
    throw new Error(
      `注册失败(${registerResp.status}): ${JSON.stringify(registerResp.data)}`,
    );
  }

  const loginResp = await requestJson(buildUrl("/auth/login"), {
    method: "POST",
    body: { username, password },
  });
  if (!loginResp.ok || !loginResp.payload?.accessToken) {
    throw new Error(
      `登录失败(${loginResp.status}): ${JSON.stringify(loginResp.data)}`,
    );
  }

  const keyResp = await requestJson(buildUrl("/auth/api-keys"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginResp.payload.accessToken}`,
    },
    body: {
      name: `infoway-rest-test-${Date.now()}`,
      profile: "READ",
    },
  });

  if (!keyResp.ok || !keyResp.payload?.appKey || !keyResp.payload?.accessToken) {
    throw new Error(
      `创建 API Key 失败(${keyResp.status}): ${JSON.stringify(keyResp.data)}`,
    );
  }

  return {
    appKey: keyResp.payload.appKey,
    accessToken: keyResp.payload.accessToken,
    source: "created",
  };
}

function getReceiverBusinessPayload(resp) {
  const body = resp?.data;
  if (!body || typeof body !== "object") {
    return {};
  }

  // 形态A：ResponseInterceptor 包裹
  // { success, statusCode, message, data: { data: [...], metadata: ... }, timestamp }
  if (body.data && typeof body.data === "object" && "metadata" in body.data) {
    return body.data;
  }

  // 形态B：直接返回业务DTO
  // { data: [...], metadata: ... }
  if ("metadata" in body) {
    return body;
  }

  // 兜底：兼容旧结构
  if (body.data && typeof body.data === "object") {
    return body.data;
  }

  return resp?.payload || {};
}

function toArrayRows(business, fieldName) {
  if (Array.isArray(business)) {
    return business;
  }
  if (Array.isArray(business?.data)) {
    return business.data;
  }
  if (Array.isArray(business?.payload)) {
    return business.payload;
  }
  const preview = JSON.stringify(business).slice(0, 500);
  throw new Error(`${fieldName} 不是数组，实际结构预览: ${preview}`);
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortedKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.keys(value).sort();
}

function buildCompareSummary(mappedRecord, upstreamRecord) {
  const projectFields = sortedKeys(mappedRecord);
  const upstreamSdkFields = sortedKeys(upstreamRecord);
  return {
    projectFields,
    upstreamSdkFields,
    projectOnly: projectFields.filter(
      (field) => !upstreamSdkFields.includes(field),
    ),
    upstreamSdkOnly: upstreamSdkFields.filter(
      (field) => !projectFields.includes(field),
    ),
    // 兼容旧输出字段（避免影响既有解析）
    mappedFields: projectFields,
    upstreamFields: upstreamSdkFields,
    mappedOnly: projectFields.filter((field) => !upstreamSdkFields.includes(field)),
    upstreamOnly: upstreamSdkFields.filter((field) => !projectFields.includes(field)),
  };
}

function parseNumeric(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim().replace(/,/g, "").replace(/%/g, "");
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function nearlyEqual(left, right, tolerance = 1e-6) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function buildQuoteSemanticCheck(mappedRecord, upstreamRecord) {
  const checks = [];

  const mappedLastPrice = parseNumeric(mappedRecord?.lastPrice);
  const upstreamLastPrice = parseNumeric(upstreamRecord?.p);
  checks.push({
    field: "lastPrice",
    mapped: mappedLastPrice,
    upstream: upstreamLastPrice,
    pass:
      mappedLastPrice === null || upstreamLastPrice === null
        ? null
        : nearlyEqual(mappedLastPrice, upstreamLastPrice, 1e-6),
    note: "mapped.lastPrice 应等于 upstream.p",
  });

  const mappedVolume = parseNumeric(mappedRecord?.volume);
  const upstreamVolume = parseNumeric(upstreamRecord?.v);
  checks.push({
    field: "volume",
    mapped: mappedVolume,
    upstream: upstreamVolume,
    pass:
      mappedVolume === null || upstreamVolume === null
        ? null
        : nearlyEqual(mappedVolume, upstreamVolume, 1e-6),
    note: "mapped.volume 应等于 upstream.v",
  });

  const mappedTurnover = parseNumeric(mappedRecord?.turnover);
  const upstreamTurnover = parseNumeric(upstreamRecord?.vw);
  checks.push({
    field: "turnover",
    mapped: mappedTurnover,
    upstream: upstreamTurnover,
    pass:
      mappedTurnover === null || upstreamTurnover === null
        ? null
        : nearlyEqual(mappedTurnover, upstreamTurnover, 1e-6),
    note: "mapped.turnover 应等于 upstream.vw",
  });

  const failed = checks.filter((item) => item.pass === false);
  return {
    pass: failed.length === 0,
    failedChecks: failed,
    checks,
  };
}

async function safeUpstream(fetcher) {
  if (!COMPARE_WITH_UPSTREAM) {
    return { enabled: false, reason: "COMPARE_WITH_UPSTREAM=false" };
  }
  if (!UPSTREAM_API_KEY) {
    return { enabled: false, reason: "UPSTREAM_API_KEY 未配置" };
  }
  try {
    const result = await fetcher();
    return {
      enabled: true,
      rows: Array.isArray(result?.rows) ? result.rows : [],
      first: result?.first && typeof result.first === "object" ? result.first : {},
    };
  } catch (error) {
    return {
      enabled: true,
      error: error?.message || String(error),
      rows: [],
      first: {},
    };
  }
}

function buildDebugPayload(rows, first, sample, upstream) {
  const payload = {
    comparisonBasis:
      "projectFields 来自项目 receiver 映射结果；upstreamSdkFields 来自测试脚本直连上游的原始字段",
    mappedFields: sortedKeys(first),
    firstRecord: first,
    sample,
  };

  if (upstream) {
    payload.upstream = upstream.enabled
      ? upstream.error
        ? { error: upstream.error }
        : {
            firstRecord: upstream.first,
            ...buildCompareSummary(first, upstream.first),
          }
      : { disabled: true, reason: upstream.reason };
  }

  if (PRINT_ALL_ROWS) {
    payload.mappedRows = rows;
    if (upstream?.enabled && !upstream?.error) {
      payload.upstreamRows = upstream.rows;
    }
  }
  return payload;
}

async function callReceiver(auth, receiverType, symbols, options = {}) {
  const resp = await requestJson(buildUrl("/receiver/data"), {
    method: "POST",
    headers: {
      "X-App-Key": auth.appKey,
      "X-Access-Token": auth.accessToken,
    },
    body: {
      symbols,
      receiverType,
      options: {
        preferredProvider: PROVIDER,
        useSmartCache: USE_SMART_CACHE,
        ...options,
      },
    },
  });

  if (!resp.ok) {
    throw new Error(
      `receiver 调用失败 ${receiverType} (${resp.status}): ${JSON.stringify(resp.data)}`,
    );
  }

  return getReceiverBusinessPayload(resp);
}

async function testQuote(auth) {
  const business = await callReceiver(
    auth,
    "get-stock-quote",
    SYMBOLS,
    { market: TEST_MARKET },
  );
  const rows = toArrayRows(business, "quote.data");
  ensure(rows.length > 0, "quote.data 为空");
  const first = rows[0] || {};
  const numericLastPrice = parseNumeric(first.lastPrice);
  ensure(typeof first.symbol === "string" && first.symbol, "quote.symbol 缺失");
  ensure(
    numericLastPrice !== null,
    "quote.lastPrice 缺失或非数值",
  );
  const upstream = await safeUpstream(() =>
    fetchUpstreamQuote(SYMBOLS, first.symbol),
  );
  const semanticCheck =
    upstream?.enabled && !upstream?.error
      ? buildQuoteSemanticCheck(first, upstream.first)
      : undefined;
  console.log("[PASS] get-stock-quote", {
    count: rows.length,
    ...buildDebugPayload(
      rows,
      first,
      {
        symbol: first.symbol,
        lastPrice: numericLastPrice,
        change: first.change,
        changePercent: first.changePercent,
        tradeStatus: first.tradeStatus,
      },
      upstream,
    ),
    ...(semanticCheck ? { semanticCheck } : {}),
  });
}

async function testBasicInfo(auth) {
  const basicInfoMarket = detectSingleSymbolMarket(SYMBOLS);
  const business = await callReceiver(
    auth,
    "get-stock-basic-info",
    SYMBOLS,
    basicInfoMarket ? { market: basicInfoMarket } : {},
  );
  const rows = toArrayRows(business, "basicInfo.data");
  ensure(rows.length > 0, "basicInfo.data 为空");
  const first = rows[0] || {};
  ensure(
    typeof first.symbol === "string" && first.symbol,
    "basicInfo.symbol 缺失",
  );
  ensure(
    typeof first.exchange === "string" && first.exchange,
    "basicInfo.exchange 缺失",
  );
  const upstream = await safeUpstream(() =>
    fetchUpstreamBasicInfo(first.symbol, basicInfoMarket),
  );
  console.log("[PASS] get-stock-basic-info", {
    count: rows.length,
    ...buildDebugPayload(
      rows,
      first,
      {
        symbol: first.symbol,
        exchange: first.exchange,
        currency: first.currency,
        board: first.board,
      },
      upstream,
    ),
  });
}

async function testMarketStatus(auth) {
  const business = await callReceiver(
    auth,
    "get-market-status",
    [SYMBOLS[0] || "AAPL.US"],
    { market: TEST_MARKET },
  );
  const rows = toArrayRows(business, "marketStatus.data");
  ensure(rows.length > 0, "marketStatus.data 为空");
  const first = rows[0] || {};
  ensure(typeof first.market === "string" && first.market, "marketStatus.market 缺失");
  ensure(
    Array.isArray(first.tradeSchedules),
    "marketStatus.tradeSchedules 缺失",
  );
  const upstream = await safeUpstream(() =>
    fetchUpstreamMarketStatus(first.market),
  );
  console.log("[PASS] get-market-status", {
    count: rows.length,
    ...buildDebugPayload(
      rows,
      first,
      {
        market: first.market,
        tradeSchedules: first.tradeSchedules?.length || 0,
        remark: first.remark || "",
      },
      upstream,
    ),
  });
}

async function testTradingDays(auth) {
  const { beginDay, endDay } = resolveDayRange();
  const business = await callReceiver(
    auth,
    "get-trading-days",
    [SYMBOLS[0] || "AAPL.US"],
    { market: TEST_MARKET, beginDay, endDay },
  );
  const rows = toArrayRows(business, "tradingDays.data");
  ensure(rows.length > 0, "tradingDays.data 为空");
  const first = rows[0] || {};
  ensure(typeof first.market === "string" && first.market, "tradingDays.market 缺失");
  ensure(Array.isArray(first.tradeDays), "tradingDays.tradeDays 缺失");
  ensure(Array.isArray(first.halfTradeDays), "tradingDays.halfTradeDays 缺失");
  const upstream = await safeUpstream(() =>
    fetchUpstreamTradingDays(first.market, first.beginDay, first.endDay),
  );
  console.log("[PASS] get-trading-days", {
    count: rows.length,
    ...buildDebugPayload(
      rows,
      first,
      {
        market: first.market,
        beginDay: first.beginDay,
        endDay: first.endDay,
        tradeDays: first.tradeDays.length,
        halfTradeDays: first.halfTradeDays.length,
      },
      upstream,
    ),
  });
}

async function main() {
  const auth = await resolveApiKeyPair();
  console.log("[config]", {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    provider: PROVIDER,
    useSmartCache: USE_SMART_CACHE,
    symbols: SYMBOLS,
    testMarket: TEST_MARKET,
    timeoutMs: HTTP_TIMEOUT_MS,
    requestIntervalMs: REQUEST_INTERVAL_MS,
    printAllRows: PRINT_ALL_ROWS,
    compareWithUpstream: COMPARE_WITH_UPSTREAM,
    upstreamBaseUrl: UPSTREAM_BASE_URL,
    hasUpstreamApiKey: Boolean(UPSTREAM_API_KEY),
    upstreamRetryMaxAttempts: UPSTREAM_RETRY_MAX_ATTEMPTS,
    upstreamRetryBaseDelayMs: UPSTREAM_RETRY_BASE_DELAY_MS,
    authSource: auth.source,
  });

  if (auth.source === "created") {
    console.log("[generated-api-key]", {
      appKey: "<REDACTED>",
      accessToken: "<REDACTED>",
    });
  }

  const tests = [
    { name: "get-stock-quote", run: testQuote },
    { name: "get-stock-basic-info", run: testBasicInfo },
    { name: "get-market-status", run: testMarketStatus },
    { name: "get-trading-days", run: testTradingDays },
  ];

  for (let i = 0; i < tests.length; i += 1) {
    const item = tests[i];
    await item.run(auth);
    if (i < tests.length - 1 && REQUEST_INTERVAL_MS > 0) {
      console.log(
        `[wait] ${item.name} 完成，等待 ${REQUEST_INTERVAL_MS}ms 后继续...`,
      );
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  console.log("[PASS] infoway REST 能力测试通过");
}

main().catch((err) => {
  console.error("[FAIL]", err?.message || err);
  process.exit(1);
});
