#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Infoway 上游混合地区股票实时成交测试脚本
 *
 * 接口：
 * - GET /stock/batch_trade/{codes}
 *
 * 目的：
 * - 验证股票成交接口是否支持在一次请求中混合拉取不同地区股票（如 US + HK）
 *
 * 常用环境变量：
 * - API_KEY / TOKEN / INFOWAY_API_KEY: 上游 API Key（必填）
 * - BASE_URL / INFOWAY_BASE_URL: 上游地址（默认 https://data.infoway.io）
 * - SYMBOLS: 逗号分隔的股票代码，默认 AAPL.US,00700.HK
 * - HTTP_TIMEOUT_MS: 请求超时（默认 15000）
 * - SAMPLE_LIMIT: 控制台最多展示多少条 data 样本（默认 20）
 * - OUTPUT_FILE: 可选，原始响应落盘路径
 *
 * 运行示例：
 * API_KEY="xxxx-infoway" SYMBOLS="AAPL.US,00700.HK" \
 * node "scripts/tools/upstream-sdk/test-infoway-batch-trade-mixed-markets.js"
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

    const index = line.indexOf("=");
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
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

function toSymbolList(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

async function requestJson(url, { method = "GET", headers = {}, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
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
  const symbols = toSymbolList(process.env.SYMBOLS || "AAPL.US,00700.HK");
  const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS || 15000);
  const sampleLimit = Math.max(1, Number(process.env.SAMPLE_LIMIT || 20));
  const outputFile = String(process.env.OUTPUT_FILE || "").trim();

  if (!apiKey) {
    fail("[FAIL] 缺少 API_KEY（可通过 API_KEY / TOKEN / INFOWAY_API_KEY 传入）");
  }
  if (symbols.length === 0) {
    fail("[FAIL] SYMBOLS 不能为空");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    fail("[FAIL] HTTP_TIMEOUT_MS 必须是正数");
  }

  const url = `${baseUrl}/stock/batch_trade/${symbols.join(",")}`;

  console.log("== 请求配置 ==");
  console.log(
    JSON.stringify(
      {
        url,
        apiKeyMasked: maskKey(apiKey),
        symbols,
        timeoutMs,
        sampleLimit,
        outputFile: outputFile || null,
      },
      null,
      2,
    ),
  );

  let response;
  try {
    response = await requestJson(url, {
      method: "GET",
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

  const requestedSymbolsUpper = symbols.map((item) => item.toUpperCase());
  const receivedSymbolSet = new Set(
    rows
      .map((row) => String(row && row.s ? row.s : "").toUpperCase())
      .filter(Boolean),
  );
  const missingSymbols = requestedSymbolsUpper.filter((symbol) => !receivedSymbolSet.has(symbol));

  const sample = rows.slice(0, sampleLimit).map((row) => ({
    symbol: row.s,
    timestamp: row.t,
    price: row.p,
    volume: row.v,
    turnover: row.vw,
    tradeDirection: row.td,
  }));

  console.log("== 响应摘要 ==");
  console.log(
    JSON.stringify(
      {
        ret: payload.ret,
        msg: payload.msg,
        traceId: payload.traceId || null,
        count: rows.length,
        missingSymbols,
        sample,
      },
      null,
      2,
    ),
  );

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[INFO] 原始响应已写入: ${outputFile}`);
  }

  if (missingSymbols.length > 0) {
    console.log("[WARN] 上游未返回部分请求标的", missingSymbols);
  }

  if (missingSymbols.length === 0) {
    console.log("[PASS] 上游股票实时成交接口支持当前混合地区股票一次性拉取");
    return;
  }

  console.log("[INFO] 上游股票实时成交接口未完整返回所有混合地区股票");
}

void main();
