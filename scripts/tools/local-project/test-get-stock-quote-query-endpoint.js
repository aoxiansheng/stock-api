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

function validateRows(rows) {
  const issues = [];

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      issues.push(`items[${index}] 不是对象`);
      return;
    }

    if (typeof row.symbol !== "string" || !row.symbol.trim()) {
      issues.push(`items[${index}].symbol 缺失`);
    }

    if (typeof row.market !== "string" || !row.market.trim()) {
      issues.push(`items[${index}].market 缺失`);
    }

    const lastPrice = Number(row.lastPrice);
    if (!Number.isFinite(lastPrice)) {
      issues.push(`items[${index}].lastPrice 不是数字`);
    }

    if (row.volume !== undefined) {
      const volume = Number(row.volume);
      if (!Number.isFinite(volume)) {
        issues.push(`items[${index}].volume 不是数字`);
      }
    }

    if (row.change !== undefined) {
      const change = Number(row.change);
      if (!Number.isFinite(change)) {
        issues.push(`items[${index}].change 不是数字`);
      }
    }

    if (row.changePercent !== undefined) {
      const changePercent = Number(row.changePercent);
      if (!Number.isFinite(changePercent)) {
        issues.push(`items[${index}].changePercent 不是数字`);
      }
    }
  });

  return issues;
}

async function main() {
  const client = createEndpointClient();
  const { args } = client;
  const symbols = parseSymbols(args.symbols, "00700.HK");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "").trim().toUpperCase();
  const strictSymbolMatch = parseBoolean(args["strict-symbol-match"], true);
  const limit = Math.max(1, Number(args.limit || 50));
  const sampleLimit = Math.max(1, Number(args["sample-limit"] || 5));

  assert(symbols.length > 0, "symbols 不能为空");

  const requestBody = {
    queryType: "by_symbols",
    symbols,
    provider,
    queryTypeFilter: "get-stock-quote",
    limit,
    options: {
      useCache: true,
      includeMetadata: true,
    },
  };

  if (market) {
    requestBody.market = market;
  }

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

  assert(rows.length > 0, "data.data.items 不能为空", response.data);
  assert(metadata.queryType === "by_symbols", "metadata.queryType 应为 by_symbols", metadata);
  assert(
    metadata.returnedResults === undefined || Number(metadata.returnedResults) >= rows.length,
    "metadata.returnedResults 不合法",
    metadata,
  );

  const issues = validateRows(rows);
  assert(issues.length === 0, "业务字段校验失败", issues);

  const returnedSymbols = new Set(
    rows.map((row) => String(row.symbol || "").trim().toUpperCase()).filter(Boolean),
  );
  const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol));
  if (strictSymbolMatch) {
    assert(missingSymbols.length === 0, "返回缺少请求标的", missingSymbols);
  }

  console.log("[PASS] POST /api/v1/query/execute get-stock-quote");
  console.log(
    JSON.stringify(
      {
        endpoint: "POST /api/v1/query/execute",
        queryType: "by_symbols",
        queryTypeFilter: "get-stock-quote",
        requestedSymbols: symbols,
        returnedCount: rows.length,
        provider,
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
