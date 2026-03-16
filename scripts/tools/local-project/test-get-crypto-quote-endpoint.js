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

function pickPriceValue(row) {
  const candidates = [
    row?.lastPrice,
    row?.price,
    row?.currentPrice,
    row?.p,
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function validateRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`data[${index}] 不是对象`);
      return;
    }

    if (typeof row.symbol !== "string" || !row.symbol.trim()) {
      issues.push(`data[${index}].symbol 缺失`);
    }

    if (
      row.market !== undefined &&
      row.market !== null &&
      (typeof row.market !== "string" || !row.market.trim())
    ) {
      issues.push(`data[${index}].market 类型非法`);
    }

    const price = pickPriceValue(row);
    if (!Number.isFinite(price)) {
      issues.push(`data[${index}] 缺少可解析价格字段(lastPrice/price/currentPrice/p)`);
    }

    if (
      row.timestamp !== undefined &&
      row.timestamp !== null &&
      typeof row.timestamp !== "string" &&
      typeof row.timestamp !== "number"
    ) {
      issues.push(`data[${index}].timestamp 类型非法`);
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
  const receiverType = String(args["receiver-type"] || "get-crypto-quote").trim();

  const realtime = parseBoolean(args.realtime, true);
  const allowEmpty = parseBoolean(args["allow-empty"], false);
  const allowUpstreamErrors = parseBoolean(args["allow-upstream-errors"], false);
  const requireProviderMatch = parseBoolean(
    args["require-provider-match"],
    Boolean(provider),
  );
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], true);
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));

  assert(symbols.length > 0, "symbols 不能为空");
  assertStrictCryptoSymbols(symbols);

  const requestOptions = {
    realtime,
    useSmartCache: false,
    market,
  };
  if (provider) {
    requestOptions.preferredProvider = provider;
  }

  const requestBody = {
    symbols,
    receiverType,
    options: requestOptions,
  };

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
    const normalize = (value) => String(value || "").trim().toUpperCase();

    const requestedSymbols = symbols.map(normalize);
    const returnedSymbols = new Set(
      rows
        .map((row) => normalize(row?.symbol))
        .filter(Boolean),
    );

    const missingSymbols = requestedSymbols.filter(
      (symbol) => !returnedSymbols.has(symbol),
    );
    assert(missingSymbols.length === 0, "返回缺少请求标的", missingSymbols);
  }

  if (requireProviderMatch) {
    const actualProvider = String(metadata.provider || "").trim().toLowerCase();
    assert(actualProvider === provider, "metadata.provider 与请求不一致", {
      expected: provider,
      actual: actualProvider || null,
    });
  }

  console.log("[PASS] POST /api/v1/receiver/data get-crypto-quote");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType,
        market,
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
