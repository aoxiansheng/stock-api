#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway 上游市场交易时间测试脚本
 *
 * 接口：
 * - GET /common/basic/markets
 *
 * 常用环境变量：
 * - API_KEY / TOKEN / UPSTREAM_API_KEY / INFOWAY_API_KEY: 上游 API Key（必填）
 * - BASE_URL / UPSTREAM_BASE_URL / INFOWAY_BASE_URL: 上游地址（默认 https://data.infoway.io）
 * - MARKETS: 可选，逗号分隔市场列表（例如 CN,HK,US）
 * - HTTP_TIMEOUT_MS: 请求超时（默认 15000）
 * - STRICT_MARKET_MATCH: 是否严格要求返回覆盖所有请求市场（默认 true）
 * - OUTPUT_FILE: 可选，原始响应落盘路径（例如 /tmp/infoway-market-schedules.json）
 *
 * 输出重点：
 * - regularOpenTime: NormalTrade 第一段开盘时间
 * - earliestBeginTime: 所有交易时段中的最早开始时间
 * - schedules: 完整时段列表
 *
 * 运行示例：
 * API_KEY="xxxx-infoway" MARKETS="CN,HK,US" \
 * node "scripts/tools/upstream-sdk/test-infoway-market-schedules.js"
 */

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

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

function maskKey(key) {
  if (!key || key.length <= 10) return "***";
  return `${key.slice(0, 6)}***${key.slice(-4)}`;
}

function parseMarkets(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function isBooleanTrue(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).trim().toLowerCase() === "true";
}

