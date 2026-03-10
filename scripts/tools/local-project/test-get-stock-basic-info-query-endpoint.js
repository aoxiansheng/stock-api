#!/usr/bin/env node
/* eslint-disable no-console */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

/**
 * 本地项目 get-stock-basic-info 弱时效接口专项测试脚本
 *
 * 目标：
 * 1. 调用本地 POST /api/v1/query/execute
 * 2. 使用 queryType=by_symbols + queryTypeFilter=get-stock-basic-info
 * 3. 校验返回结构、关键字段、标的覆盖情况
 * 4. 输出明确标注弱时效模式（timelinessMode=weak）
 *
 * 常用环境变量：
 * - BASE_URL: 服务地址（默认 http://127.0.0.1:3001）
 * - API_PREFIX: API 前缀（默认 /api/v1）
 * - APP_KEY / ACCESS_TOKEN: API Key 认证对（优先）
 * - USERNAME / PASSWORD: 未提供 APP_KEY/ACCESS_TOKEN 时，自动注册/登录并创建临时 API Key
 * - SYMBOLS: 逗号分隔标的列表（默认 AAPL.US,00700.HK,000001.SZ）
 * - TEST_MARKET: 可选，传入 market（例如 US）
 * - TEST_PROVIDER: provider 参数（默认 infoway）
 * - STRICT_SYMBOL_MATCH: 是否要求返回覆盖全部请求 symbols（默认 true）
 * - QUERY_LIMIT: 查询 limit（默认 50）
 * - HTTP_TIMEOUT_MS: 单请求超时（默认 15000）
 * - SAMPLE_LIMIT: 控制台展示样本数量（默认 10）
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

function toUpperSymbols(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function isTrue(input, fallback = false) {
  if (input === undefined || input === null || input === "") {
    return fallback;
  }
  return String(input).trim().toLowerCase() === "true";
}

function buildUrl(path) {
  return `${BASE_URL}${API_PREFIX}${path}`;
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
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isUserExistsResp(resp) {
  const msg = resp?.data?.message || resp?.data?.error || "";
  return resp.status === 409 || String(msg).includes("已存在");
}

async function resolveApiKeyPair() {
  const envPair = {
    appKey: process.env.APP_KEY || DOTENV.APP_KEY,
    accessToken: process.env.ACCESS_TOKEN || DOTENV.ACCESS_TOKEN,
  };
  if (envPair.appKey && envPair.accessToken) {
    return { ...envPair, source: "env" };
  }

  const username = process.env.USERNAME || DOTENV.USERNAME || "admin";
  const password = process.env.PASSWORD || DOTENV.PASSWORD || "admin123!@#";
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
  const loginPayload = loginResp?.data?.data || loginResp?.data || {};
  if (!loginResp.ok || !loginPayload?.accessToken) {
    throw new Error(
      `登录失败(${loginResp.status}): ${JSON.stringify(loginResp.data)}`,
    );
  }

  const keyResp = await requestJson(buildUrl("/auth/api-keys"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginPayload.accessToken}`,
    },
    body: {
      name: `query-basic-info-test-${Date.now()}`,
      profile: "READ",
    },
  });
  const keyPayload = keyResp?.data?.data || keyResp?.data || {};
  if (!keyResp.ok || !keyPayload?.appKey || !keyPayload?.accessToken) {
    throw new Error(
      `创建 API Key 失败(${keyResp.status}): ${JSON.stringify(keyResp.data)}`,
    );
  }

  return {
    appKey: keyPayload.appKey,
    accessToken: keyPayload.accessToken,
    source: "created",
  };
}

function assert(condition, message, extra) {
  if (condition) {
    return;
  }
  if (extra !== undefined) {
    throw new Error(`${message} | extra=${JSON.stringify(extra)}`);
  }
  throw new Error(message);
}

function extractQueryResultEnvelope(respData) {
  if (!respData || typeof respData !== "object") {
    return {};
  }

  // 直接返回 QueryResponseDto：{ data: { items, pagination }, metadata }
  if (
    respData.metadata &&
    typeof respData.metadata === "object" &&
    respData.data &&
    typeof respData.data === "object"
  ) {
    return respData;
  }

  // ResponseInterceptor 包裹：{ success, statusCode, message, data: QueryResponseDto, timestamp }
  if (
    respData.data &&
    typeof respData.data === "object" &&
    respData.data.metadata &&
    typeof respData.data.metadata === "object"
  ) {
    return respData.data;
  }

  // 兼容直接返回 QueryResponseDto
  return respData;
}

function extractQueryRows(queryEnvelope) {
  if (!queryEnvelope || typeof queryEnvelope !== "object") {
    return [];
  }

  const dataNode = queryEnvelope.data;
  if (Array.isArray(dataNode)) {
    return dataNode;
  }
  if (dataNode && typeof dataNode === "object") {
    if (Array.isArray(dataNode.items)) {
      return dataNode.items;
    }
    if (Array.isArray(dataNode.data)) {
      return dataNode.data;
    }
  }
  return [];
}

function validateBasicInfoRows(rows) {
  const issues = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`items[${index}] 不是对象`);
      return;
    }

    if (typeof row.symbol !== "string" || !row.symbol.trim()) {
      issues.push(`items[${index}].symbol 缺失`);
    }

    const numericFields = [
      "lot_size",
      "total_shares",
      "circulating_shares",
      "hk_shares",
    ];
    for (const field of numericFields) {
      if (row[field] !== undefined && row[field] !== null) {
        const value = Number(row[field]);
        if (!Number.isFinite(value)) {
          issues.push(`items[${index}].${field} 不是数字`);
        }
      }
    }

    if (
      row.stock_derivatives !== undefined &&
      row.stock_derivatives !== null &&
      typeof row.stock_derivatives !== "string" &&
      !Array.isArray(row.stock_derivatives)
    ) {
      issues.push(`items[${index}].stock_derivatives 应为 string 或 array`);
    }
  });
  return issues;
}

const DOTENV = parseDotEnv(resolve(process.cwd(), ".env"));
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const API_PREFIX = process.env.API_PREFIX || "/api/v1";
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);
const SYMBOLS = toUpperSymbols(process.env.SYMBOLS || "AAPL.US,00700.HK,000001.SZ");
const TEST_MARKET = String(process.env.TEST_MARKET || "").trim().toUpperCase();
const TEST_PROVIDER = String(process.env.TEST_PROVIDER || "infoway")
  .trim()
  .toLowerCase();
const STRICT_SYMBOL_MATCH = isTrue(process.env.STRICT_SYMBOL_MATCH, true);
const QUERY_LIMIT = Math.max(1, Number(process.env.QUERY_LIMIT || 50));
const SAMPLE_LIMIT = Math.max(1, Number(process.env.SAMPLE_LIMIT || 10));

async function main() {
  assert(
    Number.isFinite(HTTP_TIMEOUT_MS) && HTTP_TIMEOUT_MS > 0,
    "HTTP_TIMEOUT_MS 必须是正数",
  );
  assert(SYMBOLS.length > 0, "SYMBOLS 不能为空");

  const auth = await resolveApiKeyPair();
  console.log("[config]", {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    symbols: SYMBOLS,
    testMarket: TEST_MARKET || null,
    testProvider: TEST_PROVIDER,
    strictSymbolMatch: STRICT_SYMBOL_MATCH,
    queryLimit: QUERY_LIMIT,
    timeoutMs: HTTP_TIMEOUT_MS,
    authSource: auth.source,
    timelinessMode: "weak",
    endpoint: "POST /api/v1/query/execute",
  });

  const body = {
    queryType: "by_symbols",
    symbols: SYMBOLS,
    provider: TEST_PROVIDER,
    queryTypeFilter: "get-stock-basic-info",
    limit: QUERY_LIMIT,
    options: {
      useCache: true,
      includeMetadata: true,
    },
  };
  if (TEST_MARKET) {
    body.market = TEST_MARKET;
  }

  const resp = await requestJson(buildUrl("/query/execute"), {
    method: "POST",
    headers: {
      "X-App-Key": auth.appKey,
      "X-Access-Token": auth.accessToken,
    },
    body,
  });

  if (!resp.ok) {
    throw new Error(
      `query 调用失败(${resp.status}): ${JSON.stringify(resp.data)}`,
    );
  }

  const queryEnvelope = extractQueryResultEnvelope(resp.data);
  const rows = extractQueryRows(queryEnvelope);
  const metadata =
    queryEnvelope?.metadata && typeof queryEnvelope.metadata === "object"
      ? queryEnvelope.metadata
      : {};

  assert(rows.length > 0, "弱时效接口返回 items 为空", {
    queryEnvelope,
  });

  const issues = validateBasicInfoRows(rows);
  assert(issues.length === 0, "字段结构校验失败", issues.slice(0, 20));

  const returnedSet = new Set(
    rows
      .map((row) => String(row?.symbol || "").trim().toUpperCase())
      .filter(Boolean),
  );
  const missingSymbols = SYMBOLS.filter((item) => !returnedSet.has(item));
  if (missingSymbols.length > 0) {
    if (STRICT_SYMBOL_MATCH) {
      throw new Error(`弱时效返回缺少请求标的: ${missingSymbols.join(",")}`);
    }
    console.warn("[WARN] 弱时效返回缺少部分请求标的", missingSymbols);
  }

  const sample = rows.slice(0, SAMPLE_LIMIT).map((row) => ({
    symbol: row.symbol,
    market: row.market,
    name_cn: row.name_cn,
    name_en: row.name_en,
    exchange: row.exchange,
    currency: row.currency,
    lot_size: row.lot_size,
    board: row.board,
  }));

  console.log("[PASS] get-stock-basic-info 弱时效接口验证通过");
  console.log(
    JSON.stringify(
      {
        timelinessMode: "weak",
        endpoint: "POST /api/v1/query/execute",
        queryType: "by_symbols",
        queryTypeFilter: "get-stock-basic-info",
        requestedProvider: TEST_PROVIDER,
        requestedCount: SYMBOLS.length,
        returnedCount: rows.length,
        missingSymbols,
        metadata,
        sample,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[FAIL]", error?.message || String(error));
  process.exit(1);
});
