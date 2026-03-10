#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway 上游产品基础信息测试脚本
 *
 * 接口：
 * - GET /common/basic/symbols/info
 *
 * 常用环境变量：
 * - API_KEY / TOKEN / UPSTREAM_API_KEY / INFOWAY_API_KEY: 上游 API Key（必填）
 * - BASE_URL / UPSTREAM_BASE_URL / INFOWAY_BASE_URL: 上游地址（默认 https://data.infoway.io）
 * - TYPE: 标的类型（默认 STOCK_US）
 * - SYMBOLS: 逗号分隔标的列表（默认 AAPL.US,MSFT.US，最大 500）
 * - HTTP_TIMEOUT_MS: 请求超时（默认 15000）
 * - SAMPLE_LIMIT: 控制台展示样本条数（默认 20）
 * - STRICT_SYMBOL_MATCH: 是否严格要求返回覆盖所有请求 symbols（默认 true）
 * - OUTPUT_FILE: 可选，原始响应落盘路径
 *
 * 运行示例：
 * API_KEY="xxxx" TYPE="STOCK_CN" SYMBOLS="000001.SZ,000002.SZ" \
 * node scripts/tools/upstream-sdk/test-infoway-symbols-info.js
 */

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const SUPPORTED_TYPES = new Set([
  "STOCK_US",
  "STOCK_CN",
  "STOCK_HK",
  "FUTURES",
  "FOREX",
  "ENERGY",
  "METAL",
  "CRYPTO",
  "STOCK_IN",
  "STOCK_JP",
]);

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, "utf8");
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  return result;
}

function maskKey(key) {
  if (!key || key.length <= 10) return "***";
  return `${key.slice(0, 6)}***${key.slice(-4)}`;
}

function parseSymbols(input) {
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

function validateRowShape(row, index) {
  const issues = [];

  if (!row || typeof row !== "object") {
    issues.push(`data[${index}] 不是对象`);
    return issues;
  }

  if (typeof row.symbol !== "string" || !row.symbol.trim()) {
    issues.push(`data[${index}].symbol 缺失或类型错误`);
  }

  const optionalStringFields = [
    "market",
    "name_cn",
    "name_en",
    "name_hk",
    "exchange",
    "currency",
    "eps",
    "eps_ttm",
    "bps",
    "dividend_yield",
    "board",
  ];

  for (const field of optionalStringFields) {
    if (row[field] !== undefined && row[field] !== null && typeof row[field] !== "string") {
      issues.push(`data[${index}].${field} 应为 string`);
    }
  }

  const optionalNumberFields = [
    "lot_size",
    "total_shares",
    "circulating_shares",
    "hk_shares",
  ];

  for (const field of optionalNumberFields) {
    if (row[field] !== undefined && row[field] !== null && !Number.isFinite(Number(row[field]))) {
      issues.push(`data[${index}].${field} 应为 number`);
    }
  }

  if (
    row.stock_derivatives !== undefined &&
    row.stock_derivatives !== null &&
    typeof row.stock_derivatives !== "string" &&
    !Array.isArray(row.stock_derivatives)
  ) {
    issues.push(`data[${index}].stock_derivatives 应为 string 或 array`);
  }

  return issues;
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

  const type = String(process.env.TYPE || "STOCK_US")
    .trim()
    .toUpperCase();
  const symbols = parseSymbols(process.env.SYMBOLS || "AAPL.US,MSFT.US");
  const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS || 15000);
  const sampleLimit = Math.max(1, Number(process.env.SAMPLE_LIMIT || 20));
  const strictSymbolMatch = isBooleanTrue(process.env.STRICT_SYMBOL_MATCH, true);
  const outputFile = String(process.env.OUTPUT_FILE || "").trim();

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY / TOKEN / UPSTREAM_API_KEY / INFOWAY_API_KEY 传入）");
  }
  if (!SUPPORTED_TYPES.has(type)) {
    fail("[FAIL] TYPE 不合法", {
      type,
      allowedTypes: Array.from(SUPPORTED_TYPES),
    });
  }
  if (symbols.length === 0) {
    fail("[FAIL] SYMBOLS 不能为空（示例：AAPL.US,MSFT.US）");
  }
  if (symbols.length > 500) {
    fail("[FAIL] SYMBOLS 数量超过上游限制 500", { count: symbols.length });
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail("[FAIL] HTTP_TIMEOUT_MS 必须是正数");
  }

  const url = new URL(`${baseUrl}/common/basic/symbols/info`);
  url.searchParams.set("type", type);
  url.searchParams.set("symbols", symbols.join(","));

  console.log("== 请求配置 ==");
  console.log(
    JSON.stringify(
      {
        url: url.toString(),
        apiKeyMasked: maskKey(apiKey),
        type,
        symbols,
        timeoutMs,
        sampleLimit,
        strictSymbolMatch,
        outputFile: outputFile || null,
      },
      null,
      2,
    ),
  );

  let response;
  try {
    response = await requestJson(url.toString(), {
      timeoutMs,
      headers: { apiKey },
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

  const shapeIssues = [];
  rows.forEach((row, index) => {
    shapeIssues.push(...validateRowShape(row, index));
  });

  const receivedSymbolSet = new Set(
    rows
      .map((row) => String(row && row.symbol ? row.symbol : "").toUpperCase())
      .filter(Boolean),
  );
  const missingSymbols = symbols.filter((symbol) => !receivedSymbolSet.has(symbol));

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[INFO] 原始响应已写入: ${outputFile}`);
  }

  console.log("== 响应摘要 ==");
  console.log(
    JSON.stringify(
      {
        ret: payload.ret,
        msg: payload.msg,
        traceId: payload.traceId || null,
        count: rows.length,
        missingSymbols,
        shapeIssueCount: shapeIssues.length,
        shapeIssueSample: shapeIssues.slice(0, 20),
        sample: rows.slice(0, sampleLimit),
      },
      null,
      2,
    ),
  );

  if (shapeIssues.length > 0) {
    console.log("[WARN] 检测到字段结构告警，请核对上游字段类型与文档一致性");
  }

  if (missingSymbols.length > 0) {
    const message = "[WARN] 上游未返回部分请求标的";
    if (strictSymbolMatch) {
      fail(message, missingSymbols);
    }
    console.log(message, missingSymbols);
  }

  console.log("[PASS] 上游产品基础信息接口可用");
}

void main();
