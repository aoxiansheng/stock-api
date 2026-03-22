#!/usr/bin/env node
/* eslint-disable no-console */
const {
  createEndpointClient,
  parseBoolean,
  parseSymbols,
} = require("./project-api-client");

function assert(condition, message, extra) {
  if (condition) {
    return;
  }
  if (extra !== undefined) {
    throw new Error(`${message} | extra=${JSON.stringify(extra)}`);
  }
  throw new Error(message);
}

const CRYPTO_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}$/;
const CRYPTO_QUOTE_SUFFIXES = ["USDT", "USDC", "BUSD", "FDUSD", "BTC", "ETH"];

function normalizeCryptoSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function isValidCryptoPairSymbol(symbol) {
  return (
    CRYPTO_SYMBOL_PATTERN.test(symbol) &&
    CRYPTO_QUOTE_SUFFIXES.some(
      (suffix) => symbol.endsWith(suffix) && symbol.length > suffix.length,
    )
  );
}

function assertStrictCryptoSymbols(symbols) {
  const invalidSymbols = symbols
    .map((symbol) => normalizeCryptoSymbol(symbol))
    .filter((symbol) => !isValidCryptoPairSymbol(symbol));
  assert(invalidSymbols.length === 0, "crypto symbols 必须使用裸交易对格式", {
    invalidSymbols,
    example: "BTCUSDT",
  });
}

function validateRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`data[${index}] 不是对象`);
      return;
    }

    const requiredStringFields = [
      "symbol",
      "lastPrice",
      "openPrice",
      "highPrice",
      "lowPrice",
      "volume",
      "turnover",
      "timestamp",
    ];

    requiredStringFields.forEach((field) => {
      const value = row[field];
      if (typeof value !== "string" || !value.trim()) {
        issues.push(`data[${index}].${field} 缺失`);
      }
    });

    if (
      row.market !== undefined &&
      row.market !== null &&
      (typeof row.market !== "string" || !row.market.trim())
    ) {
      issues.push(`data[${index}].market 类型非法`);
    }
  });

  return issues;
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;
  const symbols = parseSymbols(args.symbols, "BTCUSDT");
  const provider = String(args.provider || "").trim().toLowerCase();
  const market = String(args.market || "CRYPTO").trim().toUpperCase();
  const receiverType = String(args["receiver-type"] || "get-crypto-history").trim();
  const klineNum = Math.max(1, Number(args["kline-num"] || args.klineNum || 5));
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));
  const allowEmpty = parseBoolean(args["allow-empty"], false);
  const allowUpstreamErrors = parseBoolean(args["allow-upstream-errors"], false);
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], true);
  const timestampArg = String(args.timestamp || "").trim();
  const useSmartCache = parseBoolean(args["use-smart-cache"], false);

  assert(symbols.length === 1, "get-crypto-history 仅支持单标的", { symbols });
  assertStrictCryptoSymbols(symbols);
  assert(Number.isFinite(klineNum) && klineNum > 0, "klineNum 必须是正数", {
    klineNum,
  });

  const requestOptions = {
    market,
    klineNum,
    useSmartCache,
  };
  if (provider) {
    requestOptions.preferredProvider = provider;
  }

  const requestBody = {
    symbols,
    receiverType,
    options: requestOptions,
  };

  if (timestampArg) {
    const timestamp = Number(timestampArg);
    assert(Number.isSafeInteger(timestamp) && timestamp > 0, "timestamp 必须是正整数", {
      timestamp: timestampArg,
    });
    requestOptions.timestamp = timestamp;
  }

  const response = await client.post("/receiver/data", requestBody);
  assert(response.ok, "receiver/data 调用失败", {
    status: response.status,
    body: response.data,
  });

  assert(response.data?.success === true, "顶层 success 应为 true", response.data);
  assert(response.data?.statusCode === 200, "顶层 statusCode 应为 200", response.data);

  const business = response.data?.data;
  const rows = Array.isArray(business?.data) ? business.data : [];
  const metadata = business?.metadata || {};
  const upstreamErrors = Array.isArray(metadata?.errors) ? metadata.errors : [];

  const hasUpstreamErrors = upstreamErrors.length > 0;
  const emptyAllowed = allowEmpty || (allowUpstreamErrors && hasUpstreamErrors);

  if (!emptyAllowed) {
    assert(rows.length > 0, "data.data 不能为空", {
      metadata,
      response: response.data,
    });
  }

  if (rows.length > 0) {
    const issues = validateRows(rows);
    assert(issues.length === 0, "业务字段校验失败", issues);
  }

  if (strictSymbolMatch && rows.length > 0) {
    const requestedSymbols = symbols.map(normalizeCryptoSymbol);
    const returnedSymbols = new Set(
      rows
        .map((row) => normalizeCryptoSymbol(row?.symbol))
        .filter(Boolean),
    );

    const missingSymbols = requestedSymbols.filter(
      (symbol) => !returnedSymbols.has(symbol),
    );
    assert(missingSymbols.length === 0, "返回缺少请求标的", missingSymbols);
  }

  console.log("[PASS] POST /api/v1/receiver/data get-crypto-history");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType,
        testPath: useSmartCache ? "smart-cache + scheduler" : "scheduler-only (bypass cache)",
        requestedSymbols: symbols,
        requestedProvider: provider || null,
        returnedCount: rows.length,
        provider: metadata.provider || null,
        upstreamErrors,
        sample: rows.slice(0, sampleLimit),
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
