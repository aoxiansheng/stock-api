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

const STRICT_CRYPTO_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}\.CRYPTO$/;

function normalizeCryptoSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function assertStrictCryptoSymbols(symbols) {
  const invalidSymbols = symbols
    .map((symbol) => normalizeCryptoSymbol(symbol))
    .filter((symbol) => !STRICT_CRYPTO_SYMBOL_PATTERN.test(symbol));
  assert(invalidSymbols.length === 0, "crypto symbols 必须使用 *.CRYPTO 格式", {
    invalidSymbols,
    example: "BTCUSDT.CRYPTO",
  });
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

    if (
      row.exchange !== undefined &&
      row.exchange !== null &&
      (typeof row.exchange !== "string" || !row.exchange.trim())
    ) {
      issues.push(`data[${index}].exchange 类型非法`);
    }

    if (
      row.currency !== undefined &&
      row.currency !== null &&
      (typeof row.currency !== "string" || !row.currency.trim())
    ) {
      issues.push(`data[${index}].currency 类型非法`);
    }
  });

  return issues;
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;

  const symbols = parseSymbols(args.symbols, "BTCUSDT.CRYPTO");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "CRYPTO").trim().toUpperCase();
  const receiverType = String(args["receiver-type"] || "get-crypto-basic-info").trim();

  const allowEmpty = parseBoolean(args["allow-empty"], true);
  const allowUpstreamErrors = parseBoolean(args["allow-upstream-errors"], false);
  const requireProviderMatch = parseBoolean(args["require-provider-match"], true);
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], false);
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));

  assert(symbols.length > 0, "symbols 不能为空");
  assertStrictCryptoSymbols(symbols);

  const requestBody = {
    symbols,
    receiverType,
    options: {
      preferredProvider: provider,
      market,
      useSmartCache: false,
    },
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

  console.log("[PASS] POST /api/v1/receiver/data get-crypto-basic-info");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/receiver/data",
        receiverType,
        market,
        requestedSymbols: symbols,
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