async function requestJson(url, { timeoutMs = 15000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      rawText: text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function fail(message, extra) {
  if (extra !== undefined) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  process.exit(1);
}

function isTimeString(value) {
  return typeof value === "string" && /^\d{2}:\d{2}:\d{2}$/.test(value);
}

function compareTimeAsc(left, right) {
  return String(left).localeCompare(String(right));
}

function validateSchedule(schedule, market, index) {
  const issues = [];

  if (!schedule || typeof schedule !== "object") {
    issues.push(`${market}.trade_schedules[${index}] 不是对象`);
    return issues;
  }

  if (!isTimeString(schedule.begin_time)) {
    issues.push(`${market}.trade_schedules[${index}].begin_time 非法`);
  }
  if (!isTimeString(schedule.end_time)) {
    issues.push(`${market}.trade_schedules[${index}].end_time 非法`);
  }
  if (typeof schedule.type !== "string" || !schedule.type.trim()) {
    issues.push(`${market}.trade_schedules[${index}].type 缺失或非法`);
  }

  return issues;
}

function validateMarketRow(row, index) {
  const issues = [];

  if (!row || typeof row !== "object") {
    issues.push(`data[${index}] 不是对象`);
    return issues;
  }

  if (typeof row.market !== "string" || !row.market.trim()) {
    issues.push(`data[${index}].market 缺失或非法`);
  }

  if (row.remark !== undefined && row.remark !== null && typeof row.remark !== "string") {
    issues.push(`data[${index}].remark 应为 string`);
  }

  if (!Array.isArray(row.trade_schedules)) {
    issues.push(`data[${index}].trade_schedules 必须为数组`);
    return issues;
  }

  row.trade_schedules.forEach((schedule, scheduleIndex) => {
    issues.push(...validateSchedule(schedule, row.market || `data[${index}]`, scheduleIndex));
  });

  return issues;
}

function summarizeMarket(row) {
  const market = String(row.market || "").trim().toUpperCase();
  const schedules = Array.isArray(row.trade_schedules) ? row.trade_schedules : [];
  const sortedSchedules = schedules
    .map((schedule) => ({
      beginTime: schedule.begin_time,
      endTime: schedule.end_time,
      type: schedule.type,
    }))
    .sort((left, right) => compareTimeAsc(left.beginTime, right.beginTime));

  const normalTradeSchedules = sortedSchedules.filter(
    (schedule) => String(schedule.type || "").trim() === "NormalTrade",
  );

  return {
    market,
    remark: row.remark || "",
    regularOpenTime: normalTradeSchedules[0]?.beginTime || null,
    earliestBeginTime: sortedSchedules[0]?.beginTime || null,
    schedules: sortedSchedules,
  };
}

async function main() {
  const dotenv = parseDotEnv(resolve(process.cwd(), ".env"));
  const baseUrl = String(
    process.env.BASE_URL ||
      process.env.UPSTREAM_BASE_URL ||
      process.env.INFOWAY_BASE_URL ||
      dotenv.INFOWAY_BASE_URL ||
      "https://data.infoway.io",
  ).replace(/\/$/, "");
  const apiKey = String(
    process.env.API_KEY ||
      process.env.TOKEN ||
      process.env.UPSTREAM_API_KEY ||
      process.env.INFOWAY_API_KEY ||
      dotenv.INFOWAY_API_KEY ||
      "",
  ).trim();
  const markets = parseMarkets(process.env.MARKETS);
  const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS || 15000);
  const strictMarketMatch = isBooleanTrue(process.env.STRICT_MARKET_MATCH, true);
  const outputFile = String(process.env.OUTPUT_FILE || "").trim();

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY / TOKEN / UPSTREAM_API_KEY / INFOWAY_API_KEY 传入）");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail("[FAIL] HTTP_TIMEOUT_MS 必须是正数");
  }

  const url = `${baseUrl}/common/basic/markets`;

  console.log("== 请求配置 ==");
  console.log(
    JSON.stringify(
      {
        url,
        apiKeyMasked: maskKey(apiKey),
        markets,
        timeoutMs,
        strictMarketMatch,
        outputFile: outputFile || null,
      },
      null,
      2,
    ),
  );

  let response;
  try {
    response = await requestJson(url, {
      timeoutMs,
      headers: {
        apiKey,
      },
    });
  } catch (error) {
    fail("[FAIL] 请求异常", error instanceof Error ? error.message : String(error));
  }

  const payload = response.data && typeof response.data === "object" ? response.data : {};
  const ret = Number(payload.ret);
  const rows = Array.isArray(payload.data) ? payload.data : [];

  if (!response.ok) {
    fail("[FAIL] HTTP 状态异常", {
      status: response.status,
      body: payload,
    });
  }
  if (ret !== 200) {
    fail("[FAIL] 业务返回异常", {
      ret: payload.ret,
      msg: payload.msg,
      traceId: payload.traceId,
    });
  }

  const rowIssues = rows.flatMap((row, index) => validateMarketRow(row, index));
  if (rowIssues.length > 0) {
    fail("[FAIL] 响应结构校验失败", {
      issues: rowIssues,
      traceId: payload.traceId || null,
    });
  }

  const summaries = rows.map(summarizeMarket);
  const filteredSummaries =
    markets.length > 0
      ? summaries.filter((row) => markets.includes(row.market))
      : summaries;

  const receivedMarketSet = new Set(summaries.map((row) => row.market));
  const missingMarkets = markets.filter((market) => !receivedMarketSet.has(market));
  if (strictMarketMatch && missingMarkets.length > 0) {
    fail("[FAIL] 返回结果未覆盖全部请求市场", {
      requestedMarkets: markets,
      missingMarkets,
      receivedMarkets: summaries.map((row) => row.market),
      traceId: payload.traceId || null,
    });
  }

  if (filteredSummaries.length === 0) {
    fail("[FAIL] 未找到任何市场交易时段", {
      requestedMarkets: markets,
      traceId: payload.traceId || null,
    });
  }

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[INFO] 原始响应已写入: ${outputFile}`);
  }

  console.log("== 市场交易时间摘要 ==");
  console.log(
    JSON.stringify(
      {
        ret: payload.ret,
        msg: payload.msg,
        traceId: payload.traceId || null,
        count: filteredSummaries.length,
        missingMarkets,
        markets: filteredSummaries,
      },
      null,
      2,
    ),
  );

  console.log("[PASS] Infoway 市场交易时间获取成功");
}

main().catch((error) => {
  fail("[FAIL] 脚本执行失败", error instanceof Error ? error.message : String(error));
});
