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
const SUPPORTED_ENTRY_MODES = new Set(["receiver", "query", "both"]);

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

function normalizeEntryMode(value) {
  const entry = String(value || "both").trim().toLowerCase();
  assert(SUPPORTED_ENTRY_MODES.has(entry), "entry 仅支持 receiver/query/both", {
    entry,
    supportedEntries: Array.from(SUPPORTED_ENTRY_MODES),
  });
  return entry;
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

function assertRowsValid(rows) {
  const issues = validateRows(rows);
  assert(issues.length === 0, "业务字段校验失败", issues);
}

function assertReturnedSymbolsMatch(rows, symbols) {
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

function buildReceiverRequestBody({ symbols, provider, market, receiverType }) {
  const requestOptions = {
    market,
    useSmartCache: false,
  };
  if (provider) {
    requestOptions.preferredProvider = provider;
  }

  return {
    symbols,
    receiverType,
    options: requestOptions,
  };
}

function buildQueryRequestBody({
  symbols,
  provider,
  market,
  receiverType,
  queryLimit,
  queryUseCache,
}) {
  const requestBody = {
    queryType: "by_symbols",
    symbols,
    queryTypeFilter: receiverType,
    limit: queryLimit,
    options: {
      useCache: queryUseCache,
      includeMetadata: true,
    },
  };

  if (provider) {
    requestBody.provider = provider;
  }
  if (market) {
    requestBody.market = market;
  }

  return requestBody;
}

async function executeReceiverEntry(client, context) {
  const {
    symbols,
    provider,
    market,
    receiverType,
    allowEmpty,
    allowUpstreamErrors,
    requireProviderMatch,
    strictSymbolMatch,
    sampleLimit,
  } = context;

  const requestBody = buildReceiverRequestBody({
    symbols,
    provider,
    market,
    receiverType,
  });

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
    assert(rows.length > 0, "receiver data.data 不能为空", {
      metadata,
      response: response.data,
    });
  }

  if (rows.length > 0) {
    assertRowsValid(rows);
  }

  if (strictSymbolMatch && rows.length > 0) {
    assertReturnedSymbolsMatch(rows, symbols);
  }

  if (requireProviderMatch) {
    const actualProvider = String(metadata.provider || "").trim().toLowerCase();
    assert(actualProvider === provider, "metadata.provider 与请求不一致", {
      expected: provider,
      actual: actualProvider || null,
    });
  }

  return {
    endpoint: "POST /api/v1/receiver/data",
    entry: "receiver",
    receiverType,
    market,
    requestedSymbols: symbols,
    requestedProvider: provider || null,
    returnedCount: rows.length,
    provider: metadata.provider || null,
    upstreamErrors,
    sample: rows.slice(0, sampleLimit),
  };
}

async function executeQueryEntry(client, context) {
  const {
    symbols,
    provider,
    market,
    receiverType,
    allowEmpty,
    allowUpstreamErrors,
    strictSymbolMatch,
    sampleLimit,
    queryLimit,
    queryUseCache,
  } = context;

  const requestBody = buildQueryRequestBody({
    symbols,
    provider,
    market,
    receiverType,
    queryLimit,
    queryUseCache,
  });

  const response = await client.post("/query/execute", requestBody);
  assert(response.ok, "query/execute 调用失败", {
    status: response.status,
    body: response.data,
  });

  assert(response.data?.success === true, "顶层 success 应为 true", response.data);
  assert(response.data?.statusCode === 200, "顶层 statusCode 应为 200", response.data);

  const business = response.data?.data;
  const payload = business?.data || {};
  const rows = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  const metadata = business?.metadata || {};
  const upstreamErrors = Array.isArray(metadata?.errors) ? metadata.errors : [];

  const hasUpstreamErrors = upstreamErrors.length > 0;
  const emptyAllowed = allowEmpty || (allowUpstreamErrors && hasUpstreamErrors);

  if (!emptyAllowed) {
    assert(rows.length > 0, "query data.items 不能为空", {
      metadata,
      response: response.data,
    });
  }

  if (rows.length > 0) {
    assertRowsValid(rows);
  }

  if (strictSymbolMatch && rows.length > 0) {
    assertReturnedSymbolsMatch(rows, symbols);
  }

  assert(metadata.queryType === "by_symbols", "query metadata.queryType 应为 by_symbols", metadata);
  assert(
    metadata.returnedResults === undefined ||
      Number(metadata.returnedResults) >= rows.length,
    "query metadata.returnedResults 不合法",
    metadata,
  );

  return {
    endpoint: "POST /api/v1/query/execute",
    entry: "query",
    queryType: "by_symbols",
    queryTypeFilter: receiverType,
    market,
    requestedSymbols: symbols,
    requestedProvider: provider || null,
    returnedCount: rows.length,
    queryUseCache,
    cacheUsed: metadata.cacheUsed,
    upstreamErrors,
    sample: rows.slice(0, sampleLimit),
  };
}

function printResult(result) {
  console.log(`[PASS] ${result.endpoint} get-crypto-basic-info`);
  console.log(JSON.stringify(result, null, 2));
}

async function runEntry(label, executor, client, context) {
  try {
    const result = await executor(client, context);
    printResult(result);
    return null;
  } catch (error) {
    console.error(`[FAIL] ${label}`, error?.message || String(error));
    return {
      entry: label,
      message: error?.message || String(error),
    };
  }
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;

  const symbols = parseSymbols(args.symbols, "BTCUSDT");
  const provider = String(args.provider || "").trim().toLowerCase();
  const market = String(args.market || "CRYPTO").trim().toUpperCase();
  const receiverType = String(
    args["receiver-type"] || "get-crypto-basic-info",
  ).trim();
  const entry = normalizeEntryMode(args.entry);

  const allowEmpty = parseBoolean(args["allow-empty"], true);
  const allowUpstreamErrors = parseBoolean(args["allow-upstream-errors"], false);
  const requireProviderMatch = parseBoolean(
    args["require-provider-match"],
    Boolean(provider),
  );
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], false);
  const queryUseCache = parseBoolean(args["query-use-cache"], true);
  const queryLimit = Math.max(
    1,
    Number(args.limit || args["query-limit"] || 50),
  );
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));

  assert(symbols.length > 0, "symbols 不能为空");
  assertStrictCryptoSymbols(symbols);

  const context = {
    symbols,
    provider,
    market,
    receiverType,
    allowEmpty,
    allowUpstreamErrors,
    requireProviderMatch,
    strictSymbolMatch,
    sampleLimit,
    queryLimit,
    queryUseCache,
  };

  const failures = [];

  if (entry === "receiver" || entry === "both") {
    const failure = await runEntry(
      "receiver",
      executeReceiverEntry,
      client,
      context,
    );
    if (failure) {
      failures.push(failure);
    }
  }

  if (entry === "query" || entry === "both") {
    const failure = await runEntry("query", executeQueryEntry, client, context);
    if (failure) {
      failures.push(failure);
    }
  }

  assert(failures.length === 0, "双入口测试存在失败项", failures);
}

main().catch((error) => {
  console.error("[FAIL]", error?.message || String(error));
  process.exit(1);
});
